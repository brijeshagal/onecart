// Checkout/Cart Response Types - Based on Blinkit API Response Structure
// This file mirrors the frontend checkout types for backend use

// ==================== Common Types ====================

export interface ColorData {
  type: string;
  tint: string;
}

export interface FontData {
  size: string;
  weight: string;
}

export interface TextData {
  text: string;
  color: ColorData;
  font: FontData;
  is_markdown?: number;
  markdown_version?: number;
  number_of_lines?: number;
}

export interface ImageData {
  url: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  bg_color_hex?: string;
  placeholder_color?: ColorData;
}

export interface IdentityData {
  id: string;
}

export interface LayoutConfig {
  margin_bottom?: number;
  margin_top?: number;
  margin_start?: number;
  margin_end?: number;
  padding?: string;
  padding_top?: number;
  padding_bottom?: number;
  padding_left?: number;
  padding_right?: number;
  background_image?: string;
  sticky?: string;
  elevation?: number;
  top_radius?: number;
  bottom_radius?: number;
  corner_radius?: number;
  border?: {
    width: number;
    colors: ColorData[];
  };
}

// ==================== Serviceability & ETA Types ====================

export interface RainDeviceData {
  signal_value: string;
  reported_at: string;
  longitude: number;
  intensity: string;
  latitude: number;
  device_id: string;
}

export interface SurgeChargeV2 {
  surge_amount: number;
  is_graded_mec_fe_surge_enabled: boolean;
  striked_off_amount: number;
  fe_mec_type: string;
  mov: number;
  picker_mec_type: string;
  source: string;
  rain_device?: RainDeviceData;
  is_mec_picker_surge_enabled: boolean;
  is_cached: boolean;
  checkouts_block_mov: number;
  rain_coverage?: number;
  type: string;
  small_cart_fee: number;
  small_cart_mov: number;
}

export interface ETAComponent {
  duration: number;
  display_duration: number;
  type: 'activity' | 'buffer';
  payload: Record<string, any>;
  name: string;
}

export interface FleetServiceability {
  reopen_time: string | null;
  reason_code: string;
  carrier_property?: {
    available: number;
    name: string;
  };
  serviceable: boolean;
  eta: number;
  type: string;
}

export interface EntityServiceability {
  reopen_time: string | null;
  reason_code: string;
  serviceable: boolean;
  eta: number | null;
  value: string;
  type: string;
  service_id?: number;
}

export interface Serviceability {
  assortment_tags: string[];
  eta_threshold_override: {
    is_override: boolean;
    config: {
      is_enabled: boolean;
      max_eta: number;
    };
    tags: string[] | null;
  };
  overlapping_merchants: Record<string, string[]>;
  surge_charge_v2: SurgeChargeV2;
  near_by_stores: {
    is_enabled: boolean;
    disrupted_merchants: any[] | null;
    primary_merchants: any[] | null;
  };
  serviceability_tags: string[];
  merchants: Record<string, { assortment_tags: string[] }>;
  customer_lat: number;
  disruption_index: {
    picker: number;
    fe_di_with_busy_picker: number;
    fe: number;
  };
  serviceable: boolean;
  batching: {
    is_batching_enabled: boolean;
    store_stress_level: number;
    location_polygon: any;
    handshake_time: number;
  };
  user_priority: {
    score: number;
    tags: string[];
  };
  location_polygon: any;
  eta_override: any;
  is_new_user: boolean;
  total_eta: number;
  fleet_serviceability: FleetServiceability[];
  schedule: {
    is_scheduled: boolean;
    schedule_config: {
      is_enabled: boolean;
      buffer_eta: number;
      time_end_HHMM: number;
      mov: number;
      max_eta: number;
      time_start_HHMM: number;
    };
  };
  user_priority_score: number;
  location_hex: string;
  surge_charge: number;
  customer_lon: number;
  merchant_rank: number;
  computed_eta: number;
  new_user_priority_score: number | null;
  distance: number;
  store_handshake_time: number;
  serviceability_reason: string;
  user_dependency_score: number;
  session_id: string;
  is_batching_enabled: boolean;
  eta: number;
  entity_serviceability: EntityServiceability[];
  components: ETAComponent[];
  union_assortment_tags: any;
}

