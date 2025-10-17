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
