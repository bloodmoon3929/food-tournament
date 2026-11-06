/// <reference types="google.maps" />
import { Restaurant } from './types';
import { getPlacesService } from './google-maps';
import { PROXY_URL, isProxyEnabled } from './proxy';
import { isInKorea } from './region';

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
  return parts.find((p) => /(구|군|시|동|읍|면)$/.test(p) && p.length > 1 && !/(특별시|광역시|특별자치시)$/.test(p)) || '';
};

/** 네이버 블로그 후기를 가져올지 (해외 가게도 사용하되, 아래에서 더 엄격하게 거른다) */
export const usesNaverBlog = (_restaurant?: Restaurant) => isProxyEnabled();

/** 해외 가게인지 (블로그 후기를 "이름 + 도시"가 모두 나온 글로만 제한) */
export const isOverseas = (restaurant: Restaurant) => !isInKorea(restaurant.geometry.location);

/** 비교용 정규화: 소문자, 공백/기호 제거. 한글·영문·숫자·일본어(가나)·한자는 남긴다 */
export const normalize = (text: string) =>
  text.toLowerCase().replace(/[^0-9a-z가-힣぀-ヿ㐀-鿿]/g, '');

/** 지점명(…점, …店)과 괄호 안 내용을 뺀 이름 단어들 */
const nameTokens = (name: string) =>
  name
    .replace(/\(.*?\)|\[.*?\]|（.*?）/g, ' ')
    .split(/\s+/)
    .map(normalize)
    .filter((t) => t.length > 0 && !/^.{1,6}[점店]$/.test(t));

/**
 * 가게 이름의 핵심 단어. "홍콩반점 성수점" → "홍콩반점", "타코튜즈데이 성수 본점" → "타코튜즈데이"
 */
export const nameCore = (name: string) => nameTokens(name).find((t) => t.length >= 2) || normalize(name);

/** 가게 이름 전체 (지점명 제외). "Joe's Pizza" → "joespizza" */
export const nameFull = (name: string) => nameTokens(name).join('') || normalize(name);

/**
 * 해외 가게의 도시 이름 후보. 블로그는 한국어(도쿄, 뉴욕)로도 원어(Tokyo)로도 쓰므로 둘 다.
 * 한국어는 Google 역지오코딩(ko), 원어는 주소의 마지막 부분에서.
 */
const overseasCityNames = (restaurant: Restaurant): Promise<string[]> =>
  new Promise((resolve) => {
    const names = new Set<string>();
    const tail = restaurant.vicinity.split(',').pop()?.trim();
    if (tail && !/\d/.test(tail)) names.add(tail);
    try {
      new google.maps.Geocoder().geocode({ location: restaurant.geometry.location, language: 'ko' }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results) {
          for (const type of ['locality', 'administrative_area_level_2', 'administrative_area_level_1']) {
            const comp = results.flatMap((r) => r.address_components).find((c) => c.types.includes(type));
            if (!comp) continue;
            names.add(comp.long_name);
            // "도쿄도" → "도쿄", "시부야구" → "시부야", "뉴욕주" → "뉴욕"
            const short = comp.long_name.replace(/(도|시|구|현|부|주)$/, '');
            if (short.length >= 2) names.add(short);
          }
        }
        resolve(Array.from(names).filter((n) => normalize(n).length >= 2));
      });
    } catch {
      resolve(Array.from(names));
    }
  });

interface BlogPost {
  snippet: ReviewSnippet;
  title: string;
  body: string;
}

/** 여행기·목록·일기 글 제목 ("1박3일", "day2", "쇼핑 리스트", "총정리", "3월의 기록" …) */
const ROUNDUP_TITLE =
  /여행기|일차|day\s*\d|\d\s*박|쇼핑|리스트|총정리|모음|추천템|코스|일정|브이로그|vlog|가맹점|사용처|기록|일기|일상|순례/i;

/** 음식·맛집 글로 보이는 제목 */
const FOOD_TITLE =
  /맛집|후기|리뷰|식당|레스토랑|메뉴|먹|맛|라멘|라면|스시|초밥|우동|소바|야키|돈카츠|규동|이자카야|카페|커피|디저트|빵|베이커리|피자|버거|브런치|팬케이크|다이너|스테이크|바베큐|bbq|타코|쌀국수|딤섬|훠궈|술집|bar|pub/i;

