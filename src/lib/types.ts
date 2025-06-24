export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  priceLevel?: number;
  photos?: string[];
  vicinity: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
  user_ratings_total?: number;
  menu?: MenuInfo;
  reviews?: Review[];
}

export interface MenuInfo {
  categories: string[];
  popular_items?: string[];
  price_range?: string;
  cuisine_type?: string[];
  sample_menu?: string[]; // 샘플 메뉴 아이템
}

export interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

export interface TournamentRound {
  restaurants: Restaurant[];
  roundNumber: number;
  totalRounds: number;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}