'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Restaurant } from '@/lib/types';
import RestaurantCard, { CardState } from './RestaurantCard';

interface Props {
  pair: [Restaurant, Restaurant];
  onPick: (r: Restaurant) => void;
  onReviews: (r: Restaurant) => void;
  /** 리뷰 시트가 열려 있으면 키보드 단축키를 막는다 */
  keyboardEnabled: boolean;
}

const PICK_DELAY = 380;

export default function MatchView({ pair, onPick, onReviews, keyboardEnabled }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const matchKey = `${pair[0].id}|${pair[1].id}`;

  // 새 경기가 되면 선택 표시 초기화
  useEffect(() => {
    setPicked(null);
    return () => clearTimeout(timer.current);
  }, [matchKey]);

  const choose = (r: Restaurant) => {
    if (picked) return;
    setPicked(r.id);
    timer.current = setTimeout(() => onPick(r), PICK_DELAY);
  };

  useEffect(() => {
    if (!keyboardEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') choose(pair[0]);
      if (e.key === 'ArrowRight') choose(pair[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stateOf = (r: Restaurant): CardState => (!picked ? 'idle' : picked === r.id ? 'picked' : 'dropped');

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={matchKey}
        className="relative grid gap-4 sm:grid-cols-2 sm:gap-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
      >
        {pair.map((r, i) => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            state={stateOf(r)}
            hotkey={i === 0 ? '←' : '→'}
            onSelect={() => choose(r)}
            onReviews={() => onReviews(r)}
          />
        ))}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2
                     place-items-center rounded-full border-4 border-bg bg-ink text-lg font-black italic text-bg shadow-lift"
          aria-hidden
        >
          VS
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
