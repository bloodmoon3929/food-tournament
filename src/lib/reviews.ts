/// <reference types="google.maps" />
import { Restaurant } from './types';
import { getPlacesService } from './google-maps';
import { PROXY_URL, isProxyEnabled } from './proxy';

/**
 * 리뷰 분석
 *
 * 1) 리뷰 수집
 *    - Google 장소 상세의 리뷰 (최대 5개, 별점 포함)
 *    - 네이버 블로그 검색 결과 요약문 (프록시 경유, 최대 10개)
 * 2) 분석
 *    - 프록시에 TypeSafe 키가 있으면 Jev 로 장단점/전체 평가/추천 메뉴 판정 (proxy/worker.js 의 /analyze)
 *    - 아니면(또는 실패하면) 브라우저에서 키워드 기반 분석
 */

export interface ReviewSnippet {
  source: 'google' | 'naver-blog';
  text: string;
  rating?: number;
  author?: string;
  when?: string;
  link?: string;
}

export interface ReviewAnalysis {
  engine: 'ai' | 'keyword';
  summary: string;
  pros: string[];
  cons: string[];
  /** 자주 언급된 메뉴 / 키워드 */
  keywords: string[];
  /** 0 ~ 1, 긍정 비율 */
  positiveRatio: number | null;
  sentiment: 'positive' | 'mixed' | 'negative' | 'unknown';
  snippets: ReviewSnippet[];
  counts: { google: number; naverBlog: number };
}

// ---------------------------------------------------------------------------
// 수집
// ---------------------------------------------------------------------------

const stripHtml = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

const fetchGoogleReviews = (placeId: string): Promise<ReviewSnippet[]> =>
  new Promise((resolve) => {
    try {
      getPlacesService().getDetails({ placeId, fields: ['reviews'] }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.reviews) {
          resolve([]);
          return;
        }
        resolve(
          place.reviews
            .filter((r) => r.text)
            .map((r) => ({
              source: 'google' as const,
              text: r.text,
              rating: r.rating,
              author: r.author_name,
              when: r.relative_time_description,
            }))
        );
      });
    } catch {
      resolve([]);
    }
  });

/** "서울 강남구 테헤란로 123" → "강남구" 처럼 검색어에 붙일 동네 이름 */
const areaHint = (address: string) => {
  const parts = address.split(/\s+/);
  return parts.find((p) => /(구|군|시|동|읍|면)$/.test(p) && p.length > 1) || '';
};

