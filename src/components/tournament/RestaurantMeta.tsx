import { Star } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { formatCount, formatDistance } from '@/lib/format';

/** 별점 · 리뷰 수 · 거리 한 줄 */
export default function RestaurantMeta({ restaurant }: { restaurant: Restaurant }) {
  const distance = formatDistance(restaurant.distance);

  if (restaurant.source === 'naver') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1 rounded-md bg-naver/10 px-1.5 py-0.5 text-xs font-bold text-naver">
          N 네이버
        </span>
        <span>별점 정보 없음</span>
        {distance && <span>· {distance}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1 font-bold">
        <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
        <span className="tabular">{restaurant.rating.toFixed(1)}</span>
      </span>
      {restaurant.user_ratings_total !== undefined && (
        <span className="text-muted tabular">리뷰 {formatCount(restaurant.user_ratings_total)}</span>
      )}
      {distance && <span className="text-muted">· {distance}</span>}
      {restaurant.score !== undefined && (
        <span
          className="ml-auto rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent tabular"
          title="리뷰 수를 반영한 맛집 점수 (리뷰가 적으면 평균 쪽으로 보정)"
        >
          점수 {restaurant.score.toFixed(2)}
        </span>
      )}
    </div>
  );
}
