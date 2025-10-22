"use client";

import { apiService } from "@/lib/api";
import { DEFAULT_COORDINATES } from "@/lib/location";
import { AddressData, UISuggestion } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/Input";

interface AddressSearchProps {
  currentLocation: { lat: number; lng: number } | null;
  onAddressAdd: (address: AddressData) => void;
  phone?: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  currentLocation,
  onAddressAdd,
  phone = "",
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<"Home" | "Work" | "Other">(
    "Home"
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to get the best available coordinates
  const getBestCoordinates = () => {
    // If we have current location, use that
    if (currentLocation) {
      return currentLocation;
    }

    // Fallback to default coordinates (New Delhi)
    return DEFAULT_COORDINATES;
  };

  // Search for locations when user types
  useEffect(() => {
    if (query.length > 2) {
      setIsSearching(true);
      const searchLocations = async () => {
        try {
          // Use current location if available, otherwise use default coordinates
          const searchCoords = currentLocation || DEFAULT_COORDINATES;

          const response = await apiService.searchLocation({
            query,
            lat: searchCoords.lat,
            lng: searchCoords.lng,
          });

          console.log(response.data);

          if (response.success && response.data) {
            setSuggestions(response.data.suggestions);
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionSelect = (suggestion: UISuggestion) => {
    const coords = getBestCoordinates();

    const address: AddressData = {
      name: suggestion.title.text,
      label: selectedLabel,
      label_id: selectedLabel.toLowerCase(),
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
        source_ref_id: "user_registration",
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
        phone: phone,
        landmark: "",
        tags: selectedLabel.toLowerCase(),
        template_id: 1,
        alias_id: 0,
        name: selectedLabel,
      },
    };

    onAddressAdd(address);
    setQuery("");
    setShowSuggestions(false);
  };

  // const handleUseCurrentLocation = async () => {
  //   const coords = getBestCoordinates();

  //   const response = await apiService.searchLocation({
  //     query: "",
  //     lat: coords.lat,
  //     lng: coords.lng,
  //   });

  //   console.log(response.data);

  //   if (response.success && response.data) {
  //     setSuggestions(response.data.suggestions);
  //     setShowSuggestions(true);
  //   }
  // };

  return (
    <div className="space-y-4" ref={searchRef}>
      <label className="block text-sm font-medium text-gray-700">
        Delivery Address *
      </label>
      {/* Label Selection */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          {(["Home", "Work", "Other"] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedLabel(label)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLabel === label
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Search for your area..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10 text-gray-400 placeholder:text-gray-400 focus:text-gray-900"
        />

        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.length > 0 ? (
              <div className="space-y-1 p-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-black">
                      {suggestion.title.text}
                    </p>
                    {suggestion.subtitle && (
                      <p className="text-sm text-gray-600">
                        {suggestion.subtitle.text}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : query.length > 2 ? (
              <div className="p-3 text-sm text-gray-500 italic">
                No results found
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Use Current Location Button */}
      {/* Commented for now, to be used later when we have a better way to get the current location */}
      {/* {currentLocation && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          className="w-full"
        >
          📍 Use Current Location
        </Button>
      )} */}
    </div>
  );
};
