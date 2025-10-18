import { UISuggestion } from './ui';

// API Request/Response types
export interface SearchLocationRequest {
  lat: number;
  lng: number;
  query: string;
}

export interface SearchLocationResponse {
  success: boolean;
  data?: {
    suggestions: UISuggestion[];
    query: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  error?: string;
  timestamp?: string;
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Feed API types
export interface FeedRequest {
  lat: number;
  lng: number;
  offset?: number;
  limit?: number;
}

// TODO: Add FeedProduct and FeedSection interfaces when implementing actual Blinkit integration

// Search Items API types
export interface SearchItemsRequest {
  // Location options (at least one required)
  userId?: string; // optional: used to fetch user and resolve addresses
  receiverUsername?: string;
  lat?: number;
  lng?: number;
  presetAddressId?: string;
  newAddress?: {
    name: string;
    address: string;
    floor?: string;
    landmark?: string;
    phone: string;
    saveAs: string;
  };

  // Search query (required)
  query: string;

  // Pagination (optional)
  offset?: number;
  limit?: number;
}

export interface SearchItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  inStock: boolean;
  rating?: number;
  discount?: number;
}

export interface SearchItemsResponse {
  success: boolean;
  data?: {
    items: SearchItem[];
    searchQuery: string;
    pagination: {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  error?: string;
  timestamp?: string;
}

export interface FeedResponse {
  success: boolean;
  data?: {
    sections: any[]; // TODO: Replace with proper FeedSection[] when implementing actual structure
    location: {
      lat: number;
      lng: number;
      city?: string;
    };
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
  error?: string;
  timestamp?: string;
}
