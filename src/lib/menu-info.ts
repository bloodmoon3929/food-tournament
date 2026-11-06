/// <reference types="google.maps" />
import { MenuInfo } from './types';

/** Google Places types / price_level 에서 카테고리와 가격대를 뽑는다 */
export const extractMenuInfo = (place: google.maps.places.PlaceResult): MenuInfo => {
  const categories: string[] = [];
  const cuisineTypes: string[] = [];
  
  // Google Places types에서만 기본 카테고리 추출 (가상 메뉴 없이)
  if (place.types) {
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
    categories: Array.from(new Set(categories)),
    cuisine_type: Array.from(new Set(cuisineTypes)),
    price_range: priceRange,
    sample_menu: [] // 실제 메뉴가 없으면 빈 배열
  };
};
