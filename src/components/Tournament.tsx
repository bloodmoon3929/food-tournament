'use client';

import { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Star, MapPin, Clock, ChefHat } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { TournamentSkeleton } from './SkeletonLoader';
import Image from 'next/image';

interface TournamentProps {
  restaurants: Restaurant[];
  tournamentSize: number;
  onRestart: () => void;
}

export default function Tournament({ restaurants, tournamentSize, onRestart }: TournamentProps) {
  const [currentRound, setCurrentRound] = useState<Restaurant[]>([]);
  const [currentPair, setCurrentPair] = useState<[Restaurant, Restaurant] | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [pairIndex, setPairIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [winners, setWinners] = useState<Restaurant[]>([]);

  // 토너먼트 초기화
  useEffect(() => {
    if (restaurants.length === 0) return;
    
    setIsLoading(true);
    
    // 로딩 시뮬레이션 (실제로는 이미지 로드 등을 기다릴 수 있음)
    setTimeout(() => {
      const shuffled = [...restaurants].sort(() => Math.random() - 0.5);
      // 사용자가 선택한 토너먼트 사이즈 사용
      const tournamentRestaurants = shuffled.slice(0, tournamentSize);
      
      setCurrentRound(tournamentRestaurants);
      if (tournamentRestaurants.length >= 2) {
        setCurrentPair([tournamentRestaurants[0], tournamentRestaurants[1]]);
      }
      setPairIndex(0);
      setRoundNumber(1);
      setWinner(null);
      setWinners([]);
      setIsLoading(false);
    }, 1500); // 1.5초 로딩
  }, [restaurants, tournamentSize]);

  const handleChoice = (chosen: Restaurant) => {
    if (!chosen || !currentPair) return;
    
    // 승자 리스트에 추가
    const newWinners = [...winners, chosen];
    setWinners(newWinners);
    
    const nextPairIndex = pairIndex + 2;
    
    if (nextPairIndex >= currentRound.length) {
      // 현재 라운드 완료
      if (newWinners.length === 1) {
        // 토너먼트 완료!
        setWinner(chosen);
        setCurrentPair(null);
      } else {
        // 다음 라운드로
        setCurrentRound([...newWinners]);
        if (newWinners.length >= 2) {
          setCurrentPair([newWinners[0], newWinners[1]]);
        }
        setPairIndex(0);
        setRoundNumber(prev => prev + 1);
        setWinners([]); // 새 라운드이므로 승자 리스트 초기화
      }
    } else {
      // 현재 라운드의 다음 매치
      if (currentRound[nextPairIndex] && currentRound[nextPairIndex + 1]) {
        setCurrentPair([currentRound[nextPairIndex], currentRound[nextPairIndex + 1]]);
        setPairIndex(nextPairIndex);
      }
    }
  };

  const getRoundName = (round: number) => {
    const totalRounds = Math.log2(tournamentSize);
    const remainingRounds = totalRounds - round + 1;
    
    if (remainingRounds === 1) return '결승전';
    if (remainingRounds === 2) return '준결승';
    if (remainingRounds === 3) return '8강';
    if (remainingRounds === 4) return '16강';
    if (remainingRounds === 5) return '32강';
    if (remainingRounds === 6) return '64강';
    return `${Math.pow(2, remainingRounds)}강`;
  };

  const RestaurantCard = ({ restaurant, onClick }: { restaurant: Restaurant; onClick: () => void }) => {
    // restaurant가 undefined인 경우 방어
    if (!restaurant) {
      return (
        <div className="space-y-3">
          <div className="glass-effect rounded-2xl p-4 sm:p-6 animate-pulse">
            <div className="w-full h-32 sm:h-40 mb-3 sm:mb-4 rounded-xl bg-gray-300/30"></div>
            <div className="text-center space-y-3">
              <div className="h-6 bg-gray-300/30 rounded-lg mx-auto w-3/4"></div>
              <div className="h-4 bg-gray-300/30 rounded w-16 mx-auto"></div>
              <div className="h-3 bg-gray-300/30 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 relative">
        {/* 메인 카드 */}
        <div
          onClick={onClick}
          className="glass-effect rounded-2xl p-4 sm:p-6 cursor-pointer card-hover group touch-manipulation
                     active:scale-95 transition-all duration-200"
        >
          {/* 음식점 이미지 */}
          <div className="relative w-full h-32 sm:h-40 mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gray-200">
            {restaurant?.photos && restaurant.photos.length > 0 && restaurant.photos[0] ? (
              <Image
                src={restaurant.photos[0]}
                alt={restaurant.name || '음식점'}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                priority
                onError={(e) => {
                  // 이미지 로드 실패시 대체 처리
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <span className="text-4xl sm:text-6xl">🍽️</span>
              </div>
            )}
          </div>

          {/* 음식점 정보 */}
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-pink-300 transition-colors
                         line-clamp-2 leading-tight">
              {restaurant.name || '음식점'}
            </h3>
            
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-sm text-white/80 mb-2 sm:mb-3">
              {restaurant.source === 'naver' ? (
                <span className="text-xs sm:text-sm px-2 py-0.5 rounded-full bg-green-500/30 text-green-200">
                  네이버 검색
                </span>
              ) : (
                <>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                    <span className="text-xs sm:text-sm">{restaurant.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                  {restaurant.user_ratings_total && (
                    <span className="text-xs sm:text-sm">({restaurant.user_ratings_total})</span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-center space-x-1 text-xs text-white/60 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate text-xs">{restaurant.vicinity || '위치 정보 없음'}</span>
            </div>

            {/* 메뉴 정보 */}
            {restaurant.menu && (
              <div className="mt-2 space-y-1">
                {/* 요리 카테고리 */}
                {restaurant.menu.categories && restaurant.menu.categories.length > 0 && (
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <ChefHat className="w-3 h-3 text-orange-400" />
                    <div className="flex flex-wrap gap-1 justify-center">
                      {restaurant.menu.categories.slice(0, 2).map((category, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                      {restaurant.menu.categories.length > 2 && (
                        <span className="text-xs text-orange-300/60">+{restaurant.menu.categories.length - 2}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 요리 종류 */}
                {restaurant.menu.cuisine_type && restaurant.menu.cuisine_type.length > 0 && (
                  <div className="text-xs text-blue-300 text-center">
                    {restaurant.menu.cuisine_type.slice(0, 2).join(', ')}
                    {restaurant.menu.cuisine_type.length > 2 && ' 외'}
                  </div>
                )}
                
                {/* 샘플 메뉴 힌트 */}
                {restaurant.menu.sample_menu && restaurant.menu.sample_menu.length > 0 && (
                  <div className="mt-1">
                    <div className="text-xs text-green-300/80 text-center">
                      메뉴: {restaurant.menu.sample_menu.slice(0, 2).join(', ')}
                      {restaurant.menu.sample_menu.length > 2 && '...'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 가격 정보 */}
            <div className="mt-2 flex items-center justify-center space-x-2">
              {restaurant.priceLevel && (
                <span className="text-green-400 text-sm">
                  {'₩'.repeat(restaurant.priceLevel)}
                </span>
              )}
              {restaurant.menu?.price_range && restaurant.menu.price_range !== '정보없음' && (
                <span className="text-green-300/80 text-xs">
                  {restaurant.menu.price_range}
                </span>
              )}
            </div>

            {/* 영업 상태 */}
            {restaurant.opening_hours && (
              <div className="mt-1 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className={`text-xs ${
                  restaurant.opening_hours.open_now 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {restaurant.opening_hours.open_now ? '영업중' : '영업종료'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 정보가 없으므로 버튼 제거 - 기본 정보만 표시 */}
      </div>
    );
  };

  if (isLoading) {
    return <TournamentSkeleton />;
  }

  if (winner) {
    return (
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="glass-effect rounded-3xl p-6 sm:p-8 mb-8">
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🏆</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">
            우승!
          </h2>
          
          <RestaurantCard 
            restaurant={winner} 
            onClick={() => {}} 
          />
          
          <div className="mt-6 sm:mt-8">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {winner.name}
            </h3>
            <div className="text-center mb-3 sm:mb-4">
              <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm">
                {Math.log2(tournamentSize) === 2 ? '4강' : 
                 Math.log2(tournamentSize) === 3 ? '8강' :
                 Math.log2(tournamentSize) === 4 ? '16강' :
                 Math.log2(tournamentSize) === 5 ? '32강' :
                 Math.log2(tournamentSize) === 6 ? '64강' : `${tournamentSize}강`} 챔피언
              </span>
            </div>
            <p className="text-white/80 mb-6 text-sm sm:text-base">
              축하합니다! {tournamentSize}개 맛집 중에서 선택된 최고의 맛집입니다! 🎉
            </p>
            
            <button
              onClick={onRestart}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 
                       text-white font-bold py-3 px-6 sm:px-8 rounded-xl transition-all duration-300 card-hover
                       btn-mobile touch-manipulation"
            >
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">다시 하기</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPair) {
    return <TournamentSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* 라운드 정보 */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="glass-effect rounded-2xl p-3 sm:p-4 inline-block">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {getRoundName(roundNumber)}
          </h2>
          <p className="text-white/80 text-sm sm:text-base">
            {Math.floor(pairIndex / 2) + 1} / {Math.floor(currentRound.length / 2)} 매치
          </p>
        </div>
      </div>

      {/* VS 매치 - 모바일 친화적 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-start">
        {/* 첫 번째 카드 */}
        <div className="order-1">
          {currentPair && currentPair[0] ? (
            <RestaurantCard 
              restaurant={currentPair[0]} 
              onClick={() => handleChoice(currentPair[0])} 
            />
          ) : (
            <div className="space-y-3">
              <div className="glass-effect rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="w-full h-32 sm:h-40 mb-3 sm:mb-4 rounded-xl bg-gray-300/30"></div>
                <div className="text-center space-y-2">
                  <div className="h-5 bg-gray-300/30 rounded mx-auto w-3/4"></div>
                  <div className="h-3 bg-gray-300/30 rounded w-16 mx-auto"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* VS 섹션 - 모바일에서는 수직 중앙, 데스크톱에서는 수평 중앙 */}
        <div className="order-2 text-center py-4 lg:py-0 lg:self-center">
          <div className="text-4xl lg:text-6xl mb-2 lg:mb-4">⚡</div>
          <h3 className="text-2xl lg:text-3xl font-bold gradient-text">VS</h3>
          <p className="text-white/60 mt-1 lg:mt-2 text-sm lg:text-base">클릭해서 선택하세요!</p>
          
          {/* 모바일에서만 보이는 진행률 */}
          <div className="lg:hidden mt-4 mb-2">
            <div className="text-white/60 text-xs mb-1">
              진행률: {Math.floor(pairIndex / 2) + 1} / {Math.floor(currentRound.length / 2)}
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 max-w-xs mx-auto">
              <div 
                className="bg-gradient-to-r from-pink-500 to-violet-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((Math.floor(pairIndex / 2) + 1) / Math.floor(currentRound.length / 2)) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* 두 번째 카드 */}
        <div className="order-3">
          {currentPair && currentPair[1] ? (
            <RestaurantCard 
              restaurant={currentPair[1]} 
              onClick={() => handleChoice(currentPair[1])} 
            />
          ) : (
            <div className="space-y-3">
              <div className="glass-effect rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="w-full h-32 sm:h-40 mb-3 sm:mb-4 rounded-xl bg-gray-300/30"></div>
                <div className="text-center space-y-2">
                  <div className="h-5 bg-gray-300/30 rounded mx-auto w-3/4"></div>
                  <div className="h-3 bg-gray-300/30 rounded w-16 mx-auto"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 진행률 표시 - 데스크톱에서만 보이게 */}
      <div className="mt-6 lg:mt-8 hidden lg:block">
        <div className="glass-effect rounded-xl p-4">
          <div className="flex justify-between text-white/80 text-sm mb-2">
            <span>진행률</span>
            <span>{Math.floor(pairIndex / 2) + 1} / {Math.floor(currentRound.length / 2)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-violet-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((Math.floor(pairIndex / 2) + 1) / Math.floor(currentRound.length / 2)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}