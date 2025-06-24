/// <reference types="google.maps" />
import { Restaurant, LocationData, MenuInfo } from './types';

// 메뉴 정보를 추출하는 헬퍼 함수
const extractMenuInfo = (place: google.maps.places.PlaceResult): MenuInfo => {
  const categories: string[] = [];
  const cuisineTypes: string[] = [];
  const sampleMenu: string[] = [];
  
  if (place.types) {
    // Google Places types에서 음식 카테고리 추출
    const foodTypes = place.types.filter((type: string) => 
      ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bakery',
       'bar', 'night_club', 'pizza', 'chinese_restaurant', 'japanese_restaurant',
       'korean_restaurant', 'mexican_restaurant', 'italian_restaurant', 'fast_food',
       'seafood_restaurant', 'steakhouse', 'sushi_restaurant', 'barbecue_restaurant'
      ].includes(type)
    );
    
    foodTypes.forEach((type: string) => {
      switch(type) {
        case 'cafe': 
          categories.push('카페'); 
          cuisineTypes.push('음료/디저트'); 
          sampleMenu.push('아메리카노', '카페라떼', '크로와상', '마카롱');
          break;
        case 'bakery': 
          categories.push('베이커리'); 
          cuisineTypes.push('빵/디저트'); 
          sampleMenu.push('크루아상', '식빵', '케이크', '도너츠');
          break;
        case 'bar': 
          categories.push('바'); 
          cuisineTypes.push('주류'); 
          sampleMenu.push('맥주', '칵테일', '안주', '사이드 메뉴');
          break;
        case 'pizza': 
          categories.push('피자'); 
          cuisineTypes.push('이탈리안'); 
          sampleMenu.push('페퍼로니 피자', '마르게리타', '하와이안 피자', '파스타');
          break;
        case 'chinese_restaurant': 
          categories.push('중식당'); 
          cuisineTypes.push('중국요리'); 
          sampleMenu.push('짜장면', '탕수육', '고추잡재', '묘기링');
          break;
        case 'japanese_restaurant': 
          categories.push('일식당'); 
          cuisineTypes.push('일본요리'); 
          sampleMenu.push('라멘', '초밥', '타코야키', '우동');
          break;
        case 'korean_restaurant': 
          categories.push('한식당'); 
          cuisineTypes.push('한국요리'); 
          sampleMenu.push('김치찌개', '불고기', '냉면', '비빔밥');
          break;
        case 'mexican_restaurant': 
          categories.push('멕시칸'); 
          cuisineTypes.push('멕시코요리'); 
          sampleMenu.push('타코', '부리또', '엔칠라다', '과카몰리');
          break;
        case 'italian_restaurant': 
          categories.push('이탈리안'); 
          cuisineTypes.push('이탈리아요리'); 
          sampleMenu.push('스파게티', '리조또', '카르보나라', '티라미수');
          break;
        case 'fast_food': 
          categories.push('패스트푸드'); 
          cuisineTypes.push('간편식'); 
          sampleMenu.push('햄버거', '감자튀김', '치킨', '콜라');
          break;
        case 'seafood_restaurant': 
          categories.push('해산물'); 
          cuisineTypes.push('해산물요리'); 
          sampleMenu.push('회', '새우', '건어물', '매운탕');
          break;
        case 'steakhouse': 
          categories.push('스테이크하우스'); 
          cuisineTypes.push('고기요리'); 
          sampleMenu.push('안심 스테이크', '등심 스테이크', '살롱 스테이크', '스테이크 세트');
          break;
        case 'sushi_restaurant': 
          categories.push('스시'); 
          cuisineTypes.push('일본요리'); 
          sampleMenu.push('연어초밥', '우니초밥', '사시미', '오마카세');
          break;
        case 'barbecue_restaurant': 
          categories.push('바베큐'); 
          cuisineTypes.push('고기요리'); 
          sampleMenu.push('삼겹살', '갈비', '목살', '치킨');
          break;
        case 'meal_takeaway': categories.push('테이크아웃'); break;
        case 'meal_delivery': categories.push('배달'); break;
        default: 
          if (type.includes('restaurant')) {
            categories.push('레스토랑');
            sampleMenu.push('오늘의 메뉴', '시그니처 요리', '우리의 인기 메뉴');
          } else if (type.includes('food')) {
            categories.push('음식점');
            sampleMenu.push('맛있는 요리', '오늘의 추천', '인기 메뉴');
          }
      }
    });
  }
  
  // 기본 카테고리가 없으면 '음식점' 추가
  if (categories.length === 0) {
    categories.push('음식점');
    sampleMenu.push('맛있는 요리', '오늘의 추천', '인기 메뉴');
  }
  
  // 가격대 정보
  let priceRange = '정보없음';
  if (place.price_level !== undefined) {
    switch(place.price_level) {
      case 1: priceRange = '저렴함 (₩)'; break;
      case 2: priceRange = '보통 (₩₩)'; break;
      case 3: priceRange = '비쌈 (₩₩₩)'; break;
      case 4: priceRange = '매우 비쌈 (₩₩₩₩)'; break;
    }
  }
  
  return {
    categories: Array.from(new Set(categories)), // 중복 제거
    cuisine_type: Array.from(new Set(cuisineTypes)),
    price_range: priceRange,
    sample_menu: sampleMenu.slice(0, 4) // 최대 4개
  };
};