/**
 * 해외용: 이름이 제목에 있으면 OK.
 * 본문에만 있으면 제목이 음식 글이고 여행기·목록 글이 아닐 때만 (지나가듯 언급된 글 제외)
 */
const isAboutPlace = (post: BlogPost, key: string) => {
  if (normalize(post.title).includes(key)) return true;
  return (
    normalize(post.body).includes(key) &&
    FOOD_TITLE.test(post.title) &&
    !ROUNDUP_TITLE.test(post.title) &&
    !/여행|회차/.test(post.title) // "도쿄 8회차 혼자 여행 후기" 같은 여행기
  );
};

/** "홍콩반점0410 성수역점" → ["성수역", "성수"] : 이름에 붙은 지점명 */
const branchKeys = (name: string) =>
  name
    .split(/\s+/)
    .map(normalize)
    .filter((t) => /^.{1,6}[점店]$/.test(t) && !/^본점$/.test(t))
    .flatMap((t) => {
      const base = t.replace(/[점店]$/, '');
      return [base, base.replace(/(역|동|구|시)$/, '')];
    })
    .filter((k) => k.length >= 2);

/** "서울 성동구 성수동1가" → ["성동구", "성동", "성수동1가", "성수"] : 주소의 구/동 이름 */
const districtKeys = (address: string) =>
  address
    .split(/\s+/)
    .map(normalize)
    .filter((t) => /(구|군|시|동|읍|면|가)$/.test(t) && t.length >= 2 && !/(특별시|광역시|특별자치시)$/.test(t))
    .flatMap((t) => [t, t.replace(/\d*(가|동|구|군|시|읍|면)$/, '')])
    .filter((k) => k.length >= 2 && !/^(서울|부산|대구|인천|광주|대전|울산|서울특별|특별)$/.test(k));

const searchBlog = async (query: string): Promise<BlogPost[]> => {
  const res = await fetch(`${PROXY_URL}/blog?query=${encodeURIComponent(query)}&display=20`);
  if (!res.ok) return [];
  const data = await res.json();
  const items: { title: string; description: string; link: string; postdate?: string }[] = data?.items || [];
  return items
    .map((item) => {
      const title = stripHtml(item.title);
      const body = stripHtml(item.description);
      return {
        title,
        body,
        snippet: {
          source: 'naver-blog' as const,
          text: `${title} — ${body}`,
          link: item.link,
          when: item.postdate ? `${item.postdate.slice(0, 4)}.${item.postdate.slice(4, 6)}.${item.postdate.slice(6, 8)}` : undefined,
        },
      };
    })
    .filter((p) => p.snippet.text.length > 10);
};

const fetchNaverBlogReviews = async (restaurant: Restaurant): Promise<ReviewSnippet[]> => {
  if (!usesNaverBlog(restaurant)) return [];
  try {
    if (!isOverseas(restaurant)) {
      // 국내: 글이 많으니 제목에 가게 이름이 있는 글만.
      // 이름에 지점명이 있으면(프랜차이즈) 그 지점/동네 이름도 글에 나와야 한다 (다른 지점 글 제외)
      const core = nameCore(restaurant.name);
      if (core.length < 2) return [];
      const branches = branchKeys(restaurant.name);
      const places = [...branches, ...districtKeys(restaurant.vicinity)];
      const posts = await searchBlog(`${restaurant.name} ${areaHint(restaurant.vicinity)} 후기`.trim());
      return posts
        .filter((p) => normalize(p.title).includes(core) && !ROUNDUP_TITLE.test(p.title))
        .filter((p) => branches.length === 0 || places.some((k) => normalize(p.snippet.text).includes(k)))
        .slice(0, 10)
        .map((p) => p.snippet);
    }

    // 해외: 가게 이름 전체 + 도시 이름이 모두 나오는 글만
    // (같은 이름의 다른 도시 지점, 이름만 겹치는 엉뚱한 글 제외)
    const full = nameFull(restaurant.name);
    if (full.length < 3) return [];
    const cities = await overseasCityNames(restaurant);
    if (cities.length === 0) return [];
    const cityKeys = cities.map(normalize);
    const koreanCity = cities.find((c) => /[가-힣]/.test(c)) || cities[0];
    const posts = await searchBlog(`${restaurant.name} ${koreanCity}`);
    return posts
      .filter((p) => isAboutPlace(p, full) && cityKeys.some((c) => normalize(p.snippet.text).includes(c)))
      .slice(0, 10)
      .map((p) => p.snippet);
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
