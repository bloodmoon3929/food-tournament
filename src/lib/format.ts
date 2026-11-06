import { Restaurant } from './types';

export const formatDistance = (m?: number) =>
  m === undefined ? '' : m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;

export const formatCount = (n?: number) => (n === undefined ? '' : n.toLocaleString('ko-KR'));

export const formatRadius = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)}km` : `${m}m`);

/** 지도 앱에서 가게 열기 */
export const mapUrl = (r: Restaurant) =>
  r.source === 'naver'
    ? `https://map.naver.com/p/search/${encodeURIComponent(r.name)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${encodeURIComponent(r.id)}`;

/** n강 이름: 2 → 결승, 4 → 준결승, 8 → 8강 */
export const roundName = (size: number) => (size === 2 ? '결승' : size === 4 ? '준결승' : `${size}강`);