export class PlacesService {
  private map: google.maps.Map | null = null;
  private service: google.maps.places.PlacesService | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.google) {
      // 더미 맵 엘리먼트를 사용해서 PlacesService 초기화
      const mapDiv = document.createElement('div');
      this.map = new window.google.maps.Map(mapDiv);
      this.service = new window.google.maps.places.PlacesService(this.map);
    }
  }

  async findNearbyRestaurants(
    location: LocationData, 
    radius: number = 2000
  ): Promise<Restaurant[]> {
    return new Promise((resolve, reject) => {
      if (!this.service) {
        reject('Places service not initialized');
        return;
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: 'restaurant',
        keyword: '음식점'
      };

      this.service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const restaurants: Restaurant[] = results
            .filter(place => place.rating && place.rating > 3.5) // 평점 3.5 이상만
            .map(place => {
              const menuInfo = extractMenuInfo(place);
              
              return {
                id: place.place_id || '',
                name: place.name || '',
                rating: place.rating || 0,
                priceLevel: place.price_level,
                photos: place.photos?.map((photo: google.maps.places.PlacePhoto) => 
                  photo.getUrl({ maxWidth: 400, maxHeight: 400 })
                ),
                vicinity: place.vicinity || '',
                types: place.types || [],
                geometry: {
                  location: {
                    lat: place.geometry?.location?.lat() || 0,
                    lng: place.geometry?.location?.lng() || 0
                  }
                },
                opening_hours: place.opening_hours,
                user_ratings_total: place.user_ratings_total,
                menu: menuInfo
              };
            })
            .sort((a: Restaurant, b: Restaurant) => b.rating - a.rating); // 평점 높은 순으로 정렬

          resolve(restaurants);
        } else {
          reject(`Places search failed: ${status}`);
        }
      });
    });
  }

  // 미리보기용 - 음식점 개수만 확인
  async getRestaurantCount(
    location: LocationData, 
    radius: number = 2000
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.service || !window.google) {
        reject('Places service not initialized');
        return;
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: 'restaurant',
        keyword: '음식점'
      };

      this.service.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const count = results.filter((place: google.maps.places.PlaceResult) => place.rating && place.rating > 3.5).length;
          resolve(count);
        } else {
          resolve(0);
        }
      });
    });
  }

  async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.service || !window.google) {
        reject('Places service not initialized');
        return;
      }

      const request = {
        placeId: placeId,
        fields: ['name', 'rating', 'photos', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours']
      };

      this.service.getDetails(request, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(`Place details failed: ${status}`);
        }
      });
    });
  }
}

export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(`Geolocation error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=ko`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject('Failed to load Google Maps API');
    document.head.appendChild(script);
  });
};