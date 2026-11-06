/**
 * 맛집 월드컵 API 프록시 (Cloudflare Worker)
 *
 * GitHub Pages 는 정적 사이트라 비밀 키를 브라우저 코드에 넣으면 누구나 볼 수 있다.
 * 키가 필요한 호출은 이 Worker 가 대신한다.
 *
 *   GET  /local?query=...      네이버 지역 검색 (display 최대 5)
 *   GET  /blog?query=...       네이버 블로그 검색 (리뷰 수집용, display 최대 20)
 *   POST /analyze              리뷰 분석 (TypeSafe Jev) → { summary, pros, cons, keywords, positiveRatio, sentiment }
 *
 * 환경 변수
 *   ALLOWED_ORIGINS       허용할 Origin, 쉼표 구분 (wrangler.toml [vars])
 *   NAVER_CLIENT_ID       (secret) 네이버 개발자센터 Client ID
 *   NAVER_CLIENT_SECRET   (secret) 네이버 Client Secret
 *   TYPESAFE_API_KEY      (secret) TypeSafe API 키 (https://console.typesafe.ai/keys)
 *   TYPESAFE_MODEL        (var)    기본 jev-latest
 *
 * TYPESAFE_API_KEY 가 없으면 /analyze 는 501 을 돌려주고, 사이트는 키워드 분석으로 대신한다.
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

// ---------------------------------------------------------------------------
// 리뷰 분석: TypeSafe Jev (System One)
//   Jev 는 글을 생성하지 않고, 질문마다 정해진 형태의 답(확률/점수)만 돌려준다.
//   그래서 "리뷰에서 맛을 칭찬하나?" 같은 예/아니오 질문(noul)과 전체 평가 점수(score)를
//   한 번에 물어보고, 요약 문장은 여기서 답을 조합해 만든다.
//   https://docs.typesafe.ai/primitives
// ---------------------------------------------------------------------------

const PROS = {
  taste: ['맛이 좋아요', 'Does at least one review in `reviews` explicitly praise how the food tastes?'],
  service: ['친절해요', 'Does at least one review in `reviews` explicitly praise friendly staff or good service?'],
  clean: ['깔끔해요', 'Does at least one review in `reviews` explicitly say the place is clean and tidy?'],
  value: ['가성비가 좋아요', 'Does at least one review in `reviews` explicitly say the food is good value for the price?'],
  portion: ['양이 푸짐해요', 'Does at least one review in `reviews` explicitly praise generous portion sizes?'],
  mood: ['분위기가 좋아요', 'Does at least one review in `reviews` explicitly praise the atmosphere, mood or interior design?'],
  revisit: ['또 가고 싶대요', 'Does at least one review in `reviews` explicitly say they want to come back again?'],
  fresh: ['재료가 신선해요', 'Does at least one review in `reviews` explicitly praise fresh ingredients?'],
};

const CONS = {
  price: ['가격이 비싸요', 'Does at least one review in `reviews` explicitly complain that it is expensive?'],
  service: ['서비스가 아쉬워요', 'Does at least one review in `reviews` explicitly complain about rude staff or poor service?'],
  wait: ['대기가 길어요', 'Does at least one review in `reviews` explicitly complain about long waiting times or queues?'],
  seasoning: ['간이 세요', 'Does at least one review in `reviews` explicitly complain that the food is too salty, greasy or strongly seasoned?'],
  hygiene: ['위생이 아쉬워요', 'Does at least one review in `reviews` explicitly complain about hygiene or dirtiness?'],
  taste: ['맛이 기대 이하예요', 'Does at least one review in `reviews` explicitly say the food was disappointing or not tasty?'],
  portion: ['양이 적어요', 'Does at least one review in `reviews` explicitly complain about small portions?'],
};

const OVERALL_LEVELS = [
  'Mostly negative',
  'Mixed, praise and complaints are balanced',
  'Mostly positive with a few complaints',
  'Overwhelmingly positive',
];

/** 이 확률 이상이면 리뷰에서 그 장단점을 언급한다고 본다 */
const MENTION_THRESHOLD = 0.7;

