import { Restaurant, LocationData, MenuInfo } from './types';

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
    if (typeof google !== 'undefined' && google.maps) {
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

// 개선된 메뉴 정보 추출 함수
const extractEnhancedMenuInfo = (place: google.maps.places.PlaceResult): MenuInfo => {
  const categories: string[] = [];
  const cuisineTypes: string[] = [];
  const sampleMenu: string[] = [];
  
  // 음식점 이름에서 메뉴 힌트 추출
  const name = place.name?.toLowerCase() || '';
  
  if (place.types) {
    // Google Places types에서 음식 카테고리 추출
    const foodTypes = place.types.filter(type => 
      ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bakery',
       'bar', 'night_club', 'pizza', 'chinese_restaurant', 'japanese_restaurant',
       'korean_restaurant', 'mexican_restaurant', 'italian_restaurant', 'fast_food',
       'seafood_restaurant', 'steakhouse', 'sushi_restaurant', 'barbecue_restaurant'
      ].includes(type)
    );
    
    foodTypes.forEach(type => {
      switch(type) {
        case 'cafe': 
          categories.push('카페'); 
          cuisineTypes.push('음료/디저트'); 
          sampleMenu.push('아메리카노', '카페라떼', '크루아상', '티라미수');
          break;
        case 'bakery': 
          categories.push('베이커리'); 
          cuisineTypes.push('빵/디저트'); 
          sampleMenu.push('크루아상', '식빵', '케이크', '도너츠');
          break;
        case 'bar': 
          categories.push('바'); 
          cuisineTypes.push('주류'); 
          sampleMenu.push('맥주', '칵테일', '와인', '안주');
          break;
        case 'pizza': 
          categories.push('피자'); 
          cuisineTypes.push('이탈리안'); 
          sampleMenu.push('페퍼로니 피자', '마르게리타', '하와이안', '고르곤졸라');
          break;
        case 'chinese_restaurant': 
          categories.push('중식당'); 
          cuisineTypes.push('중국요리'); 
          sampleMenu.push('짜장면', '탕수육', '고추잡채', '마파두부');
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
          sampleMenu.push('회', '매운탕', '찜', '구이');
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
          sampleMenu.push('삼겹살', '갈비', '목살', '항정살');
          break;
      }
    });
  }
  
  // 음식점 이름에서 추가 메뉴 정보 추출
  if (name.includes('치킨') || name.includes('chicken')) {
    categories.push('치킨전문점');
    cuisineTypes.push('치킨요리');
    sampleMenu.push('후라이드 치킨', '양념치킨', '간장치킨', '파닭');
  }
  if (name.includes('피자') || name.includes('pizza')) {
    categories.push('피자');
    cuisineTypes.push('이탈리안');
    sampleMenu.push('페퍼로니 피자', '마르게리타', '하와이안', '고르곤졸라');
  }
  if (name.includes('카페') || name.includes('cafe') || name.includes('coffee')) {
    categories.push('카페');
    cuisineTypes.push('음료/디저트');
    sampleMenu.push('아메리카노', '카페라떼', '카푸치노', '디저트');
  }
  if (name.includes('한우') || name.includes('소고기') || name.includes('갈비')) {
    categories.push('한우전문점');
    cuisineTypes.push('고기요리');
    sampleMenu.push('한우갈비', '등심', '안심', '육회');
  }
  if (name.includes('해물') || name.includes('수산') || name.includes('회')) {
    categories.push('해산물');
    cuisineTypes.push('해산물요리');
    sampleMenu.push('회', '매운탕', '찜', '구이');
  }
  if (name.includes('삼겹살') || name.includes('돼지') || name.includes('목살')) {
    categories.push('고기집');
    cuisineTypes.push('고기요리');
    sampleMenu.push('삼겹살', '목살', '항정살', '갈매기살');
  }
  if (name.includes('국수') || name.includes('면') || name.includes('라면')) {
    categories.push('면요리');
    cuisineTypes.push('면류');
    sampleMenu.push('국수', '라면', '냉면', '우동');
  }
  if (name.includes('분식') || name.includes('떡볶이') || name.includes('튀김')) {
    categories.push('분식');
    cuisineTypes.push('분식');
    sampleMenu.push('떡볶이', '순대', '튀김', '김밥');
  }
  if (name.includes('족발') || name.includes('보쌈')) {
    categories.push('족발/보쌈');
    cuisineTypes.push('한국요리');
    sampleMenu.push('족발', '보쌈', '막국수', '냉면');
  }
  if (name.includes('일식') || name.includes('sushi') || name.includes('스시')) {
    categories.push('일식당');
    cuisineTypes.push('일본요리');
    sampleMenu.push('초밥', '사시미', '우동', '돈까스');
  }
  if (name.includes('중국') || name.includes('짜장') || name.includes('탕수육')) {
    categories.push('중식당');
    cuisineTypes.push('중국요리');
    sampleMenu.push('짜장면', '짬뽕', '탕수육', '볶음밥');
  }
  
  // 기본 카테고리가 없으면 레스토랑 타입에 따른 기본 메뉴 설정
  if (categories.length === 0) {
    categories.push('레스토랑');
    // 가격대에 따른 메뉴 추정
    if (place.price_level && place.price_level >= 3) {
      sampleMenu.push('오마카세', '코스요리', '시그니처 메뉴', '특선요리');
      cuisineTypes.push('파인다이닝');
    } else {
      sampleMenu.push('정식', '덮밥', '찌개', '볶음');
      cuisineTypes.push('한국요리');
    }
  }
  
  // 샘플 메뉴가 없으면 기본 메뉴 추가
  if (sampleMenu.length === 0) {
    sampleMenu.push('인기메뉴', '추천요리', '오늘의 특선', '시그니처');
  }
  
  // 가격대 정보
  let priceRange = '정보없음';
  if (place.price_level !== undefined) {
    switch(place.price_level) {
      case 0: priceRange = '무료'; break;
      case 1: priceRange = '저렴함 (₩10,000 이하)'; break;
      case 2: priceRange = '보통 (₩10,000-30,000)'; break;
      case 3: priceRange = '비쌈 (₩30,000-60,000)'; break;
      case 4: priceRange = '매우 비쌈 (₩60,000 이상)'; break;
    }
  }
  
  return {
    categories: [...new Set(categories)], // 중복 제거
    cuisine_type: [...new Set(cuisineTypes)],
    price_range: priceRange,
    sample_menu: [...new Set(sampleMenu)].slice(0, 8) // 중복 제거 후 최대 8개
  };
};

