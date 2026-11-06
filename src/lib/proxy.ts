/**
 * proxy/ 의 Cloudflare Worker 주소.
 * 네이버 검색, 리뷰 AI 분석처럼 비밀 키가 필요한 호출은 모두 여기를 거친다.
 * (GitHub Pages 는 정적 사이트라 키를 브라우저에 넣으면 그대로 공개된다)
 */
export const PROXY_URL = (process.env.NEXT_PUBLIC_PROXY_URL || '').replace(/\/+$/, '');

export const isProxyEnabled = () => PROXY_URL.length > 0;