export interface SlotDetails {
  cashback_amount: number;
  end: number;
  are_all_products_deliverable: any;
  serviceability: Serviceability;
  is_default: boolean;
  start: number;
  slot_type: string;
  capacity_type: string;
  surge_charge_v2: SurgeChargeV2;
  slot_charge: number;
  is_closed: boolean;
}

// ==================== Product/Item Types ====================

export interface ProductCategory {
  name: string;
  level: number | null;
  is_primary: boolean;
  parent_id: number | null;
  type: string | null;
  id: number;
}

export interface RelatedBrand {
  id: number;
  logo: string;
  store_deep_link: string | null;
  aggregator_brand: any;
  display_name: string;
  properties?: any[];
}

export interface ReturnProductConfig {
  eligibility_days: number;
  is_exchange_eligible: boolean;
  is_return_eligible: boolean;
}

export interface EntityAttribute {
  name: string;
  value: string;
  sort_order: number;
  attribute_id: number;
  service_type: string;
  type: string;
  id: number;
}

export interface CartProduct {
  return_product_config: ReturnProductConfig;
  is_forced_oos: boolean;
  type_id: number;
  mrp: number;
  updated_at: number;
  membership_price: any;
  service_tag: string;
  mapping_id: number;
  freedc_threshold: number;
  merchant_type: string;
  sbc_price: number;
  is_gift_wrappable_item: boolean;
  shipment_split_key: string;
  unit: string;
  offer_type: string;
  is_freebie?: boolean;
  discounts: any;
  inventory: number;
  offer_meta: Record<string, boolean>;
  type: {
    id: number;
    name: string;
  };
  price: number;
  inventory_limit_toast_type: string;
  is_membership_enabled: any;
  is_easy_return_eligible: any;
  total_mrp: number;
  quantity: number;
  is_gift_item: any;
  brand: string;
  attribute_group_collection: any;
  png_image_url: string;
  promos: any[];
  image_url_v2: string;
  unavailable_quantity: number;
  is_obd_eligible: boolean;
  merchant_id: number;
  categories: ProductCategory[];
  grofers_price: number;
  total_price: number | string;
  name: string;
  total_mrp_text?: string;
  item_attributes: any[];
  created_at: number;
  is_digital_item: boolean;
  inventory_limit: number;
  allow_wishlist?: boolean;
  product_id: number;
  image_url: string;
  related_brand: RelatedBrand;
  is_beauty_freebie: any;
  gift_ineligible_reason: string;
  group_id: number;
  allow_save_for_later?: boolean;
  services_opted: any;
  additional_info?: {
    is_gift_item: any;
  };
}

export interface ShipmentItem extends CartProduct {
  weight?: number;
  additional_charges: any;
  is_giftable_item?: boolean;
  meta: any;
  food_type?: string;
  attributes: any;
  cart_id: any;
  should_validate_imei: any;
  gifting_details: any;
  themes?: any[];
  combo_composition?: any[];
  group_config?: {
    group_type: string;
  };
  combo_flag?: boolean;
  shipment_id?: string;
  packaging_type: any;
  pharmacy_product_type: any;
  large_image_url?: string;
  brand_code: any;
  is_imported_from_external_source?: boolean;
  total_discount?: number;
  purchase_limit: any;
  cashback_amount: any;
  variant: any;
  entity_attributes?: EntityAttribute[];
  denomination: any;
  enabled_flag?: boolean;
  handling_type?: string;
  is_available: any;
  milestone_id: any;
  ofse_details: any;
  is_auto_add_freebie: any;
  third_party_services: any;
  product_tags?: any[];
  storage_type?: string;
  request_quantity?: number;
  category_hierarchy?: Array<{
    is_leaf: boolean;
    is_primary: boolean;
    type: string;
    id: number;
  }>;
  id?: number;
  model: any;
  order: any;
  is_on_demand: any;
}

// ==================== Bill Details Types ====================

