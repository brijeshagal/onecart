// Address types (from Blinkit API) - Backend compatible
export interface AddressData {
  id: number;
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

// Social login types - Backend compatible
export interface SocialLogin {
  farcaster?: {
    walletAddress?: string;
    username: string;
    fid: string;
  };
}

// User types - Backend compatible
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
  created_at?: Date;
  updated_at?: Date;
  activeCartIds?: string[];
  previousOrders?: string[];
  receiveOrders?: string[];
  socialLogins?: SocialLogin;
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

// Search Items types - Import from backend cart types
export interface ColorData {
  type: string;
  tint: string;
}

export interface FontData {
  size: string;
  weight: string;
}

export interface ImageData {
  url: string;
}

export interface TextStyle {
  text: string;
  color: ColorData;
  font: FontData;
}

export interface VariantData extends TextStyle {
  number_of_lines: number;
  suffix_icon: {
    color: ColorData;
    font_size: string;
  };
}

export interface CartItem {
  product_id: number;
  merchant_id: number;
  product_name: string;
  quantity: number;
  unavailable_quantity: number;
  price: number;
  mrp: number;
  unit: string;
  inventory: number;
  meta: null | unknown;
  image_url: string;
  group_id: number;
  merchant_type: string;
  eta_identifier: string;
  brand: string;
  display_name: string;
}

export interface MediaItem {
  media_type: string;
  image: {
    url: string;
    placeholder_color: ColorData;
  };
}

export interface ProductBadge {
  type: string;
  label: string;
  text_data: TextStyle;
  bg_color_data: ColorData;
  image_data: ImageData;
  padding: string;
}

export interface StepperDataV2 {
  size: string;
  max_count: number;
  zero_layout_config: {
    style: string;
  };
  non_zero_layout_config: {
    style: string;
  };
  increment_actions: {
    default: StepperAction[];
    count_map: Record<string, StepperAction[]>;
  };
  decrement_actions: {
    default: StepperAction[];
  };
}

export interface StepperAction {
  type: string;
  add_to_cart?: {
    cart_item: CartItem;
  };
  remove_from_cart?: {
    cart_item: CartItem;
    count_type?: string;
  };
  recommendation_action?: RecommendationAction;
}

export interface RecommendationAction {
  snippet_id: {
    id: string;
  };
  actions: RecommendationSubAction[];
}

export type RecommendationSubAction =
  | RemoveRecommendationAction
  | AddRecommendationAction
  | FetchApiAction;

export interface RemoveRecommendationAction {
  interaction_id: string;
  max_trigger_count: number;
  remove_recommendation: {
    snippet_prefix_id_to_remove: string;
    triggered_by_snippet_id?: string;
  };
  type: 'remove_recommendation';
}

export interface AddRecommendationAction {
  interaction_id: string;
  max_trigger_count: number;
  add_recommendation: {
    snippets_to_add: Snippet[];
    snippet_id_to_attach: string;
    conflict_policy: {
      match_config: Record<string, any>;
    };
    prefix_id: string;
  };
  type: 'add_recommendation';
}

export interface FetchApiAction {
  interaction_id: string;
  max_trigger_count: number;
  fetch_api: {
    url: string;
    type: string;
    extra_params: {
      product_id: string;
      product_position: number;
      recipe_keyterms: any[];
      recommendation_type: string;
      send_cart_items: boolean;
    };
    failure_actions: {
      remove_recommendation: {
        snippet_prefix_id_to_remove: string;
      };
      type: 'remove_recommendation';
    }[];
  };
  type: 'fetch_api';
}

export interface Snippet {
  data: {
    items: any;
    bg_color_hex: string;
    bg_color: {
      type: string;
      tint: string;
    };
    identity: {
      id: string;
    };
    container_layout_config: {
      corner_radius: number;
      stroke_color: {
        type: string;
        tint: string;
      };
      stroke_width: number;
    };
    layout_bg_color: string;
    loading_overlay_data: {
      api_request_type: string;
      screen_type: string;
      loading_error_state: string;
      loading_error_overlay_size_type: string;
      bg_color_data: {
        type: string;
        tint: string;
      };
      shimmer_res_id: string;
      corner_radius: number;
    };
  };
  tracking: {
    widget_meta: {
      widget_id: string;
      widget_name: string;
      widget_title: string;
      widget_tracking_id: string;
    };
    impression_map: {
      event_name: string;
    };
    click_map: {
      event_name: string;
    };
    entry_source_map: {
      entry_source_id: string;
      entry_source_name: string;
      entry_source_title: string;
      entry_source_tracking_id: string;
    };
  };
  widget_type: string;
  layout_config: {
    bg_color: string;
    spacing: string;
  };
}

// DataItem (individual product)
export interface SearchItem {
  identity: {
    id: string;
  };
  section_count: number;
  layout_type: string;
  bg_color: ColorData;
  click_action: {
    blinkit_deeplink: {
      url: string;
    };
    type: string;
  };
  image: ImageData;
  name: TextStyle;
  variant: VariantData;
  show_variant_dropdown: boolean;
  normal_price: TextStyle;
  inventory: number;
  merchant_type: string;
  eta_identifier: string;
  stepper_data?: {
    size: string;
    state: {
      title: {
        text: string;
      };
    };
  };
  stepper_data_v2: StepperDataV2;
  eta_tag: {
    title: {
      text: string;
      font: FontData;
    };
    image: ImageData;
  };
  elevation: number;
  corner_radius: number;
  show_border: boolean;
  show_click_action_animation: boolean;
  cta: {
    style: string;
    count_type: string;
  };
  atc_action: {
    add_to_cart: {
      cart_item: CartItem;
    };
    type: string;
  };
  rfc_action: {
    remove_from_cart: {
      cart_item: CartItem;
      count_type: string;
    };
    type: string;
  };
  offer: null | unknown;
  meta: {
    merchant_id: string;
    product_id: string;
  };
  is_sold_out: boolean;
  animation_type: string;
  group_id: number;
  brand_name: TextStyle;
  media_container: {
    items: MediaItem[];
  };
  rating: {
    type: string;
    bar: {
      value: number;
      size: string;
      title: {
        text: string;
        color: ColorData;
        font: FontData;
        is_markdown: number;
      };
      border_color: ColorData;
      star_color: ColorData;
      star_unfilled_color: ColorData;
    };
  };
  display_name: TextStyle;
  ui_config: {
    default_rating_visibility: string;
    default_rating_config: {
      type: string;
      bar: {
        size: string;
        title: TextStyle;
      };
    };
  };
  product_id: string;
  product_badges: ProductBadge[];
}

// Tracking Data
export interface TrackingData {
  widget_meta: {
    widget_id: string;
    widget_name: string;
    widget_title: string;
  };
  impression_map: {
    badge: string | null;
    eta_identifier: string;
    event_name: string;
    inventory: number;
    merchant_id: number;
    merchant_type: string;
    mrp: number;
    overlay_badges: string | null;
    price: number;
    ptype: string | null;
    state: string;
    type_id: number | null;
  };
  click_map: {
    badge: string | null;
    brand: string;
    currency: string;
    eta_identifier: string;
    event_name: string;
    inventory: number;
    l0_category: string;
    l1_category: string;
    l2_category: string;
    merchant_id: number;
    merchant_type: string;
    mrp: number;
    name: string;
    overlay_badges: string | null;
    price: number;
    product_id: string;
    ptype: string | null;
    quantity: number;
    state: string;
    type_id: number | null;
  };
  entry_source_map: {
    entry_source_id: string;
    entry_source_name: string;
    entry_source_position: number;
    entry_source_title: string;
  };
  common_attributes: {
    badge: string;
    brand: string;
    cta_type: string;
    currency: string;
    inventory: number;
    inventory_limit: number | null;
    l0_category: string;
    l1_category: string;
    l2_category: string;
    mrp: number;
    name: string;
    price: number;
    product_id: string;
    product_position: string;
    ptype: string;
    quantity: number;
    rating: string;
    reason: string;
    state: string;
    type_id: number;
    widget_position: number;
    widget_variation_id: string;
  };
  interactions_map: Record<string, { event_name: string }>;
}

// BlinkitProductResponse (root response)
export type BlinkitProductResponse = {
  data: SearchItem;
  tracking: TrackingData;
  widget_type: string;
  layout_config: {
    spacing: string;
  };
}[];

export interface SearchItemsRequest {
  // Location options (at least one required)
  userId?: string;
  receiverUsername?: string;
  presetAddressId?: string;
  newAddress?: UISuggestion;

