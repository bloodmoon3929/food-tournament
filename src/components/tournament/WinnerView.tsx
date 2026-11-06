'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, MessageSquare, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { MatchRecord } from '@/hooks/useTournament';
import { mapUrl, roundName } from '@/lib/format';
import Button, { buttonClass } from '@/components/ui/Button';
import RestaurantPhoto from './RestaurantPhoto';
import RestaurantMeta from './RestaurantMeta';
import ReviewAnalysisView from './ReviewAnalysisView';

interface Props {
  champion: Restaurant;
  bracketSize: number;
  history: MatchRecord[];
  onReplay: () => void;
  onRestart: () => void;
}

export default function WinnerView({ champion, bracketSize, history, onReplay, onRestart }: Props) {
  const [showReviews, setShowReviews] = useState(false);
  const path = history.filter((m) => m.winner.id === champion.id);

  return (
    <motion.section
      className="mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-6 text-center sm:mb-8">
        <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold">
          <Trophy className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold text-accent">{bracketSize}강 우승</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{champion.name}</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.05fr_1fr]">
        <div className="self-start overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <RestaurantPhoto restaurant={champion} className="aspect-[4/3]" />
          <div className="space-y-2 p-5">
            <RestaurantMeta restaurant={champion} />
            {champion.vicinity && <p className="text-sm text-muted">{champion.vicinity}</p>}
            {champion.menu?.categories?.length ? (
              <p className="text-sm text-muted">{champion.menu.categories.slice(0, 3).join(' · ')}</p>
            ) : null}
          </div>
          {path.length > 0 && (
            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-sm font-bold">우승까지</h2>
              <ol className="space-y-2">
                {path.map((m) => (
                  <li key={m.roundSize} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 font-semibold text-accent">{roundName(m.roundSize)}</span>
                    <span className="truncate text-muted">vs {m.loser.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-3xl border border-line bg-surface p-5 shadow-card">
            {showReviews ? (
              <ReviewAnalysisView restaurant={champion} />
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <MessageSquare className="h-8 w-8 text-muted" strokeWidth={1.5} />
                <div>
                  <p className="font-bold">가기 전에 리뷰 확인</p>
                  <p className="mt-1 text-sm text-muted">Google 리뷰와 블로그 후기를 모아 장단점을 정리해 드려요.</p>
                </div>
                <Button variant="secondary" onClick={() => setShowReviews(true)}>
                  리뷰 분석하기
                </Button>
              </div>
            )}
          </div>

          <a href={mapUrl(champion)} target="_blank" rel="noreferrer" className={buttonClass('primary', 'lg', true)}>
            <MapIcon className="h-5 w-5" /> 지도에서 길찾기
          </a>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" onClick={onReplay}>
              <Shuffle className="h-4 w-4" /> 같은 후보로 다시
            </Button>
            <Button variant="secondary" size="lg" onClick={onRestart}>
              <RotateCcw className="h-4 w-4" /> 처음으로
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