export interface FlatDeliveryChargeAttributes {
  next_construct_delivery_charge: number;
  min_amount: number;
  variation_id: number;
  flat_delivery_charge: number;
  required_amount_for_next_discount: number;
  free_delivery_mov: number;
  striked_off_delivery_charge: number;
  graded_delivery_charge_constructs: Array<{
    max_amount: number;
    delivery_charge: number;
    striked_off_amount: number;
    min_amount: number;
  }>;
}

export interface BillDetails {
  total_items: number;
  bill_total: number;
  total_mrp: number;
  total_cost: number;
  unavailable_items: number;
  available_items: number;
  product_discount: number;
  surge_charge_v2?: SurgeChargeV2;
  slot_charge?: number;
  additional_charge?: number;
  payable_amount?: number;
  freedc_reason?: any;
  delivery_charge?: number;
  is_all_digital_item?: boolean;
  gifting_services_charge?: any;
  gateway_offers?: any;
  reserved_amount_for_payment_method?: number;
  offer_discounts?: any;
  gateway_payable_amount?: any;
  free_delivery_mov?: number;
  non_gateway_offers_order_tags?: any;
  show_delivery_sub_text?: boolean;
  promo_discount?: number;
  bxgy_discounts?: any;
  emi_details?: any;
  z_money_data?: any;
  flat_delivery_charge_attributes?: FlatDeliveryChargeAttributes;
}

// ==================== Shipment Types ====================

export interface ServiceabilityStatus {
  is_checkout_disabled: boolean;
  reason_code: string;
  is_disrupted: boolean;
  next_start_time: any;
}

export interface Shipment {
  eta_callout: any;
  serviceability_status: ServiceabilityStatus;
  is_free_slot_available: boolean;
  bill_details: BillDetails;
  is_earlier_slot_available: boolean;
  are_more_slots_available: boolean;
  merchant_type: string;
  product_ids: number[];
  merchant_id: number;
  slot_details: SlotDetails;
  weight_limit: number;
  checkouts_block_mov: number;
  items: ShipmentItem[];
  depot_id: any;
  split_key: string;
}

// ==================== Widget Types ====================

export interface WidgetTracking {
  widget_meta: {
    custom_data?: Record<string, any>;
    name: string;
    title: string;
    minimum_time_between_impressions?: number;
    variation_id?: any;
    revision_id?: any;
    id?: number | null;
  };
  common_attributes?: Record<string, any>;
  impression_map?: {
    event_name: string;
  };
  click_map?: {
    event_name: string;
  };
  interactions_map?: Record<string, { event_name: string }>;
}

export interface ShipmentWidget {
  tracking: WidgetTracking;
  type: number;
  meta: {
    slot: SlotDetails;
  };
  layout_config: LayoutConfig;
  grid_span: number;
  data: {
    mandatory_product_ids: number[];
    subtitle: string;
    right_header: string;
    title: string;
    left_header: any;
    highlight_text: string;
    action_text: any;
    shipment_icon_uri: string;
    identity: IdentityData;
  };
  identity: IdentityData;
}

export interface ProductWidget {
  tracking: WidgetTracking;
  type: number;
  meta: {
    merchant: {
      id: number;
    };
    product: CartProduct;
  };
  action: {
    default_uri: string;
  };
  data: {
    product_image: ImageData;
    product: CartProduct;
  };
  layout_config: LayoutConfig;
}

export interface CouponWidget {
  tracking: WidgetTracking;
  type: number;
  identity: IdentityData;
  action: {
    default_uri: string;
  };
  grid_span: number;
  data: {
    subtitle: string | null;
    title: string;
    cta_text: string | null;
    disabled: boolean;
    state: string;
    subtitle_no_of_lines: number;
  };
  layout_config: LayoutConfig;
}

export interface BillComponent {
  left_header?: TextData & {
    prefix_icon?: {
      color: ColorData;
      code: string;
    };
  };
  right_header?: TextData;
  tag?: {
    bg_color: ColorData;
    title: TextData;
    size: string;
  };
  layout_config?: LayoutConfig;
  identity: IdentityData;
  info_icon?: {
    tooltip_items: Array<{
      title: TextData;
    }>;
    layout_config: LayoutConfig;
  };
}

