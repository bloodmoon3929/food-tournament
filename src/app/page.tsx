'use client';

import { useState } from 'react';
import LocationSetup from '@/components/LocationSetup';
import Tournament from '@/components/Tournament';
import { Restaurant } from '@/lib/types';

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [tournamentSize, setTournamentSize] = useState(8);

  const handleRestaurantsFound = (foundRestaurants: Restaurant[], size: number) => {
    setRestaurants(foundRestaurants);
    setTournamentSize(size);
    setGameStarted(true);
  };

  const handleRestart = () => {
    setGameStarted(false);
    setRestaurants([]);
    setTournamentSize(8);
  };

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4">
            🍽️ 맛집 이상형 월드컵
          </h1>
          <p className="text-lg sm:text-xl text-white/80">
            내 주변 맛집들로 이상형 월드컵을 해보세요!
          </p>
        </header>

        {/* 메인 컨텐츠 */}
        {!gameStarted ? (
          <LocationSetup onRestaurantsFound={handleRestaurantsFound} />
        ) : (
          <Tournament 
            restaurants={restaurants} 
            tournamentSize={tournamentSize}
            onRestart={handleRestart}
          />
        )}
      </div>
    </main>
  );
}