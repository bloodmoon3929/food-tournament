'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import LocationSetup from '@/components/setup/LocationSetup';
import Tournament from '@/components/tournament/Tournament';

export default function Home() {
  const [entrants, setEntrants] = useState<Restaurant[] | null>(null);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center px-4 py-4 sm:px-6 sm:py-5">
        <button
          type="button"
          onClick={() => setEntrants(null)}
          className="inline-flex items-center gap-2 text-[15px] font-extrabold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          맛집 월드컵
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
        {entrants ? (
          <Tournament entrants={entrants} onExit={() => setEntrants(null)} />
        ) : (
          <LocationSetup onStart={setEntrants} />
        )}
      </main>
    </div>
  );
}
