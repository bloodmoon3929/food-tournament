'use client';

import { FormEvent, useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { LocationData } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

export type LocationStatus = 'locating' | 'ready' | 'failed';

interface Props {
  location: LocationData | null;
  status: LocationStatus;
  isCurrent: boolean;
  onUseCurrent: () => void;
  onSearchAddress: (query: string) => Promise<void>;
}

export default function LocationField({ location, status, isCurrent, onUseCurrent, onSearchAddress }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      await onSearchAddress(query.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : '위치를 찾지 못했어요.');
    } finally {
      setSearching(false);
    }
  };

  const label =
    status === 'locating'
      ? '현재 위치를 확인하는 중…'
      : location
      ? isCurrent
        ? '현재 위치'
        : location.address || '입력한 위치'
      : '위치를 가져오지 못했어요. 아래에 주소를 입력해 주세요.';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">어디서 찾을까요?</h2>
        {!isCurrent && (
          <button
            type="button"
            onClick={onUseCurrent}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
          >
            <LocateFixed className="w-4 h-4" /> 현재 위치로
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
          {status === 'locating' ? <Spinner /> : <MapPin className="w-4 h-4" />}
        </span>
        <p className={`text-[15px] leading-snug ${location ? 'font-semibold' : 'text-muted'}`}>{label}</p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="address">다른 위치 입력</label>
        <input
          id="address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="다른 위치 입력 (예: 강남역, 전주 한옥마을)"
          className="flex-1 min-w-0 h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] placeholder:text-muted/70
                     focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-ink text-bg disabled:opacity-40"
          aria-label="위치 검색"
        >
          {searching ? <Spinner /> : <Search className="w-4 h-4" />}
        </button>
      </form>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
