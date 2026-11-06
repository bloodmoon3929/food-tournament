/**
 * 네이버 지역 검색 API 프록시 (Cloudflare Worker)
 *
 * 네이버 검색 API는 Client Secret이 필요하고 브라우저 CORS를 허용하지 않아서
 * GitHub Pages(정적 사이트)에서 직접 호출할 수 없다. 이 Worker가 키를 숨긴 채 대신 호출한다.
 *
 * 필요한 환경 변수 (wrangler secret put ...):
 *   NAVER_CLIENT_ID       네이버 개발자센터 애플리케이션 Client ID
 *   NAVER_CLIENT_SECRET   Client Secret
 *   ALLOWED_ORIGINS       허용할 Origin, 쉼표 구분 (예: https://bloodmoon3929.github.io,http://localhost:3000)
 *
 * 사용: GET https://<worker>/local?query=강남구 역삼동 한식&display=5&sort=comment
 */
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET' || !originAllowed) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    if (url.pathname.replace(/\/+$/, '') !== '/local') {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const query = (url.searchParams.get('query') || '').slice(0, 100);
    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // 지역 검색 API는 display 최대 5, start 1만 지원
    const display = Math.min(Math.max(parseInt(url.searchParams.get('display') || '5', 10) || 5, 1), 5);
    const sort = url.searchParams.get('sort') === 'random' ? 'random' : 'comment';

    const naverUrl = new URL('https://openapi.naver.com/v1/search/local.json');
    naverUrl.searchParams.set('query', query);
    naverUrl.searchParams.set('display', String(display));
    naverUrl.searchParams.set('sort', sort);

    const res = await fetch(naverUrl, {
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
  },
};
