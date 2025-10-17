// Address data structure from Blinkit API
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
    source: string; // source type
    source_ref_id: string; // refers to user ID
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

// Simplified address structure for our database
export interface UserAddress {
  id?: string;
  name?: string; // Address display name
  address?: string; // Main address details (max 60 chars)
  floor?: string; // Floor information
  landmark?: string; // Landmark information
  phone?: string; // Phone number for this address
  save_as?: string; // Address alias
  latitude?: number | undefined;
  longitude?: number | undefined;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Request/Response types for address operations
export interface CreateAddressRequest {
  name: string;
  address: string;
  floor: string;
  landmark: string;
  phone: string;
  save_as: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string;
}

export interface AddressResponse {
  success: boolean;
  data?: UserAddress;
  error?: string;
}