  // Search query (required)
  query: string;

  // Pagination (optional)
  offset?: number;
  limit?: number;
}

export interface SearchItemsResponse {
  success: boolean;
  data?: BlinkitProductResponse;
  error?: string;
  timestamp?: string;
}

// Cart types
export interface SimplifiedCartItem {
  productId: string;
  identityId: string;
  name: string;
  quantity: number;
  price?: {
    senderCurrencyValue: number;
    receiverCurrencyValue: number;
  };
  addedAt?: Date;
}

export interface AddToCartRequest {
  activeCartId?: string;
  senderUserId: string;
  receiverUserId: string;
  receiveAddress: AddressData;
  items: SimplifiedCartItem[];
  quantity: number;
  totalAmount?: {
    senderCurrencyValue: number;
    receiverCurrencyValue: number;
  };
  paymentMode?: 'cash' | 'card' | 'wallet' | 'upi' | 'bank_transfer';
  orderNotes?: string;
}

export interface AddToCartResponse {
  success: boolean;
  data?: {
    cartId: string;
  };
  error?: string;
  timestamp?: string;
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
  deliveryAddress: UISuggestion | null;
  searchResults: UISuggestion[];

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;
  setDeliveryAddress: (address: UISuggestion | null) => void;
  setSearchResults: (results: UISuggestion[]) => void;
  clearState: () => void;
}

// Form field types
export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "select" | "textarea" | "checkbox";
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

// Export checkout/cart response types
export * from './checkout';
