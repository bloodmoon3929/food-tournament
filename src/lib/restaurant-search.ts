/// <reference types="google.maps" />
import { Restaurant, LocationData } from './types';
import { extractRealMenuInfo } from './real-menu-places';

/**
 * Google + 네이버 혼합 맛집 검색
 *
 * 기존에는 Google Places nearbySearch 를 한 번만 호출해서 결과가 최대 20개로 잘렸다.
 * 여기서는
 *   1) Google: 페이지네이션(요청당 최대 60개) + 반경을 여러 구역으로 나눠 추가 검색
 *   2) 네이버 지역 검색: 주변 동네 이름 × 음식 키워드로 검색해 Google 에 없는 가게 보충
 * 을 합쳐서 중복을 제거한다.
 *
 * 네이버 검색 API 는 Client Secret 이 필요하고 브라우저 CORS 를 허용하지 않아서
 * GitHub Pages 같은 정적 사이트에서 직접 호출할 수 없다. 그래서
 * NEXT_PUBLIC_NAVER_PROXY_URL (naver-proxy/ 의 Cloudflare Worker) 이 설정된 경우에만 사용한다.
 */

const NAVER_PROXY_URL = (process.env.NEXT_PUBLIC_NAVER_PROXY_URL || '').replace(/\/+$/, '');

export const isNaverSearchEnabled = () => NAVER_PROXY_URL.length > 0;

/** 이만큼 모이면 검색을 더 확장하지 않는다 (최대 토너먼트 64강 + 여유분) */
const DEFAULT_TARGET = 80;
const MIN_RATING = 3.5;
const GOOGLE_MAX_PAGES = 3; // nearbySearch 는 페이지당 20개, 최대 3페이지(60개)
const NAVER_KEYWORDS = ['맛집', '한식', '중식', '일식', '양식', '분식', '고기'];
const NAVER_MAX_AREAS = 5;
const SAME_PLACE_DISTANCE_M = 200; // 노트북 버전과 동일하게 200m 이내 + 이름 일치면 같은 가게

export interface SearchStats {
  google: number;
  naver: number;
  total: number;
}

export interface SearchResult {
  restaurants: Restaurant[];
  stats: SearchStats;
}

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

/** 하버사인 거리 (m) */
export const distanceMeters = (a: LocationData, b: LocationData): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 중심에서 bearing(도) 방향으로 distance(m) 떨어진 좌표 */
const offsetPoint = (origin: LocationData, distance: number, bearingDeg: number): LocationData => {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const d = distance / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 =
    lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
};

/** 이름 비교용 정규화: 공백/특수문자 제거, 소문자 */
const normalizeName = (name: string) => name.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');

const isSameName = (a: string, b: string) => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const decodeHtml = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 동시 실행 개수를 제한해서 작업 실행 */
async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/** 검색 구역: 중심 전체 + (반경이 크면) 바깥 6방향 + 중심 소구역 */
const buildSearchCells = (center: LocationData, radius: number) => {
  const cells: { location: LocationData; radius: number }[] = [{ location: center, radius }];
  if (radius > 1000) {
    const subRadius = Math.round(radius * 0.5);
    for (let i = 0; i < 6; i++) {
      cells.push({ location: offsetPoint(center, radius * 0.6, i * 60), radius: subRadius });
    }
    cells.push({ location: center, radius: subRadius });
  }
  return cells;
};

// ---------------------------------------------------------------------------
// Google Places
// ---------------------------------------------------------------------------

interface GoogleCellResult {
  places: google.maps.places.PlaceResult[];
  status: google.maps.places.PlacesServiceStatus | null;
}

const nearbySearchAllPages = (
  service: google.maps.places.PlacesService,
  request: google.maps.places.PlaceSearchRequest,
  maxPages: number
): Promise<GoogleCellResult> =>
  new Promise((resolve) => {
    const places: google.maps.places.PlaceResult[] = [];
    let pages = 0;
    let firstStatus: google.maps.places.PlacesServiceStatus | null = null;

    service.nearbySearch(request, (results, status, pagination) => {
      pages++;
      if (firstStatus === null) firstStatus = status;
      const ok = status === google.maps.places.PlacesServiceStatus.OK;
      if (ok && results) places.push(...results);

      if (ok && pagination?.hasNextPage && pages < maxPages) {
        // 다음 페이지 토큰은 발급 후 약 2초 뒤에 유효해진다
        setTimeout(() => pagination.nextPage(), 2000);
      } else {
        resolve({ places, status: firstStatus });
      }
    });
  });

