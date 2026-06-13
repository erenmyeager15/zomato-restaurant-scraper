export interface ActorInput {
  city?: string;
  searchQueries?: string[];
  categories?: string[];
  minRating?: number;
  maxResults?: number;
  proxyConfiguration?: Record<string, unknown>;
}

export interface RestaurantRecord {
  source: 'zomato';
  searchQuery: string;
  city: string;
  position: number;
  restaurantId: string | null;
  restaurantName: string;
  cuisines: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  costForTwo: string | null;
  priceRange: string | null;
  locality: string | null;
  address: string | null;
  deliveryTime: string | null;
  imageUrl: string | null;
  restaurantUrl: string;
  scrapedAt: string;
}

export interface NormalizedInput {
  city: string;
  citySlug: string;
  searchQueries: string[];
  categories: string[];
  minRating: number;
  maxResults: number;
  proxyConfiguration?: Record<string, unknown>;
}

export interface RawRestaurant {
  restaurantId: string | null;
  restaurantName: string | null;
  cuisines: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  costForTwo: string | null;
  priceRange: string | null;
  locality: string | null;
  address: string | null;
  deliveryTime: string | null;
  imageUrl: string | null;
  restaurantUrl: string | null;
}
