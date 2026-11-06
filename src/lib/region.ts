import { LocationData } from './types';

/**
 * 좌표가 한국(남한 + 제주·울릉·독도)인지 대략 판정한다.
 * 네이버 검색/블로그는 한국 가게에만 의미가 있어서, 해외에서는 쓰지 않는 데 사용한다.
 *
 * 위도 33.0~38.7, 경도 124.5~132.0 상자에서
 * 쓰시마·규슈(일본)가 들어오지 않도록 "경도 129.2 초과 & 위도 35.0 미만"은 뺀다.
 * (부산 129.0/35.1, 기장 129.2/35.2, 거제 128.6/34.9 는 포함)
 */
export const isInKorea = ({ lat, lng }: LocationData): boolean => {
  if (lat < 33.0 || lat > 38.7 || lng < 124.5 || lng > 132.0) return false;
  if (lng > 129.2 && lat < 35.0) return false;
  return true;
};