const toGoogleRestaurant = (place: google.maps.places.PlaceResult, center: LocationData): Restaurant => {
  const location = {
    lat: place.geometry?.location?.lat() || 0,
    lng: place.geometry?.location?.lng() || 0,
  };
  return {
    id: place.place_id || '',
    name: place.name || '',
    rating: place.rating || 0,
    priceLevel: place.price_level,
    photos: place.photos?.map((photo) => photo.getUrl({ maxWidth: 400, maxHeight: 400 })),
    vicinity: place.vicinity || '',
    types: place.types || [],
    geometry: { location },
    opening_hours: place.opening_hours,
    user_ratings_total: place.user_ratings_total,
    menu: extractRealMenuInfo(place),
    source: 'google',
    distance: Math.round(distanceMeters(center, location)),
  };
};

interface GoogleSearchResult {
  /** 평점 기준을 통과한 가게 */
  kept: Restaurant[];
  /** 평점 미달로 제외된 가게 (네이버에서 같은 가게가 다시 들어오지 않도록 비교용) */
  rejected: Restaurant[];
}

const searchGoogle = async (center: LocationData, radius: number, target: number): Promise<GoogleSearchResult> => {
  if (typeof window === 'undefined' || !window.google?.maps?.places) {
    throw new Error('Google Maps API가 준비되지 않았습니다.');
  }
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  const found = new Map<string, Restaurant>();
  const rejected = new Map<string, Restaurant>();

  const collect = (places: google.maps.places.PlaceResult[]) => {
    for (const place of places) {
      if (!place.place_id || found.has(place.place_id) || rejected.has(place.place_id)) continue;
      const r = toGoogleRestaurant(place, center);
      if (r.distance !== undefined && r.distance > radius) continue;
      if (!place.rating || place.rating <= MIN_RATING) {
        rejected.set(place.place_id, r);
        continue;
      }
      found.set(place.place_id, r);
    }
  };

  const [first, ...rest] = buildSearchCells(center, radius);

  // 1) 중심 전체 반경 (최대 60개)
  const firstResult = await nearbySearchAllPages(
    service,
    { location: first.location, radius: first.radius, type: 'restaurant' },
    GOOGLE_MAX_PAGES
  );
  const { OK, ZERO_RESULTS } = google.maps.places.PlacesServiceStatus;
  if (firstResult.status !== OK && firstResult.status !== ZERO_RESULTS) {
    throw new Error(`Google 맛집 검색 실패: ${firstResult.status}`);
  }
  collect(firstResult.places);

  // 2) 아직 부족하면 구역을 나눠서 추가 검색 (3개씩 병렬, 충분해지면 중단)
  for (let i = 0; i < rest.length && found.size < target; i += 3) {
    const batch = rest.slice(i, i + 3);
    const results = await Promise.all(
      batch.map((cell) =>
        nearbySearchAllPages(
          service,
          { location: cell.location, radius: cell.radius, type: 'restaurant' },
          GOOGLE_MAX_PAGES
        )
      )
    );
    results.forEach((r) => collect(r.places));
  }

  return {
    kept: Array.from(found.values()).sort((a, b) => b.rating - a.rating),
    rejected: Array.from(rejected.values()),
  };
};

// ---------------------------------------------------------------------------
// 네이버 지역 검색 (프록시 경유)
// ---------------------------------------------------------------------------

interface NaverLocalItem {
  title: string;
  link?: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone?: string;
  mapx: string;
  mapy: string;
}

/** 좌표 → "강남구 역삼동" 같은 동네 이름 (Google Geocoder) */
const reverseGeocodeArea = (location: LocationData): Promise<string | null> =>
  new Promise((resolve) => {
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location, language: 'ko' }, (results, status) => {
        if (status !== google.maps.GeocoderStatus.OK || !results?.length) {
          resolve(null);
          return;
        }
        const pick = (type: string) => {
          for (const result of results) {
            const comp = result.address_components.find((c) => c.types.includes(type));
            if (comp) return comp.long_name;
          }
          return '';
        };
        const dong = pick('sublocality_level_2');
        const gu = pick('sublocality_level_1');
        const city = pick('locality');
        const area = [gu || city, dong].filter(Boolean).join(' ');
        resolve(area || null);
      });
    } catch {
      resolve(null);
    }
  });

