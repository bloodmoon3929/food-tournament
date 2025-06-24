import { Restaurant, LocationData, MenuInfo } from './types';

// 실제 구글 메뉴 정보만 추출하는 함수
const extractRealMenuInfo = (place: google.maps.places.PlaceResult): MenuInfo => {
  const categories: string[] = [];
  const cuisineTypes: string[] = [];
  
  // Google Places types에서만 기본 카테고리 추출 (가상 메뉴 없이)
  if (place.types) {
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
          break;
        case 'bakery': 
          categories.push('베이커리'); 
          cuisineTypes.push('빵/디저트'); 
          break;
        case 'bar': 
          categories.push('바'); 
          cuisineTypes.push('주류'); 
          break;
        case 'pizza': 
          categories.push('피자'); 
          cuisineTypes.push('이탈리안'); 
          break;
        case 'chinese_restaurant': 
          categories.push('중식당'); 
          cuisineTypes.push('중국요리'); 
          break;
        case 'japanese_restaurant': 
          categories.push('일식당'); 
          cuisineTypes.push('일본요리'); 
          break;
        case 'korean_restaurant': 
          categories.push('한식당'); 
          cuisineTypes.push('한국요리'); 
          break;
        case 'mexican_restaurant': 
          categories.push('멕시칸'); 
          cuisineTypes.push('멕시코요리'); 
          break;
        case 'italian_restaurant': 
          categories.push('이탈리안'); 
          cuisineTypes.push('이탈리아요리'); 
          break;
        case 'fast_food': 
          categories.push('패스트푸드'); 
          cuisineTypes.push('간편식'); 
          break;
        case 'seafood_restaurant': 
          categories.push('해산물'); 
          cuisineTypes.push('해산물요리'); 
          break;
        case 'steakhouse': 
          categories.push('스테이크하우스'); 
          cuisineTypes.push('고기요리'); 
          break;
        case 'sushi_restaurant': 
          categories.push('스시'); 
          cuisineTypes.push('일본요리'); 
          break;
        case 'barbecue_restaurant': 
          categories.push('바베큐'); 
          cuisineTypes.push('고기요리'); 
          break;
        case 'meal_takeaway': categories.push('테이크아웃'); break;
        case 'meal_delivery': categories.push('배달'); break;
      }
    });
  }
  
  // 기본 카테고리가 없으면 '레스토랑' 추가
  if (categories.length === 0) {
    categories.push('레스토랑');
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
    categories: [...new Set(categories)],
    cuisine_type: [...new Set(cuisineTypes)],
    price_range: priceRange,
    sample_menu: [] // 실제 메뉴가 없으면 빈 배열
  };
};

export class RealMenuPlacesService {
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
                // 상세 정보 가져오기 (실제 메뉴 포함)
                const detailedPlace = await this.getPlaceDetailsWithMenu(place.place_id || '');
                
                let menuInfo = extractRealMenuInfo(place);
                
                // 실제 구글에서 제공하는 메뉴 정보가 있다면 사용
                if (detailedPlace?.menu) {
                  menuInfo.sample_menu = detailedPlace.menu.sections?.flatMap(section => 
                    section.items?.map(item => item.name) || []
                  ) || [];
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
                const menuInfo = extractRealMenuInfo(place);
                
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

  async getPlaceDetailsWithMenu(placeId: string): Promise<any> {
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
          'price_level', 'types', 'reviews', 'user_ratings_total',
          'editorial_summary', 'menu'  // 메뉴 정보 요청
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

  // 미리보기용 - 음식점 개수만 확인
  async getRestaurantCount(
    location: LocationData, 
    radius: number = 2000
  ): Promise<number> {
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
          const count = results.filter(place => place.rating && place.rating > 3.5).length;
          resolve(count);
        } else {
          resolve(0);
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
