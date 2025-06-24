'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Restaurant, LocationData } from '@/lib/types';
import { PlacesService, getCurrentLocation, loadGoogleMapsAPI } from '@/lib/places';

interface LocationSetupProps {
  onRestaurantsFound: (restaurants: Restaurant[], tournamentSize: number) => void;
}

export default function LocationSetup({ onRestaurantsFound }: LocationSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(1000);
  const [tournamentSize, setTournamentSize] = useState(8);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [restaurantCount, setRestaurantCount] = useState<number | null>(null);
  const [checkingCount, setCheckingCount] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const tournamentOptions = [
    { value: 4, label: '4강 (4개 맛집)' },
    { value: 8, label: '8강 (8개 맛집)' },
    { value: 16, label: '16강 (16개 맛집)' },
    { value: 32, label: '32강 (32개 맛집)' },
    { value: 64, label: '64강 (64개 맛집)' }
  ];

  // API 초기화 및 위치 가져오기
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        // Google Maps API 로드
        await loadGoogleMapsAPI();
        setApiReady(true);
        
        // 현재 위치 가져오기
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        
        // 초기 음식점 수 확인
        await checkRestaurantCount(location, radius);
      } catch (err) {
        setError(err instanceof Error ? err.message : '위치를 가져올 수 없습니다.');
      }
    };

    initializeLocation();
  }, []);

  // 음식점 수 확인 함수
  const checkRestaurantCount = useCallback(async (location: LocationData, currentRadius: number) => {
    if (!apiReady) return;
    
    setCheckingCount(true);
    setError(null);
    
    try {
      const placesService = new PlacesService();
      const count = await placesService.getRestaurantCount(location, currentRadius);
      setRestaurantCount(count);
      
      // 현재 선택된 토너먼트 크기가 가능한 음식점 수보다 크면 조정
      if (count < tournamentSize) {
        const availableSizes = tournamentOptions.filter(option => option.value <= count);
        if (availableSizes.length > 0) {
          setTournamentSize(availableSizes[availableSizes.length - 1].value);
        }
      }
    } catch (err) {
      setError('음식점 수를 확인할 수 없습니다.');
      setRestaurantCount(null);
    } finally {
      setCheckingCount(false);
    }
  }, [apiReady, tournamentSize, tournamentOptions]);

  // 반경 변경시 음식점 수 재확인
  useEffect(() => {
    if (currentLocation && apiReady) {
      const timeoutId = setTimeout(() => {
        checkRestaurantCount(currentLocation, radius);
      }, 500); // 0.5초 디바운스
      
      return () => clearTimeout(timeoutId);
    }
  }, [radius, currentLocation, apiReady, checkRestaurantCount]);

  // 가능한 토너먼트 옵션 필터링
  const getAvailableTournamentOptions = () => {
    if (restaurantCount === null) return tournamentOptions;
    return tournamentOptions.filter(option => option.value <= restaurantCount);
  };

  const handleFindRestaurants = async () => {
    if (!currentLocation || !apiReady) {
      setError('위치 정보가 준비되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 주변 음식점 검색
      const placesService = new PlacesService();
      const restaurants = await placesService.findNearbyRestaurants(currentLocation, radius);
      
      if (restaurants.length === 0) {
        throw new Error('주변에 음식점을 찾을 수 없습니다. 반경을 늘려보세요.');
      }

      if (restaurants.length < tournamentSize) {
        throw new Error(`${tournamentSize}강을 진행하기에 음식점이 부족합니다. (필요: ${tournamentSize}개, 발견: ${restaurants.length}개)\n반경을 늘리거나 토너먼트 규모를 줄여보세요.`);
      }

      // 선택된 토너먼트 크기만큼 음식점 선별
      const selectedRestaurants = restaurants.slice(0, tournamentSize);
      onRestaurantsFound(selectedRestaurants, tournamentSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-effect rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-4xl sm:text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          위치 설정
        </h2>
        <p className="text-white/80 text-sm sm:text-base">
          현재 위치를 기반으로 주변 맛집을 찾아보세요
        </p>
      </div>

      <div className="space-y-6">
        {/* 토너먼트 규모 설정 */}
        <div className="space-y-3">
          <label className="block text-white font-medium text-lg">
            🏆 토너먼트 규모
          </label>
          
          {/* 음식점 수 정보 */}
          <div className="mb-3">
            {checkingCount ? (
              <div className="flex items-center justify-center space-x-2 text-white/60 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>음식점 수 확인 중...</span>
              </div>
            ) : restaurantCount !== null ? (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/50 rounded-lg px-3 py-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm font-medium">
                    반경 {radius >= 1000 ? `${(radius/1000).toFixed(1)}km` : `${radius}m`} 내 맛집: 
                    <span className="text-blue-200 font-bold ml-1">{restaurantCount}개</span>
                  </span>
                  <button
                    onClick={() => currentLocation && checkRestaurantCount(currentLocation, radius)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    disabled={checkingCount}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>음식점 수를 확인할 수 없습니다</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {getAvailableTournamentOptions().map((option) => {
              const isDisabled = restaurantCount !== null && restaurantCount < option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => !isDisabled && setTournamentSize(option.value)}
                  disabled={isDisabled}
                  className={`p-2 sm:p-3 rounded-xl border-2 transition-all duration-300 touch-manipulation ${
                    tournamentSize === option.value
                      ? 'border-pink-400 bg-pink-400/20 text-white'
                      : isDisabled
                      ? 'border-gray-500/30 bg-gray-500/10 text-gray-500 cursor-not-allowed'
                      : 'border-white/30 bg-white/10 text-white/80 hover:border-white/50 active:scale-95'
                  }`}
                >
                  <div className={`font-bold text-xs sm:text-sm ${
                    isDisabled ? 'text-gray-500' : ''
                  }`}>
                    {option.label.split(' ')[0]}
                  </div>
                  <div className={`text-xs opacity-80 ${
                    isDisabled ? 'text-gray-600' : ''
                  }`}>
                    {option.label.split(' ')[1]}
                  </div>
                  {isDisabled && (
                    <div className="text-xs text-red-400 mt-1">맛집 부족</div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* 비활성화된 옵션 안내 */}
          {restaurantCount !== null && getAvailableTournamentOptions().length < tournamentOptions.length && (
            <div className="text-center text-amber-300/80 text-xs mt-2">
              반경을 늘리면 더 큰 토너먼트를 진행할 수 있어요
            </div>
          )}
        </div>

        {/* 반경 설정 */}
        <div className="space-y-3">
          <label className="block text-white font-medium text-lg">
            📍 검색 반경: {radius >= 1000 ? `${(radius/1000).toFixed(1)}km` : `${radius}m`}
          </label>
          <input
            type="range"
            min="500"
            max="10000"
            step="500"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ec4899 0%, #8b5cf6 ${((radius - 500) / 9500) * 100}%, rgba(255,255,255,0.2) ${((radius - 500) / 9500) * 100}%, rgba(255,255,255,0.2) 100%)`
            }}
          />
          <div className="flex justify-between text-sm text-white/60">
            <span>500m</span>
            <span>2km</span>
            <span>5km</span>
            <span>10km</span>
          </div>
          <div className="text-center text-white/70 text-sm">
            더 넓은 반경일수록 더 많은 맛집을 찾을 수 있어요
          </div>
        </div>

        {/* 설정 요약 */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/50 rounded-xl p-4">
          <h3 className="text-white font-bold mb-2">설정 요약</h3>
          <div className="text-white/80 text-sm space-y-1">
            <p>🏆 토너먼트: <span className="font-bold text-pink-300">{tournamentOptions.find(opt => opt.value === tournamentSize)?.label}</span></p>
            <p>📍 검색 반경: <span className="font-bold text-purple-300">{radius >= 1000 ? `${(radius/1000).toFixed(1)}km` : `${radius}m`}</span></p>
            {restaurantCount !== null && (
              <p>🍽️ 발견된 맛집: <span className="font-bold text-blue-300">{restaurantCount}개</span></p>
            )}
            <p className="text-xs text-white/60 mt-2">
              {restaurantCount !== null && restaurantCount >= tournamentSize 
                ? '✅ 토너먼트 진행 가능!' 
                : restaurantCount !== null 
                ? `⚠️ ${tournamentSize - restaurantCount}개 맛집이 더 필요합니다. 반경을 늘리거나 토너먼트 규모를 줄여보세요.`
                : '🔍 음식점 수를 확인하고 있습니다...'}
            </p>
          </div>
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleFindRestaurants}
          disabled={loading || !apiReady || !currentLocation || (restaurantCount !== null && restaurantCount < tournamentSize)}
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 
                   text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 
                   disabled:opacity-50 disabled:cursor-not-allowed card-hover transform hover:scale-105
                   disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>음식점을 찾는 중...</span>
            </div>
          ) : !apiReady || !currentLocation ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>위치 정보 준비 중...</span>
            </div>
          ) : restaurantCount !== null && restaurantCount < tournamentSize ? (
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>맛집이 부족합니다</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Search className="w-5 h-5" />
              <span>주변 맛집 찾기 시작!</span>
            </div>
          )}
        </button>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-xl">
            <p className="text-center">{error}</p>
          </div>
        )}

        {/* 안내 문구 */}
        <div className="bg-blue-500/20 border border-blue-500/50 text-blue-100 p-4 rounded-xl">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">위치 접근 권한이 필요합니다</p>
              <p className="text-blue-200/80">
                브라우저에서 위치 접근을 허용해주세요. 
                위치 정보는 주변 맛집 검색에만 사용됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}