const naverLocalSearch = async (query: string): Promise<NaverLocalItem[]> => {
  try {
    const url = `${NAVER_PROXY_URL}/local?query=${encodeURIComponent(query)}&display=5&sort=comment`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
};

/** 네이버 mapx/mapy (WGS84 × 1e7, 구버전은 KATECH) → 위경도 */
const naverItemLocation = (item: NaverLocalItem): LocationData | null => {
  const x = Number(item.mapx);
  const y = Number(item.mapy);
  if (!x || !y) return null;
  const lng = x / 1e7;
  const lat = y / 1e7;
  // 한국 범위가 아니면(구 KATECH 좌표 등) 버린다
  if (lat < 32 || lat > 39.5 || lng < 124 || lng > 132) return null;
  return { lat, lng };
};

const toNaverRestaurant = (item: NaverLocalItem, location: LocationData, center: LocationData): Restaurant => {
  const name = decodeHtml(item.title);
  const categoryParts = (item.category || '')
    .split('>')
    .map((c) => c.trim())
    .filter(Boolean);
  return {
    id: `naver-${item.mapx}-${item.mapy}-${normalizeName(name)}`,
    name,
    rating: 0,
    vicinity: item.roadAddress || item.address || '',
    types: ['restaurant'],
    geometry: { location },
    menu: {
      categories: categoryParts.length ? categoryParts : ['음식점'],
      cuisine_type: [],
      price_range: '정보없음',
      sample_menu: [],
    },
    source: 'naver',
    distance: Math.round(distanceMeters(center, location)),
  };
};

const searchNaver = async (center: LocationData, radius: number): Promise<Restaurant[]> => {
  if (!isNaverSearchEnabled()) return [];

  // 검색 구역 중심들의 동네 이름 수집
  const points = buildSearchCells(center, radius).map((c) => c.location);
  const areaNames = await runLimited(points.map((p) => () => reverseGeocodeArea(p)), 4);
  const areas = Array.from(new Set(areaNames.filter((a): a is string => !!a))).slice(0, NAVER_MAX_AREAS);
  if (areas.length === 0) return [];

  const queries = areas.flatMap((area) => NAVER_KEYWORDS.map((kw) => `${area} ${kw}`));
  // 네이버 API 초당 호출 제한을 고려해 동시 4개 + 약간의 간격
  const itemLists = await runLimited(
    queries.map((q) => async () => {
      const items = await naverLocalSearch(q);
      await sleep(100);
      return items;
    }),
    4
  );

  const found: Restaurant[] = [];
  for (const item of itemLists.flat()) {
    const location = naverItemLocation(item);
    if (!location) continue;
    if (distanceMeters(center, location) > radius) continue;
    const r = toNaverRestaurant(item, location, center);
    const dup = found.some(
      (f) => isSameName(f.name, r.name) && distanceMeters(f.geometry.location, location) < SAME_PLACE_DISTANCE_M
    );
    if (!dup) found.push(r);
  }
  return found;
};

// ---------------------------------------------------------------------------
// 통합
// ---------------------------------------------------------------------------

/**
 * Google + 네이버 결과를 합친다.
 * - 같은 가게(200m 이내 + 이름 일치)는 Google 데이터(사진/평점)를 우선하고 네이버 카테고리만 붙인다.
 * - 네이버에만 있는 가게는 평점/사진 없이 추가된다.
 */
const mergeResults = (googleResult: GoogleSearchResult, naverList: Restaurant[]): Restaurant[] => {
  const googleList = googleResult.kept;
  const isSame = (g: Restaurant, n: Restaurant) =>
    isSameName(g.name, n.name) &&
    distanceMeters(g.geometry.location, n.geometry.location) < SAME_PLACE_DISTANCE_M;

  const naverOnly: Restaurant[] = [];
  for (const n of naverList) {
    // Google 에서 평점 미달로 뺀 가게는 네이버로도 다시 넣지 않는다
    if (googleResult.rejected.some((g) => isSame(g, n))) continue;
    const match = googleList.find((g) => isSame(g, n));
    if (match) {
      const naverCategory = n.menu?.categories?.[0];
      if (match.menu && naverCategory && !match.menu.categories.includes(naverCategory)) {
        match.menu.categories = [naverCategory, ...match.menu.categories.filter((c) => c !== '음식점')];
      }
    } else {
      naverOnly.push(n);
    }
  }
  naverOnly.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return [...googleList, ...naverOnly];
};

export async function searchRestaurants(
  center: LocationData,
  radius: number,
  options: { target?: number } = {}
): Promise<SearchResult> {
  const target = options.target ?? DEFAULT_TARGET;

  let googleError: unknown = null;
  const [googleResult, naverList] = await Promise.all([
    searchGoogle(center, radius, target).catch((err): GoogleSearchResult => {
      googleError = err;
      return { kept: [], rejected: [] };
    }),
    // 네이버는 보조 수단이므로 실패해도 무시
    searchNaver(center, radius).catch((): Restaurant[] => []),
  ]);

  if (googleError && naverList.length === 0) {
    throw googleError instanceof Error ? googleError : new Error(String(googleError));
  }

  const restaurants = mergeResults(googleResult, naverList);
  return {
    restaurants,
    stats: {
      google: googleResult.kept.length,
      naver: restaurants.length - googleResult.kept.length,
      total: restaurants.length,
    },
  };
}
