'use client';

import { useCallback, useState } from 'react';
import { Restaurant } from '@/lib/types';
import { useTournament } from '@/hooks/useTournament';
import RoundHeader from './RoundHeader';
import MatchView from './MatchView';
import WinnerView from './WinnerView';
import ReviewSheet from './ReviewSheet';

interface Props {
  entrants: Restaurant[];
  onExit: () => void;
}

export default function Tournament({ entrants, onExit }: Props) {
  const t = useTournament(entrants);
  const [reviewTarget, setReviewTarget] = useState<Restaurant | null>(null);
  const closeReviews = useCallback(() => setReviewTarget(null), []);

  if (t.champion) {
    return (
      <WinnerView
        champion={t.champion}
        bracketSize={entrants.length}
        history={t.history}
        onReplay={t.restart}
        onRestart={onExit}
      />
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <RoundHeader
        roundLabel={t.roundLabel}
        matchNumber={t.matchNumber}
        matchCount={t.matchCount}
        progress={t.progress}
        onQuit={onExit}
      />
      {t.pair && (
        <MatchView pair={t.pair} onPick={t.pick} onReviews={setReviewTarget} keyboardEnabled={!reviewTarget} />
      )}
      <p className="mt-6 text-center text-sm text-muted">
        더 끌리는 쪽을 고르세요<span className="hidden lg:inline"> · 키보드 ← → 로도 고를 수 있어요</span>
      </p>
      <ReviewSheet restaurant={reviewTarget} onClose={closeReviews} />
    </section>
  );
}
