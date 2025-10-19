/** Root response */
interface BlinkitProductResponse {
  data: DataItem;
  tracking: TrackingData;
  widget_type: string;
  layout_config: {
    spacing: string;
  };
}

/** Main Product Data Object */
interface DataItem {
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
  stepper_data: {
    size: string;
    state: {
      title: {
        text: string;
      };
    };
  };
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

/** Tracking section */
interface TrackingData {
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

/** Shared Subtypes */
interface ColorData {
  type: string;
  tint: string;
}

interface FontData {
  size: string;
  weight: string;
}

interface ImageData {
  url: string;
}

interface TextStyle {
  text: string;
  color: ColorData;
  font: FontData;
}

interface VariantData extends TextStyle {
  number_of_lines: number;
  suffix_icon: {
    color: ColorData;
    font_size: string;
  };
}

interface CartItem {
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

interface MediaItem {
  media_type: string;
  image: {
    url: string;
    placeholder_color: ColorData;
  };
}

interface ProductBadge {
  type: string;
  label: string;
  text_data: TextStyle;
  bg_color_data: ColorData;
  image_data: ImageData;
  padding: string;
}