const buildQuestions = (menus) => {
  const questions = {
    overall: {
      type: 'score',
      instructions: 'Overall, how do the reviewers in `reviews` feel about this restaurant?',
      criteria: OVERALL_LEVELS,
    },
  };
  for (const [id, [, q]] of Object.entries(PROS)) questions[`pro_${id}`] = { type: 'noul', instructions: q };
  for (const [id, [, q]] of Object.entries(CONS)) questions[`con_${id}`] = { type: 'noul', instructions: q };
  menus.forEach((menu, i) => {
    questions[`menu_${i}`] = {
      type: 'noul',
      instructions: `Does at least one review in \`reviews\` explicitly recommend or praise the dish "${menu}"?`,
    };
  });
  return questions;
};

const pickMentioned = (answers, prefix, table) =>
  Object.entries(table)
    .map(([id, [label]]) => ({ label, p: answers[`${prefix}_${id}`]?.noul ?? 0 }))
    .filter((x) => x.p >= MENTION_THRESHOLD)
    .sort((a, b) => b.p - a.p);

const summarize = (count, sentiment, pros, cons, menus) => {
  const tone = {
    positive: '대체로 호평이에요',
    mixed: '호불호가 갈려요',
    negative: '아쉽다는 평이 많아요',
  }[sentiment];
  const quote = (list, n) => list.slice(0, n).map((x) => `"${x.label}"`).join(', ');
  let text = `리뷰 ${count}개 기준, ${tone}.`;
  if (pros.length && cons.length) text += ` ${quote(pros, 2)}라는 평이 많고, ${quote(cons, 1)}라는 의견도 있어요.`;
  else if (pros.length) text += ` ${quote(pros, 2)}라는 평이 많고 눈에 띄는 불만은 적어요.`;
  else if (cons.length) text += ` 특히 ${quote(cons, 2)}라는 평이 많아요.`;
  if (menus.length) text += ` 추천 메뉴: ${menus.slice(0, 3).join(', ')}.`;
  return text;
};

async function analyze(request, env, cors) {
  if (!env.TYPESAFE_API_KEY) return json({ error: 'review ai is not configured' }, 501, cors);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400, cors);
  }
  const name = String(body?.name || '').slice(0, 100);
  const reviews = (Array.isArray(body?.reviews) ? body.reviews : [])
    .slice(0, 20)
    .map((r) => ({
      source: r?.source === 'google' ? 'google' : 'naver-blog',
      ...(typeof r?.rating === 'number' ? { rating: r.rating } : {}),
      text: String(r?.text || '').slice(0, 500),
    }))
    .filter((r) => r.text);
  const menus = (Array.isArray(body?.menus) ? body.menus : [])
    .filter((m) => typeof m === 'string' && m.trim())
    .map((m) => m.trim().slice(0, 30))
    .slice(0, 8);
  if (!name || reviews.length === 0) return json({ error: 'name and reviews are required' }, 400, cors);

  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.TYPESAFE_MODEL || 'jev-latest',
      state: { restaurant: name, address: String(body?.address || '').slice(0, 200), reviews },
      questions: buildQuestions(menus),
    }),
  });
  if (!res.ok) return json({ error: `typesafe api failed: ${res.status}` }, 502, cors);

  const data = await res.json().catch(() => null);
  const answers = data?.answers;
  const overall = answers?.overall?.score;
  if (!answers || typeof overall !== 'number') return json({ error: 'typesafe api returned no answers' }, 502, cors);

  const sentiment = overall < 1 ? 'negative' : overall < 1.75 ? 'mixed' : 'positive';
  const pros = pickMentioned(answers, 'pro', PROS);
  const cons = pickMentioned(answers, 'con', CONS);
  const recommended = menus
    .map((menu, i) => ({ menu, p: answers[`menu_${i}`]?.noul ?? 0 }))
    .filter((x) => x.p >= MENTION_THRESHOLD)
    .sort((a, b) => b.p - a.p)
    .map((x) => x.menu);

  return json(
    {
      engine: 'jev',
      model: data.model,
      summary: summarize(reviews.length, sentiment, pros, cons, recommended),
      pros: pros.map((x) => x.label),
      cons: cons.map((x) => x.label),
      keywords: recommended,
      positiveRatio: Math.round((overall / (OVERALL_LEVELS.length - 1)) * 100) / 100,
      sentiment,
    },
    200,
    cors
  );
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
