import { Restaurant } from './types';

/**
 * 맛집 판정 기준
 *
 * 별점만 보면 "5.0 (리뷰 2개)" 같은 가게가 "4.4 (리뷰 1,200개)" 보다 위에 온다.
 * 그래서 IMDb Top 250 과 같은 베이지안 평균을 쓴다.
 *
 *   점수 = (v × R + m × C) / (v + m)
 *     R: 가게 별점, v: 리뷰 수
 *     C: 이번 검색 결과 전체의 평균 별점 (사전 평균)
 *     m: 사전 가중치 — 리뷰가 m 개쯤 쌓여야 가게 자신의 별점을 절반 정도 믿는다
 *
 * 리뷰가 적으면 평균(C) 쪽으로 끌려가고, 많을수록 실제 별점에 가까워진다.
 */

/** 이보다 리뷰가 적으면 후보에서 제외 */
export const MIN_REVIEWS = 10;
/** 별점이 이 값 이하면 리뷰가 많아도 제외 */
export const MIN_RATING = 3.5;
/** 베이지안 사전 가중치 */
export const PRIOR_WEIGHT = 30;
/** 검색 결과가 적을 때 쓸 기본 평균 별점 */
const DEFAULT_PRIOR_MEAN = 4.0;

export const passesQualityBar = (rating?: number, reviews?: number) =>
  !!rating && rating > MIN_RATING && (reviews ?? 0) >= MIN_REVIEWS;

export const bayesianScore = (rating: number, reviews: number, priorMean: number, priorWeight = PRIOR_WEIGHT) =>
  (reviews * rating + priorWeight * priorMean) / (reviews + priorWeight);

/** 리뷰 수 가중 평균 별점 (검색 결과 전체의 평균) */
export const priorMeanOf = (list: Restaurant[]) => {
  let sum = 0;
  let count = 0;
  for (const r of list) {
    if (!r.rating || !r.user_ratings_total) continue;
    sum += r.rating * r.user_ratings_total;
    count += r.user_ratings_total;
  }
  return count >= 100 ? sum / count : DEFAULT_PRIOR_MEAN;
};

/**
 * 점수를 매겨 정렬한다.
 * - Google(별점 있음): 베이지안 점수 내림차순
 * - 네이버(별점 없음): 뒤에 붙여서 부족한 자리만 채운다 (네이버 리뷰 많은 순으로 받아온 순서 유지)
 */
export const rankRestaurants = (list: Restaurant[]): Restaurant[] => {
  const rated = list.filter((r) => r.source !== 'naver' && r.rating && r.user_ratings_total);
  const unrated = list.filter((r) => !rated.includes(r));
  const prior = priorMeanOf(rated);

  const scored = rated
    .map((r) => ({ ...r, score: bayesianScore(r.rating, r.user_ratings_total || 0, prior) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return [...scored, ...unrated];
};
