'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { LocationData, Restaurant } from '@/lib/types';
import { geocodeAddress, getCurrentLocation, loadGoogleMapsAPI } from '@/lib/google-maps';
import { isNaverSearchEnabled, searchRestaurants, SearchStats } from '@/lib/restaurant-search';
import Button from '@/components/ui/Button';
import LocationField, { LocationStatus } from './LocationField';
import RadiusSlider from './RadiusSlider';
import BracketPicker, { BRACKET_SIZES } from './BracketPicker';
import SearchSummary from './SearchSummary';

interface Props {
  onStart: (entrants: Restaurant[]) => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;

export default function LocationSetup({ onStart }: Props) {
  const [apiReady, setApiReady] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [isCurrent, setIsCurrent] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [bracketSize, setBracketSize] = useState(8);

  const [results, setResults] = useState<Restaurant[] | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 반경을 빠르게 바꿀 때 늦게 끝난 이전 검색이 결과를 덮어쓰지 않도록
  const searchSeq = useRef(0);

  const locateMe = useCallback(async () => {
    setLocationStatus('locating');
    try {
      setLocation(await getCurrentLocation());
      setIsCurrent(true);
      setLocationStatus('ready');
    } catch {
      setLocationStatus('failed');
    }
  }, []);

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => setApiReady(true))
      .catch((err) => setError(errorMessage(err, 'Google Maps API를 불러오지 못했어요.')));
    locateMe();
  }, [locateMe]);

  const searchAddress = async (query: string) => {
    const found = await geocodeAddress(query);
    setLocation(found);
    setIsCurrent(false);
    setLocationStatus('ready');
  };

  // 위치/반경이 바뀌면 다시 검색 (디바운스). 결과는 시작할 때 그대로 쓴다.
  useEffect(() => {
    if (!apiReady || !location) return;
    const seq = ++searchSeq.current;
    setSearching(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const { restaurants, stats } = await searchRestaurants(location, radius);
        if (seq !== searchSeq.current) return;
        setResults(restaurants);
        setStats(stats);
        // 고른 규모가 불가능해지면 가능한 가장 큰 규모로
        setBracketSize((size) => {
          if (restaurants.length >= size) return size;
          const fits = BRACKET_SIZES.filter((s) => s <= restaurants.length);
          return fits.length ? fits[fits.length - 1] : size;
        });
      } catch (err) {
        if (seq !== searchSeq.current) return;
        setResults(null);
        setStats(null);
        setError(errorMessage(err, '맛집을 검색하지 못했어요.'));
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [apiReady, location, radius]);

  const count = results?.length ?? null;
  const canStart = !searching && count !== null && count >= bracketSize;

  return (
    <section className="mx-auto max-w-xl">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">오늘 뭐 먹지?</h1>
        <p className="mt-3 text-[15px] text-muted sm:text-base">
          내 주변 검증된 맛집끼리 1:1로 붙여서
          <br className="sm:hidden" /> 오늘의 한 곳을 골라보세요.
        </p>
      </div>

      <div className="space-y-7 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <LocationField
          location={location}
          status={locationStatus}
          isCurrent={isCurrent}
          onUseCurrent={locateMe}
          onSearchAddress={searchAddress}
        />
        <RadiusSlider value={radius} onChange={setRadius} />
        <BracketPicker value={bracketSize} available={searching ? null : count} onChange={setBracketSize} />
        {location && (
          <SearchSummary
            searching={searching}
            stats={stats}
            error={error}
            bracketSize={bracketSize}
            naverEnabled={isNaverSearchEnabled(location)}
          />
        )}
        {!location && error && <p className="text-sm text-bad">{error}</p>}

        <Button
          size="lg"
          block
          disabled={!canStart}
          onClick={() => results && onStart(results.slice(0, bracketSize))}
        >
          <Trophy className="h-5 w-5" />
          {count !== null && count < bracketSize && !searching ? '맛집이 부족해요' : `${bracketSize}강 시작하기`}
        </Button>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        위치 정보는 주변 맛집 검색에만 쓰이고 저장되지 않아요.
      </p>
    </section>
  );
}