export interface BillDetailsWidget {
  type: number;
  grid_span: number;
  tracking: WidgetTracking;
  data: {
    bill_components: BillComponent[];
    footer_text: string;
    total_savings: any;
    is_loading: boolean;
    should_remove_separator: boolean;
  };
  identity: IdentityData;
}

export interface FeedingIndiaWidget {
  type: number;
  grid_span: number;
  tracking: WidgetTracking;
  data: {
    subtitle1_click_action: any;
    is_clickable: boolean;
    snippet_config: {
      bottom_radius: number;
      top_radius: number;
    };
    title: TextData;
    image: ImageData;
    checked_click_action: any;
    button_type: string;
    unchecked_click_action: any;
    is_checked: boolean;
    right_text: TextData;
    subtitle1: TextData & {
      is_clickable: boolean;
    };
    layout_config: LayoutConfig;
    is_container_clickable: boolean;
  };
  identity: IdentityData;
}

export interface TipWidget {
  tracking: WidgetTracking;
  type: number;
  meta: {
    charge_id: number;
  };
  layout_config: LayoutConfig;
  grid_span: number;
  data: {
    sub_header: TextData;
    header: TextData;
    currency: string;
    selected_state: {
      bg_color: ColorData;
      border_color: ColorData;
    };
    pill_buttons: Array<{
      viewindex: number;
      is_selected: boolean;
      text: string;
      image: ImageData;
      currency?: string;
      amount?: number;
      mostTippedAmount: number;
      is_enlarged: boolean;
      type: string;
      textfield?: any;
    }>;
    default_tip_amount: number;
  };
  identity: IdentityData;
}

export interface CancellationPolicyWidget {
  type: number;
  grid_span: number;
  tracking: WidgetTracking;
  data: {
    title: string;
    subtitle: string;
    details: any[];
    snippet_subtitle: TextData;
    snippet_title: TextData;
  };
  identity: IdentityData;
}

export interface AddressCheckoutWidget {
  tracking: WidgetTracking;
  data: {
    right_button_data: any;
    address_subtitle: any;
    address_icon: string;
    address_title: string;
    title: string;
    cta_text: string;
    sub_heading: {
      text: any;
      number_of_lines: number;
    };
    address_cta_text: string;
    disabled_message: string;
    left_image: ImageData;
    disabled: boolean;
    label_id: string;
    location_strip_data: {
      text: TextData;
      show_distance_message: boolean;
      bg_color_hex: string;
    };
    cut_price: number;
    heading: {
      text: string;
    };
    net_price: number;
  };
  meta: {
    address_info: any;
    gift_details: any;
  };
  identity: IdentityData;
  action: {
    default_uri: string;
  };
  grid_span: number;
  type: number;
  layout_config: LayoutConfig;
}

export type CartWidget =
  | ShipmentWidget
  | ProductWidget
  | CouponWidget
  | BillDetailsWidget
  | FeedingIndiaWidget
  | TipWidget
  | CancellationPolicyWidget
  | AddressCheckoutWidget;

// ==================== Template Map Types ====================

export interface TemplateTracking {
  tracking: {
    click_map?: {
      event_name: string;
    };
    interactions_map?: Record<string, { event_name: string }>;
    impression_map?: {
      event_name: string;
    };
  };
}

export interface ProductTemplate extends TemplateTracking {
  data: {
    stepper_data: {
      state: {
        title: {
          text: string;
        };
      };
      size: string;
    };
    elevation?: number;
    name: TextData;
    normal_price: TextData;
    snippet_layout_config?: LayoutConfig;
    mrp: TextData & {
      is_markdown: number;
    };
    image: any;
    visible_card: number;
    variant: TextData;
    show_variant_dropdown: boolean;
    corner_radius?: number;
    show_border: boolean;
    bg_color: ColorData;
    animation_type: string;
    offer_tag: {
      title: any;
    };
    visible_cards: number;
  };
  snippet_type: string;
}

export interface PillTemplate extends TemplateTracking {
  data: {
    selected_pill_data: {
      bg_color: ColorData;
      stroke_color: ColorData;
      title: TextData;
      stroke_width: number;
      padding: string;
      corner_radius: number;
      margin: string;
    };
    unselected_pill_data: {
      bg_color: ColorData;
      stroke_color: ColorData;
      title: TextData;
      stroke_width: number;
      padding: string;
      corner_radius: number;
      margin: string;
    };
  };
  snippet_type: string;
}

