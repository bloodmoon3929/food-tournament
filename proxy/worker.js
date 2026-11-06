/**
 * 맛집 월드컵 API 프록시 (Cloudflare Worker)
 *
 * GitHub Pages 는 정적 사이트라 비밀 키를 브라우저 코드에 넣으면 누구나 볼 수 있다.
 * 키가 필요한 호출은 이 Worker 가 대신한다.
 *
 *   GET  /local?query=...      네이버 지역 검색 (display 최대 5)
 *   GET  /blog?query=...       네이버 블로그 검색 (리뷰 수집용, display 최대 20)
 *   POST /analyze              리뷰 AI 분석 → { summary, pros, cons, keywords, positiveRatio, sentiment }
 *
 * 환경 변수
 *   ALLOWED_ORIGINS       허용할 Origin, 쉼표 구분 (wrangler.toml [vars])
 *   NAVER_CLIENT_ID       (secret) 네이버 개발자센터 Client ID
 *   NAVER_CLIENT_SECRET   (secret) 네이버 Client Secret
 *   REVIEW_AI_URL         (var)    리뷰 분석 AI 의 Chat Completions 주소 (OpenAI 호환 형식)
 *   REVIEW_AI_MODEL       (var)    모델 이름
 *   REVIEW_AI_KEY         (secret) AI API 키 — Authorization: Bearer 로 전송
 *
 * REVIEW_AI_* 가 없으면 /analyze 는 501 을 돌려주고, 사이트는 키워드 분석으로 대신한다.
 */

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

async function naverSearch(kind, url, env, cors) {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
    return json({ error: 'naver api is not configured' }, 501, cors);
  }
  const query = (url.searchParams.get('query') || '').slice(0, 100);
  if (!query) return json({ error: 'query is required' }, 400, cors);

  const target = new URL(`https://openapi.naver.com/v1/search/${kind}.json`);
  target.searchParams.set('query', query);
  if (kind === 'local') {
    // 지역 검색 API 는 display 최대 5, start 1 만 지원
    target.searchParams.set('display', String(clampInt(url.searchParams.get('display'), 1, 5, 5)));
    target.searchParams.set('sort', url.searchParams.get('sort') === 'random' ? 'random' : 'comment');
  } else {
    target.searchParams.set('display', String(clampInt(url.searchParams.get('display'), 1, 20, 10)));
    target.searchParams.set('sort', 'sim');
  }

  const res = await fetch(target, {
    headers: {
      'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET,
    },
    // 같은 검색어는 1시간 캐시해서 호출량을 줄인다
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const SYSTEM_PROMPT = `너는 음식점 리뷰를 분석하는 도우미다. 주어진 리뷰들만 근거로 판단하고, 리뷰에 없는 내용은 지어내지 마라.
반드시 아래 JSON 하나만 출력한다 (코드블록, 설명 없이):
{"summary": "2~3문장 한국어 요약", "pros": ["장점 짧게", ...최대 4개], "cons": ["단점 짧게", ...최대 3개],
 "keywords": ["자주 언급된 메뉴나 특징", ...최대 6개], "positiveRatio": 0~1 사이 숫자, "sentiment": "positive"|"mixed"|"negative"}`;

const extractJson = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

async function analyze(request, env, cors) {
  if (!env.REVIEW_AI_URL || !env.REVIEW_AI_KEY || !env.REVIEW_AI_MODEL) {
    return json({ error: 'review ai is not configured' }, 501, cors);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400, cors);
  }
  const name = String(body?.name || '').slice(0, 100);
  const address = String(body?.address || '').slice(0, 200);
  const reviews = Array.isArray(body?.reviews) ? body.reviews.slice(0, 20) : [];
  if (!name || reviews.length === 0) return json({ error: 'name and reviews are required' }, 400, cors);

  const reviewText = reviews
    .map((r, i) => {
      const src = r?.source === 'google' ? 'Google 리뷰' : '네이버 블로그';
      const rating = typeof r?.rating === 'number' ? ` (별점 ${r.rating})` : '';
      return `${i + 1}. [${src}${rating}] ${String(r?.text || '').slice(0, 500)}`;
    })
    .join('\n');

  const res = await fetch(env.REVIEW_AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.REVIEW_AI_KEY}`,
    },
    body: JSON.stringify({
      model: env.REVIEW_AI_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `가게: ${name}\n주소: ${address}\n\n리뷰:\n${reviewText}` },
      ],
    }),
  });
  if (!res.ok) return json({ error: `review ai failed: ${res.status}` }, 502, cors);

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content || '';
  const result = extractJson(typeof content === 'string' ? content : '');
  if (!result || typeof result.summary !== 'string') {
    return json({ error: 'review ai returned no json' }, 502, cors);
  }
  return json(result, 200, cors);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const originAllowed = allowed.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': originAllowed ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // 다른 사이트에서 키를 빌려 쓰지 못하게 Origin 확인
    if (!originAllowed) return json({ error: 'forbidden' }, 403, cors);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (request.method === 'GET' && path === '/local') return naverSearch('local', url, env, cors);
    if (request.method === 'GET' && path === '/blog') return naverSearch('blog', url, env, cors);
    if (request.method === 'POST' && path === '/analyze') return analyze(request, env, cors);
    return json({ error: 'not found' }, 404, cors);
  },
};
