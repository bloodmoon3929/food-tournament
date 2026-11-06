'use client';

import { useEffect, useState } from 'react';
import { Restaurant } from '@/lib/types';
import { analyzeRestaurantReviews, ReviewAnalysis } from '@/lib/reviews';

// 같은 가게를 다시 열면 다시 요청하지 않도록 세션 동안 캐시
const cache = new Map<string, Promise<ReviewAnalysis>>();

export function useReviewAnalysis(restaurant: Restaurant | null) {
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;
    setAnalysis(null);
    setError(null);
    setLoading(true);

    let task = cache.get(restaurant.id);
    if (!task) {
      task = analyzeRestaurantReviews(restaurant);
      cache.set(restaurant.id, task);
      task.catch(() => cache.delete(restaurant.id));
    }
    task
      .then((result) => !cancelled && setAnalysis(result))
      .catch(() => !cancelled && setError('리뷰를 불러오지 못했어요.'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [restaurant]);

  return { analysis, loading, error };
}