export interface TemplateMap {
  single_product_horizontal_bounded: ProductTemplate;
  product: ProductTemplate;
  product_horizontal_bounded: ProductTemplate;
  pill: PillTemplate;
  product_horizontal: ProductTemplate;
}

// ==================== Subscriber Actions ====================

export interface SubscriberAction {
  type: string;
  remove_page_cache?: any;
  update_cart?: {
    cart_request_body: Record<string, any>;
  };
}

export interface Subscribers {
  ON_PROMO_APPLY: any;
  CONFLICTING_OFFER_APPLIED: any;
  GST_DETAILS_SAVED: {
    common_actions: SubscriberAction[];
  };
  ITEM_COUNT_MODIFY: {
    common_actions: SubscriberAction[];
  };
  GST_DETAILS_REMOVED: {
    common_actions: SubscriberAction[];
  };
  APP_FOREGROUND: {
    common_actions: SubscriberAction[];
  };
}

// ==================== Cart Data Types ====================

export interface MerchantStatus {
  is_serviceable: boolean;
  merchant_id: number;
  reason_code: string;
  product_ids: number[];
  assortment_tag: string;
}

export interface KarmaInfo {
  source: string;
  is_abusive: boolean;
  score: number;
  label: string;
}

export interface AdditionalCharge {
  amount: number;
  meta: any;
  charge_id: number;
  name: any;
}

export interface PromoSnackbarDetails {
  rule_set: any[];
}

export interface PharmacyServiceability {
  pharmacist_reopen_time: string;
  rx_picking_time: number;
  central_pharmacist_serviceable: boolean;
  reason_code: string;
  doctor_reopen_time: string;
}

export interface DeliveryInstructions {
  delivery_suggestion: any[];
  is_save_instruction: boolean;
}

export interface GiftingDetails {
  wrap: {
    is_enabled: boolean;
    is_opted: boolean;
    charge: number;
    is_available: boolean;
  };
  card: {
    is_enabled: boolean;
    is_opted: boolean;
    charge: number;
    is_available: boolean;
  };
}

export interface UserDetails {
  order_count_life_time: number;
  employee_flag: boolean;
  is_new_user: boolean;
  is_international_user: boolean;
  segments: string[];
  id: number;
  phone: string;
  live_order_count: number;
  loyalty_score: any;
  gst_number: string;
  cart_rank: number;
  first_checkout_date: string;
}

export interface WalletDetails {
  amount: number;
  is_credit_applied: boolean;
  id: number;
}

export interface PatientContactDetails {
  phone_number: string;
  name: string;
}

export interface CartData {
  cart_type: string;
  address_id: any;
  user_gst_detail: any;
  disabled_payment_modes: any;
  gift_details: any;
  checkout_block_details: any;
  status_code: number;
  slot_details: any;
  updated_at: number;
  is_checked_out: boolean;
  is_gst_opted: boolean;
  rewards: any;
  saved_items_widget_data: any;
  is_free_delivery_offer_applied: boolean;
  snackbar_info_strip: any;
  unavailable_products: any[];
  gift_visibility: any;
  membership_config: any;
  id: number;
  serviceability_location_polygon: {
    status: string;
    city: string;
    name: string;
    locality: string;
    config: {
      dc_type: string;
    };
    active: boolean;
    type: string;
    id: number;
  };
  is_sos: boolean;
  app_client: string;
  user_id: number;
  karma_info: KarmaInfo;
  additional_charges: AdditionalCharge[];
  merchant_details: {
    id: number;
  };
  promo_snackbar_details: PromoSnackbarDetails;
  pharmacy_serviceability: PharmacyServiceability;
  merchant_status: MerchantStatus[];
  available_entities: any[];
  is_festive_offer_applied: any;
  import_z_address_data: any;
  zgold_freedc_offer_details: any;
  is_all_digital_item: boolean;
  delivery_instructions: DeliveryInstructions;
  entry_source: any;
  poi_location_polygon_config: any;
  zgold_freedc_campaign: any;
  app_version: string;
  free_delivery_offer: any;
  parent_checked_out_cart_id: number;
  shipments: Shipment[];
  should_consume_address: boolean;
  meta_info: any;
  tip_suggestions: number[];
  shared_cart_key: any;
  snackbar: {
    data: any;
    ruleset: any[];
  };
  gift_wrapping_merchant_bag_details: {
    images: any;
    merchant_bag_details: any[];
  };
  is_active: boolean;
  gifting_details: GiftingDetails;
  low_consideration_recommendations: any[];
  unavailable_entities: any[];
  patient_contact_details: PatientContactDetails;
  gifting_widget_state: string;
  validations: any[];
  is_all_pharmacy_item: boolean;
  device_id: string;
  pharmacy_cart_prescription: any;
  is_gift: boolean;
  prioritised_oos_recommendations: any;
  address: any;
  cart_flow_type: string;
  cart_properties: any;
  bill_details: BillDetails;
  items: CartProduct[];
  created_at: number;
  wallet_amount: number;
  error_snackbars: any[];
  is_save_tip_selected: boolean;
  user_details: UserDetails;
  gst_applicability_error: string;
  wallet_details: WalletDetails;
  gift_packing_type: any;
  prescription_method_opted: string;
  is_save_fi_donation_selected: boolean;
  promo_details: any;
  cart_source: any;
  cl_id: number;
  gifting_widget_position: string;
}

