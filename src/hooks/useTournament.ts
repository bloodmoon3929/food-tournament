'use client';

import { useCallback, useMemo, useState } from 'react';
import { Restaurant } from '@/lib/types';
import { roundName } from '@/lib/format';

export interface MatchRecord {
  roundSize: number;
  winner: Restaurant;
  loser: Restaurant;
}

interface State {
  /** 현재 라운드 참가자 (짝수) */
  round: Restaurant[];
  /** 현재 매치의 첫 번째 참가자 인덱스 */
  index: number;
  /** 이번 라운드 승자 */
  winners: Restaurant[];
  champion: Restaurant | null;
  history: MatchRecord[];
}

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const initialState = (entrants: Restaurant[]): State => ({
  round: shuffle(entrants),
  index: 0,
  winners: [],
  champion: null,
  history: [],
});

/** 토너먼트 진행 상태. 참가자는 섞어서 대진을 만든다. */
export function useTournament(entrants: Restaurant[]) {
  const [state, setState] = useState<State>(() => initialState(entrants));

  const pick = useCallback((chosen: Restaurant) => {
    setState((s) => {
      if (s.champion) return s;
      const a = s.round[s.index];
      const b = s.round[s.index + 1];
      if (!a || !b || (chosen.id !== a.id && chosen.id !== b.id)) return s;

      const loser = chosen.id === a.id ? b : a;
      const history = [...s.history, { roundSize: s.round.length, winner: chosen, loser }];
      const winners = [...s.winners, chosen];
      const nextIndex = s.index + 2;

      if (nextIndex < s.round.length) return { ...s, index: nextIndex, winners, history };
      if (winners.length === 1) return { ...s, winners: [], champion: chosen, history };
      return { round: winners, index: 0, winners: [], champion: null, history };
    });
  }, []);

  const restart = useCallback(() => setState(initialState(entrants)), [entrants]);

  return useMemo(() => {
    const matchCount = state.round.length / 2;
    const totalMatches = entrants.length - 1;
    return {
      pair: state.champion ? null : ([state.round[state.index], state.round[state.index + 1]] as [Restaurant, Restaurant]),
      roundSize: state.round.length,
      roundLabel: roundName(state.round.length),
      matchNumber: state.index / 2 + 1,
      matchCount,
      /** 전체 진행률 0~1 */
      progress: totalMatches > 0 ? state.history.length / totalMatches : 0,
      champion: state.champion,
      history: state.history,
      pick,
      restart,
    };
  }, [state, entrants.length, pick, restart]);
}