const fetchNaverBlogReviews = async (restaurant: Restaurant): Promise<ReviewSnippet[]> => {
  if (!isProxyEnabled()) return [];
  try {
    const query = `${restaurant.name} ${areaHint(restaurant.vicinity)} 후기`.trim();
    const res = await fetch(`${PROXY_URL}/blog?query=${encodeURIComponent(query)}&display=10`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: { title: string; description: string; link: string; postdate?: string }[] = data?.items || [];
    return items
      .map((item) => ({
        source: 'naver-blog' as const,
        text: `${stripHtml(item.title)} — ${stripHtml(item.description)}`,
        link: item.link,
        when: item.postdate ? `${item.postdate.slice(0, 4)}.${item.postdate.slice(4, 6)}.${item.postdate.slice(6, 8)}` : undefined,
      }))
      .filter((s) => s.text.length > 10);
  } catch {
    return [];
  }
};

export const collectReviews = async (restaurant: Restaurant): Promise<ReviewSnippet[]> => {
  const [googleReviews, blogReviews] = await Promise.all([
    restaurant.source === 'google' && restaurant.id ? fetchGoogleReviews(restaurant.id) : Promise.resolve([]),
    fetchNaverBlogReviews(restaurant),
  ]);
  return [...googleReviews, ...blogReviews];
};

// ---------------------------------------------------------------------------
// 키워드 분석 (AI 를 못 쓸 때)
// ---------------------------------------------------------------------------

const POSITIVE_ASPECTS: [string, RegExp][] = [
  ['맛이 좋아요', /맛있|존맛|맛집|감칠맛|풍미|고소|바삭|쫄깃|부드럽|촉촉|delicious|tasty/i],
  ['친절해요', /친절|사장님.{0,6}좋|서비스.{0,4}좋|friendly|kind/i],
  ['깔끔해요', /깔끔|깨끗|청결|clean/i],
  ['가성비가 좋아요', /가성비|저렴|합리적|착한 가격|cheap|reasonable/i],
  ['양이 푸짐해요', /푸짐|양.{0,3}많|넉넉|배불/i],
  ['분위기가 좋아요', /분위기|인테리어|아늑|감성|atmosphere|cozy/i],
  ['재방문 의사', /재방문|또 ?(가|올|오)|단골|again|revisit/i],
  ['신선해요', /신선|싱싱|fresh/i],
];

const NEGATIVE_ASPECTS: [string, RegExp][] = [
  ['가격이 비싸요', /비싸|가격.{0,4}(높|부담)|expensive|overpriced/i],
  ['서비스가 아쉬워요', /불친절|무뚝뚝|서비스.{0,4}(별로|아쉽|최악)|rude/i],
  ['대기가 길어요', /웨이팅|대기.{0,4}(길|오래)|오래 기다|줄.{0,3}(길|서)|wait/i],
  ['간이 세요', /짜요|짰|너무 짜|자극적|느끼|salty|greasy/i],
  ['위생이 아쉬워요', /더럽|위생|지저분|dirty/i],
  ['맛이 아쉬워요', /별로|실망|그저 그|평범|맛없|비추|disappoint|bland/i],
  ['양이 적어요', /양.{0,3}(적|작)|small portion/i],
];

const NEGATIVE_WORDS = /별로|실망|비추|최악|불친절|맛없|아쉽|그저 그|disappoint|bad|worst/i;
const POSITIVE_WORDS = /맛있|존맛|최고|추천|친절|재방문|만족|훌륭|good|great|delicious|best/i;

/** 한국 음식점 리뷰에 자주 나오는 메뉴 이름 */
const MENU_WORDS = [
  '삼겹살', '목살', '갈비', '불고기', '곱창', '막창', '족발', '보쌈', '치킨', '닭갈비', '삼계탕', '국밥', '순대국',
  '설렁탕', '갈비탕', '김치찌개', '된장찌개', '부대찌개', '냉면', '칼국수', '수제비', '만두', '떡볶이', '김밥', '라면',
  '비빔밥', '돈까스', '돈카츠', '라멘', '우동', '소바', '초밥', '스시', '회', '사시미', '오마카세', '짜장면', '짬뽕',
  '탕수육', '마라탕', '훠궈', '쌀국수', '파스타', '피자', '스테이크', '리조또', '햄버거', '버거', '타코', '커리', '카레',
  '샐러드', '샌드위치', '브런치', '디저트', '케이크', '빙수', '커피', '와인', '맥주', '하이볼', '전골', '아구찜', '해물찜',
];

const countMatches = (texts: string[], aspects: [string, RegExp][]) =>
  aspects
    .map(([label, re]) => ({ label, count: texts.filter((t) => re.test(t)).length }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);

export const analyzeByKeywords = (snippets: ReviewSnippet[]): ReviewAnalysis => {
  const texts = snippets.map((s) => s.text);
  const counts = {
    google: snippets.filter((s) => s.source === 'google').length,
    naverBlog: snippets.filter((s) => s.source === 'naver-blog').length,
  };

  if (texts.length === 0) {
    return {
      engine: 'keyword',
      summary: '분석할 리뷰를 찾지 못했어요.',
      pros: [],
      cons: [],
      keywords: [],
      positiveRatio: null,
      sentiment: 'unknown',
      snippets,
      counts,
    };
  }

  const pros = countMatches(texts, POSITIVE_ASPECTS);
  const cons = countMatches(texts, NEGATIVE_ASPECTS);

  // 리뷰별 긍정/부정 판정: 별점이 있으면 별점, 없으면 단어
  let positive = 0;
  let judged = 0;
  for (const s of snippets) {
    if (s.rating) {
      judged++;
      if (s.rating >= 4) positive++;
    } else {
      const pos = POSITIVE_WORDS.test(s.text);
      const neg = NEGATIVE_WORDS.test(s.text);
      if (pos || neg) {
        judged++;
        if (pos && !neg) positive++;
        else if (pos && neg) positive += 0.5;
      }
    }
  }
  const positiveRatio = judged > 0 ? positive / judged : null;
  const sentiment: ReviewAnalysis['sentiment'] =
    positiveRatio === null ? 'unknown' : positiveRatio >= 0.7 ? 'positive' : positiveRatio >= 0.4 ? 'mixed' : 'negative';

  const joined = texts.join(' ');
  const keywords = MENU_WORDS.map((w) => ({ w, n: joined.split(w).length - 1 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((x) => x.w);

  const tone =
    sentiment === 'positive' ? '대체로 호평이에요' : sentiment === 'mixed' ? '호불호가 갈려요' : sentiment === 'negative' ? '아쉽다는 평이 많아요' : '평가가 뚜렷하지 않아요';
  let summary = `리뷰 ${texts.length}개 기준, ${tone}.`;
  if (pros[0]) summary += ` 특히 "${pros[0].label}"라는 말이 많아요.`;
  if (cons[0]) summary += ` 다만 "${cons[0].label}"라는 의견도 있어요.`;
  if (keywords.length) summary += ` 자주 언급된 메뉴: ${keywords.slice(0, 3).join(', ')}.`;

  return {
    engine: 'keyword',
    summary,
    pros: pros.slice(0, 4).map((p) => p.label),
    cons: cons.slice(0, 3).map((c) => c.label),
    keywords,
    positiveRatio,
    sentiment,
    snippets,
    counts,
  };
};

// ---------------------------------------------------------------------------
// AI 분석 (프록시)
// ---------------------------------------------------------------------------

interface AiResult {
  summary?: string;
  pros?: string[];
  cons?: string[];
  keywords?: string[];
  positiveRatio?: number;
  sentiment?: ReviewAnalysis['sentiment'];
}

/** menus: 리뷰에서 찾은 메뉴 후보. Jev 가 그중 추천받는 메뉴를 고른다 */
const analyzeByAi = async (restaurant: Restaurant, snippets: ReviewSnippet[], menus: string[]): Promise<AiResult | null> => {
  if (!isProxyEnabled() || snippets.length === 0) return null;
  try {
    const res = await fetch(`${PROXY_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: restaurant.name,
        address: restaurant.vicinity,
        reviews: snippets.slice(0, 20).map((s) => ({ source: s.source, rating: s.rating, text: s.text.slice(0, 500) })),
        menus,
      }),
    });
    if (!res.ok) return null;
    const data: AiResult = await res.json();
    return typeof data?.summary === 'string' ? data : null;
  } catch {
    return null;
  }
};

const asStrings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max) : [];

export async function analyzeRestaurantReviews(restaurant: Restaurant): Promise<ReviewAnalysis> {
  const snippets = await collectReviews(restaurant);
  const base = analyzeByKeywords(snippets);
  const ai = await analyzeByAi(restaurant, snippets, base.keywords);
  if (!ai) return base;

  const ratio = typeof ai.positiveRatio === 'number' && ai.positiveRatio >= 0 && ai.positiveRatio <= 1 ? ai.positiveRatio : base.positiveRatio;
  const sentiment = ['positive', 'mixed', 'negative', 'unknown'].includes(ai.sentiment || '') ? ai.sentiment! : base.sentiment;
  return {
    ...base,
    engine: 'ai',
    summary: ai.summary || base.summary,
    // Jev 가 "언급 없음"으로 판정했으면 빈 목록 그대로 둔다 (키워드 분석으로 덮어쓰지 않음)
    pros: asStrings(ai.pros, 4),
    cons: asStrings(ai.cons, 3),
    keywords: asStrings(ai.keywords, 6).length ? asStrings(ai.keywords, 6) : base.keywords,
    positiveRatio: ratio,
    sentiment,
  };
}