// ==================== Page Meta Types ====================

export interface PageMeta {
  id: any;
  revision_id: string;
  custom_data: {
    shipments: Array<{
      shipment_value: number;
      slot_amount: number;
      slot_date: string;
      shipment_type: string;
      is_earliest_slot: boolean;
      slot_time: string;
      shipment_id: string;
    }>;
    merchants: Array<{
      serviceability_reason: string;
      is_serviceable: boolean;
      merchant_id: number;
      product_ids: number[];
      assortment_tag: string;
    }>;
    unique_products_in_cart: number;
    items_in_cart: number;
    cart_value: number;
    shipping: number;
    products: Array<{
      name: string;
      type_id: number;
      price: number;
      mrp: number;
      brand_name: string;
      inventory_limit: number;
      currency: string;
      sbc_price: number;
      quantity: number;
      shipment_id: string;
      product_id: number;
    }>;
    total_shipments_in_cart: number;
    current_cart_savings: number;
    total_products_in_cart: number;
  };
  name: string;
  title: string;
}

// ==================== Action Types ====================

export interface TriggerObserversAction {
  type: 'trigger_observers';
  tracking: any;
  data: {
    trigger: string;
  };
}

export type CartAction = TriggerObserversAction;

// ==================== Promo Data Types ====================

export interface PromoData {
  toast_message: any;
  supplementary_charges: any;
  promo_code: any;
  success: boolean;
  promo_value: number;
  promo_type: any;
  promo_applied: boolean;
  discount: number;
  state: string;
  cashback: number;
  items_with_silent_offer: any[];
  custom_message: any;
  promo_cashback_type: any;
  promotion_id: number;
}

// ==================== Main Cart Response Type ====================

export interface CheckoutCartResponse {
  cart_type: string;
  subscribers: Subscribers;
  objects: CartWidget[];
  template_map: TemplateMap;
  page_meta: PageMeta;
  actions: CartAction[];
  cart_data: CartData;
  meta: {
    search_disabled: boolean;
    variation_id: string;
  };
  cart_state: string;
  promo_data: PromoData;
  layout_name: string;
  cart_id: number;
  layout_config: {
    bg_color: string;
    status_bar: {
      bg_color: string;
      theme: string;
    };
  };
  extras: any;
}

// ==================== Utility Types ====================

// Simplified cart item for OneCart internal use
export interface CheckoutItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  mrp: number;
  image_url: string;
  brand: string;
  unit: string;
}

// Simplified checkout summary
export interface CheckoutSummary {
  items: CheckoutItem[];
  total_items: number;
  subtotal: number;
  delivery_charge: number;
  surge_charge: number;
  handling_charge: number;
  total_discount: number;
  grand_total: number;
  eta_minutes: number;
  delivery_address: string;
}

