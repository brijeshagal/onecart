// Address types (from Blinkit API)
export interface AddressData {
  id?: number;
  name: string;
  label: string;
  label_id: string;
  line1: string;
  line2: string;
  display_address: string;
  landmark: string | null;
  latitude: number;
  longitude: number;
  use_corrected_location: boolean;
  install_ts: string;
  update_ts: string;
  corrected_location_info: {
    confidence: string;
    landmark: string;
    latitude: number;
    longitude: number;
  };
  location_info: {
    state: string;
    postal_code: string;
    city: string;
  };
  address_meta: {
    source: string;
    source_ref_id: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  coordinates: {
    lat: number;
    lon: number;
  };
  address_details_info: {
    tower: string;
    house: string;
    floor: string;
    phone: string;
    landmark: string;
    tags: string;
    template_id: number;
    alias_id: number;
    name: string;
  };
  ui_data?: {
    left_image: string;
    distance: string;
    is_share_address_enabled: boolean;
  };
}

// User types
export interface User {
  id?: string;
  username: string;
  email?: string;
  phone: string;
  addresses: AddressData[];
  defaultAddressIndex: number;
  receiveAddressIndex: number;
  askBeforeReceiving: boolean;
  walletAddresses: string[];
  farcasterWalletAddress: number;
  primaryWalletIndex: number;
  activeCartIds?: string[];
  previousOrders?: string[];
  receiveOrders?: string[];
}

export interface SocialLogin {
  farcaster?: {
    walletAddress?: string;
    username: string;
  };
}

export interface RegisterUserRequest {
  socialLogins?: SocialLogin;
  username?: string;
  email?: string;
  phone: string;
  addresses: AddressData[];
  defaultAddressIndex: number;
  receiveAddressIndex: number;
  askBeforeReceiving: boolean;
  walletAddresses: string[];
  farcasterWalletAddress: number;
  primaryWalletIndex: number;
}

export interface RegisterUserResponse {
  success: boolean;
  data?: {
    user: User;
    message: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// Location search types
export interface SearchLocationRequest {
  lat: number;
  lng: number;
  query: string;
}

export interface UISuggestion {
  title: {
    text: string;
    color?: { type: string; tint: string };
    font?: { size: string; weight: string };
  };
  subtitle?: {
    text: string;
    color?: { type: string; tint: string };
    font?: { size: string; weight: string };
  };
  left_image?: {
    url: string;
  };
  meta?: {
    place_id: string;
    session_token: string;
  };
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

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// Store types for Zustand
export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Location state
  currentLocation: { lat: number; lng: number } | null;
  searchResults: UISuggestion[];

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
  setSearchResults: (results: UISuggestion[]) => void;
  clearState: () => void;
}

// Form field types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: RegExp;
    message?: string;
    min?: number;
    max?: number;
  };
}