// 리뷰에서 메뉴 정보 추출 (실험적 기능)
const extractMenuFromReviews = (reviews: google.maps.places.PlaceReview[]): string[] => {
  const menuItems: string[] = [];
  const menuPatterns = [
    // 한국음식
    /([가-힣]+)(찌개|국|탕|전|구이|볶음|비빔|냉면|국수|면|밥)/g,
    // 치킨 관련
    /(후라이드|양념|간장|마늘|허니|핫|매운)(치킨|닭)/g,
    // 고기 관련
    /(삼겹|목|항정|갈비|등심|안심)(살|구이)/g,
    // 해산물
    /(광어|연어|참치|새우|오징어|문어)(회|구이|찜)/g,
    // 피자/양식
    /(페퍼로니|마르게리타|하와이안|고르곤졸라)(피자)/g,
    // 파스타
    /(까르보나라|알리오올리오|토마토|크림)(파스타|스파게티)/g
  ];
  
  reviews.forEach(review => {
    const text = review.text || '';
    menuPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        menuItems.push(...matches);
      }
    });
  });
  
  return [...new Set(menuItems)].slice(0, 6); // 중복 제거 후 최대 6개
};

export class EnhancedPlacesService {
  private map: google.maps.Map | null = null;
  private service: google.maps.places.PlacesService | null = null;

  constructor() {
    // 더미 맵 엘리먼트를 사용해서 PlacesService 초기화
    const mapDiv = document.createElement('div');
    this.map = new google.maps.Map(mapDiv);
    this.service = new google.maps.places.PlacesService(this.map);
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

      this.service.nearbySearch(request, async (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const restaurants: Restaurant[] = [];
          
          for (const place of results) {
            if (place.rating && place.rating > 3.5) {
              try {
                // 상세 정보 가져오기 (리뷰 포함)
                const detailedPlace = await this.getPlaceDetails(place.place_id || '');
                
                let menuInfo = extractEnhancedMenuInfo(place);
                
                // 리뷰에서 추가 메뉴 정보 추출
                if (detailedPlace?.reviews) {
                  const reviewMenuItems = extractMenuFromReviews(detailedPlace.reviews);
                  if (reviewMenuItems.length > 0) {
                    // 리뷰에서 찾은 메뉴를 기존 메뉴와 합치기
                    menuInfo.sample_menu = [
                      ...reviewMenuItems.slice(0, 4),
                      ...menuInfo.sample_menu.slice(0, 4)
                    ].slice(0, 8);
                  }
                }
                
                restaurants.push({
                  id: place.place_id || '',
                  name: place.name || '',
                  rating: place.rating || 0,
                  priceLevel: place.price_level,
                  photos: place.photos?.map(photo => 
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
                  menu: menuInfo,
                  reviews: detailedPlace?.reviews?.slice(0, 3).map(review => ({
                    author_name: review.author_name || '',
                    rating: review.rating || 0,
                    text: review.text || '',
                    relative_time_description: review.relative_time_description || ''
                  }))
                });
              } catch (error) {
                // 상세 정보를 가져올 수 없는 경우 기본 정보만 사용
                const menuInfo = extractEnhancedMenuInfo(place);
                
                restaurants.push({
                  id: place.place_id || '',
                  name: place.name || '',
                  rating: place.rating || 0,
                  priceLevel: place.price_level,
                  photos: place.photos?.map(photo => 
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
                });
              }
            }
          }
          
          // 평점 높은 순으로 정렬
          restaurants.sort((a, b) => b.rating - a.rating);
          resolve(restaurants);
        } else {
          reject(`Places search failed: ${status}`);
        }
      });
    });
  }

  async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.service) {
        reject('Places service not initialized');
        return;
      }

      const request = {
        placeId: placeId,
        fields: [
          'name', 'rating', 'photos', 'formatted_address', 
          'formatted_phone_number', 'website', 'opening_hours',
          'price_level', 'types', 'reviews', 'user_ratings_total'
        ]
      };

      this.service.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(`Place details failed: ${status}`);
        }
      });
    });
  }
}
