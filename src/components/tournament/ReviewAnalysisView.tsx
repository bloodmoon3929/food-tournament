'use client';

import { ExternalLink, Sparkles, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { ReviewAnalysis, ReviewSnippet, isOverseas, usesNaverBlog } from '@/lib/reviews';
import { useReviewAnalysis } from '@/hooks/useReviewAnalysis';
import { isProxyEnabled } from '@/lib/proxy';

const SENTIMENT_LABEL: Record<ReviewAnalysis['sentiment'], string> = {
  positive: '대체로 호평',
  mixed: '호불호 있음',
  negative: '아쉬운 평이 많음',
  unknown: '판단 보류',
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="리뷰 분석 중">
      <div className="h-4 w-32 rounded bg-line" />
      <div className="space-y-2">
        <div className="h-3.5 rounded bg-line" />
        <div className="h-3.5 w-11/12 rounded bg-line" />
        <div className="h-3.5 w-2/3 rounded bg-line" />
      </div>
      <div className="h-2 rounded-full bg-line" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl bg-line" />
        <div className="h-20 rounded-xl bg-line" />
      </div>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone: 'good' | 'bad' | 'plain' }) {
  const cls = tone === 'good' ? 'bg-good/10 text-good' : tone === 'bad' ? 'bg-bad/10 text-bad' : 'bg-sunken text-ink';
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className={`rounded-lg px-2.5 py-1 text-sm font-medium ${cls}`}>
          {t}
        </li>
      ))}
    </ul>
  );
}

function SnippetItem({ s }: { s: ReviewSnippet }) {
  return (
    <li className="space-y-1.5 border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className={`font-bold ${s.source === 'google' ? 'text-ink' : 'text-naver'}`}>
          {s.source === 'google' ? 'Google 리뷰' : '네이버 블로그'}
        </span>
        {s.rating !== undefined && (
          <span className="inline-flex items-center gap-0.5 text-ink">
            <Star className="h-3 w-3 fill-gold text-gold" />
            {s.rating}
          </span>
        )}
        {s.when && <span>{s.when}</span>}
        {s.link && (
          <a href={s.link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 hover:text-ink">
            원문 <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed">{s.text}</p>
    </li>
  );
}

export default function ReviewAnalysisView({ restaurant }: { restaurant: Restaurant }) {
  const { analysis, loading, error } = useReviewAnalysis(restaurant);

  if (loading || (!analysis && !error)) return <Skeleton />;
  if (error || !analysis) return <p className="text-sm text-bad">{error}</p>;

  const { counts } = analysis;
  const pct = analysis.positiveRatio === null ? null : Math.round(analysis.positiveRatio * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
            analysis.engine === 'ai' ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted'
          }`}
        >
          {analysis.engine === 'ai' && <Sparkles className="h-3 w-3" />}
          {analysis.engine === 'ai' ? 'Jev 분석' : '키워드 분석'}
        </span>
        <span className="text-muted">
          Google 리뷰 {counts.google}개{usesNaverBlog(restaurant) && ` · 블로그 ${counts.naverBlog}개`}
        </span>
      </div>

      <p className="text-[15px] leading-relaxed">{analysis.summary}</p>

      {pct !== null && (
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold">{SENTIMENT_LABEL[analysis.sentiment]}</span>
            <span className="text-muted tabular">긍정 {pct}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-bad/25">
            <div className="h-full bg-good" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {(analysis.pros.length > 0 || analysis.cons.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-good">
              <ThumbsUp className="h-4 w-4" /> 좋아요
            </h4>
            {analysis.pros.length ? <Chips items={analysis.pros} tone="good" /> : <p className="text-sm text-muted">뚜렷한 장점 언급이 없어요</p>}
          </div>
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-bad">
              <ThumbsDown className="h-4 w-4" /> 아쉬워요
            </h4>
            {analysis.cons.length ? <Chips items={analysis.cons} tone="bad" /> : <p className="text-sm text-muted">눈에 띄는 불만이 없어요</p>}
          </div>
        </div>
      )}

      {analysis.keywords.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold">자주 나온 메뉴 · 키워드</h4>
          <Chips items={analysis.keywords} tone="plain" />
        </div>
      )}

      {analysis.snippets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold">리뷰 원문</h4>
          <ul className="max-h-72 overflow-y-auto rounded-2xl bg-sunken p-4">
            {analysis.snippets.slice(0, 8).map((s, i) => (
              <SnippetItem key={i} s={s} />
            ))}
          </ul>
        </div>
      )}

      {usesNaverBlog(restaurant) && isOverseas(restaurant) && (
        <p className="text-xs text-muted">
          해외 가게는 가게 이름과 도시 이름이 함께 나온 블로그 글만 골라 썼어요.
        </p>
      )}

      {!isProxyEnabled() && (
        <p className="text-xs text-muted">
          네이버 블로그 후기와 Jev 분석은 프록시(NEXT_PUBLIC_PROXY_URL)를 설정하면 함께 쓸 수 있어요.
        </p>
      )}
    </div>
  );
}
