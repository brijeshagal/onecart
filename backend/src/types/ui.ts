// UI Types for Blinkit API response
export interface UIColor {
  type: string; // e.g. "black" | "grey"
  tint: string; // e.g. "900" | "700"
}

export interface UIFont {
  size: string; // e.g. "400" | "300"
  weight: string; // e.g. "medium" | "regular"
}

export interface UISuggestionText {
  text: string;
  color: UIColor;
  font: UIFont;
}

export interface UIImage {
  url: string;
}

export interface UISuggestionMeta {
  place_id: string;
  session_token: string;
}

export interface UISuggestion {
  title: UISuggestionText;
  subtitle: UISuggestionText;
  left_image: UIImage;
  meta: UISuggestionMeta;
}

export interface UIData {
  suggestions: UISuggestion[];
}
