import { AlertCircle } from 'lucide-react';
import { SearchStats } from '@/lib/restaurant-search';
import { MIN_RATING, MIN_REVIEWS } from '@/lib/ranking';
import Spinner from '@/components/ui/Spinner';

interface Props {
  searching: boolean;
  stats: SearchStats | null;
  error: string | null;
  bracketSize: number;
  naverEnabled: boolean;
}

export default function SearchSummary({ searching, stats, error, bracketSize, naverEnabled }: Props) {
  if (error) {
    return (
      <div className="flex gap-3 rounded-2xl border border-bad/30 bg-bad/5 p-4 text-sm text-bad">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="whitespace-pre-line">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line p-4" aria-live="polite">
      {searching || !stats ? (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner />
          <span>주변 맛집을 찾는 중… 넓은 반경은 구역을 나눠 찾아서 몇 초 걸려요.</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">기준을 통과한 맛집</p>
            <p className="text-3xl font-extrabold tabular">
              {stats.total}
              <span className="text-base font-semibold text-muted ml-0.5">곳</span>
            </p>
          </div>
          <div className="text-right text-xs text-muted leading-relaxed">
            <p>
              Google <b className="text-ink tabular">{stats.google}</b>
              {naverEnabled && (
                <>
                  {' · '}네이버 <b className="text-ink tabular">{stats.naver}</b>
                </>
              )}
            </p>
            {stats.total >= bracketSize ? (
              <p>점수 상위 {bracketSize}곳으로 대진</p>
            ) : (
              <p className="text-bad">{bracketSize - stats.total}곳 부족해요</p>
            )}
          </div>
        </div>
      )}
      <p className="mt-3 pt-3 border-t border-line text-xs text-muted leading-relaxed">
        리뷰 {MIN_REVIEWS}개 이상 · 별점 {MIN_RATING} 초과인 곳만 고르고, 리뷰가 적은 곳은 별점을 덜 믿도록 리뷰 수를
        반영한 점수로 줄을 세워요.
      </p>
    </div>
  );
}
