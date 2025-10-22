"use client";

import { apiService } from "@/lib/api";
import { DEFAULT_COORDINATES } from "@/lib/location";
import { AddressData, UISuggestion } from "@/types";
import { useEffect, useRef, useState } from "react";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: AddressData, suggestion?: UISuggestion) => void;
  savedAddresses?: AddressData[];
  currentLocation?: { lat: number; lng: number };
}

export function AddressModal({
  isOpen,
  onClose,
  onSelect,
  savedAddresses = [],
  currentLocation,
}: AddressModalProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to get the best available coordinates
  const getBestCoordinates = () => {
    if (currentLocation) {
      return currentLocation;
    }
    return DEFAULT_COORDINATES;
  };

  // Search for locations when user types
  useEffect(() => {
    if (query.length > 2) {
      setIsSearching(true);
      const searchLocations = async () => {
        try {
          const searchCoords = currentLocation || DEFAULT_COORDINATES;

          const response = await apiService.searchLocation({
            query,
            lat: searchCoords.lat,
            lng: searchCoords.lng,
          });

          if (response.success && response.data) {
            setSuggestions(response.data?.suggestions || []);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Location search error:", error);
        } finally {
          setIsSearching(false);
        }
      };

      const timeoutId = setTimeout(searchLocations, 400); // Debounce
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, currentLocation]);

  const handleSuggestionSelect = (suggestion: UISuggestion) => {
    const coords = getBestCoordinates();

    const address: AddressData = {
      id: Date.now(),
      name: suggestion.title.text,
      label: "Home",
      label_id: "home",
      line1: suggestion.title.text,
      line2: suggestion.subtitle?.text || "",
      display_address: `${suggestion.title.text}${
        suggestion.subtitle?.text ? `, ${suggestion.subtitle.text}` : ""
      }`,
      landmark: null,
      latitude: coords.lat,
      longitude: coords.lng,
      use_corrected_location: false,
      install_ts: new Date().toISOString(),
      update_ts: new Date().toISOString(),
      corrected_location_info: {
        confidence: "high",
        landmark: "",
        latitude: coords.lat,
        longitude: coords.lng,
      },
      location_info: {
        state: "Delhi",
        postal_code: "110001",
        city: "New Delhi",
      },
      address_meta: {
        source: "user",
        source_ref_id: "search_page",
      },
      location: {
        latitude: coords.lat,
        longitude: coords.lng,
      },
      coordinates: {
        lat: coords.lat,
        lon: coords.lng,
      },
      address_details_info: {
        tower: "",
        house: "",
        floor: "",
        phone: "",
        landmark: "",
        tags: "home",
        template_id: 1,
        alias_id: 0,
        name: "Home",
      },
    };

    onSelect(address, suggestion); // Pass both address and suggestion
    setQuery("");
    setShowSuggestions(false);
    onClose();
  };

  const handleSavedAddressSelect = (addr: AddressData) => {
    onSelect(addr);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-80 bg-white">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg max-h-[80vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-black">
            Select Delivery Address
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for your area..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-gray-900 px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black placeholder:text-gray-400"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="cursor-pointer w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <p className="font-medium text-black text-sm">
                    {suggestion.title.text}
                  </p>
                  {suggestion.subtitle && (
                    <p className="text-xs text-gray-600">
                      {suggestion.subtitle.text}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {showSuggestions &&
            suggestions.length === 0 &&
            query.length > 2 &&
            !isSearching && (
              <div className="mt-2 p-3 text-sm text-gray-500 italic border border-gray-200 rounded-lg">
                No results found
              </div>
            )}
        </div>

        {/* Saved Addresses */}
        {!showSuggestions && savedAddresses.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">
              Saved Addresses
            </p>
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handleSavedAddressSelect(addr)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition text-sm"
                >
                  <p className="font-medium text-black">
                    {addr.name || addr.label}
                  </p>
                  <p className="text-gray-600 text-xs line-clamp-2">
                    {addr.display_address}
                  </p>
                  {addr.address_details_info?.floor && (
                    <p className="text-gray-500 text-xs mt-1">
                      Floor: {addr.address_details_info.floor}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {savedAddresses.length === 0 && !showSuggestions && (
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">No saved addresses</p>
              <p className="text-xs text-gray-500">
                Search for your delivery address above
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
