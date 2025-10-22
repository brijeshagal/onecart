"use client";

import { AddressModal } from "@/components/AddressModal";
import { Navbar } from "@/components/Navbar";
import { apiService } from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";
import { useAppStore } from "@/lib/store";
import { AddressData, BlinkitProductResponse, SearchItem } from "@/types";
import { useCallback, useEffect, useState } from "react";

export default function SearchItemsPage() {
  const { user, deliveryAddress, setDeliveryAddress } = useAppStore();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<BlinkitProductResponse>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Location state
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    null
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get current location on mount and set default address from store
  useEffect(() => {
    const initialize = async () => {
      // Get current location
      try {
        const result = await getCurrentLocation();
        if (result.coordinates.lat && result.coordinates.lng) {
          setCurrentLocation(result.coordinates);
        }
      } catch (error) {
        console.error("Failed to get current location:", error);
      }

      // Set default address from user's first saved address (from Zustand store)
      if (user?.addresses && user.addresses.length > 0 && !selectedAddress) {
        setSelectedAddress(user.addresses[0]);
      }
    };

    initialize();
  }, [user, selectedAddress]);

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    if (!deliveryAddress) {
      setError("Please select a delivery address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      // Make API request
      const response = await apiService.searchItems({
        query: searchQuery,
        offset: 0,
        limit,
        newAddress: deliveryAddress,
      });

      if (response.success && response.data) {
        console.log("response.data", response.data);
        setItems(response.data || []);
        setTotalItems(response.data?.length || 0);
        setHasMore(false); // No pagination with Blinkit response
        setHasSearched(true);
      } else {
        throw new Error(response.error || "Search failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedAddress, currentLocation, limit]);

  // Load more items
  const handleLoadMore = useCallback(async () => {
    if (!deliveryAddress) return;

    const nextOffset = offset + limit;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.searchItems({
        query: searchQuery,
        offset: nextOffset,
        limit,
        newAddress: deliveryAddress,
      });
      if (response.success && response.data) {
        const responseData = response.data || [];
        setItems((prev) => [...prev, ...responseData]);
        setOffset(nextOffset);
        setHasMore(false); // No pagination with Blinkit response
      } else {
        throw new Error(response.error || "Failed to load more items");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load more";
      setError(errorMessage);
      console.error("Load more error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit, searchQuery, deliveryAddress]);

  // Add to cart handler
  const handleAddToCart = (item: SearchItem) => {
    console.log("Adding to cart:", item);
    // TODO: Implement add to cart functionality
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        showAddress={true}
        selectedAddress={selectedAddress?.display_address}
        addressLabel={selectedAddress?.name}
        onAddressClick={() => setIsAddressModalOpen(true)}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={(address, suggestion) => {
          setSelectedAddress(address);
          if (suggestion) {
            setDeliveryAddress(suggestion);
          }
        }}
        savedAddresses={user?.addresses || []}
        currentLocation={currentLocation || undefined}
      />

      {/* Main Content - Mobile design centered on desktop with white space */}
      <main className="max-w-md mx-auto px-4 py-6 pt-24 border-x border-gray-200 min-h-screen bg-white">
        {/* Search Bar */}
        <div className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="text-gray-900 flex-1 px-4 py-2 border placeholder:text-gray-400 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !deliveryAddress}
            className="cursor-pointer px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-3 border border-red-300 rounded-lg bg-red-50">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {hasSearched ? (
          <>
            <div className="mb-6">
              <p className="text-xs text-gray-600">
                Found{" "}
                <span className="font-medium text-black">{totalItems}</span>{" "}
                items for{" "}
                <span className="font-medium text-black">"{searchQuery}"</span>
              </p>
            </div>

            {items.length > 0 ? (
              <>
                {/* Product Grid - Mobile single column */}
                <div className="space-y-4 mb-8">
                  {items.map(
                    (item) =>
                      // we check for item.tracking as for container widgets we do not have tracking
                      item.tracking && (
                        <div
                          key={item.data.product_id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:border-black transition-colors"
                        >
                          {/* Product Image */}
                          <div className="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center">
                            {item.data.image?.url ? (
                              <img
                                src={item.data.image.url}
                                alt={item.data.name.text}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <div className="text-2xl text-gray-400 mb-2">
                                  □
                                </div>
                                <span className="text-xs text-gray-400">
                                  No image
                                </span>
                              </div>
                            )}
                            {item.data.product_badges &&
                              item.data.product_badges.length > 0 && (
                                <div className="absolute top-2 right-2 bg-black text-white px-2 py-1 rounded text-xs font-semibold">
                                  {item.data.product_badges[0].label}
                                </div>
                              )}
                          </div>

                          {/* Product Info */}
                          <div className="p-3">
                            <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 text-sm">
                              {item.data.display_name?.text || "No name"}
                            </h3>

                            {/* Brand and Variant */}
                            <div className="flex gap-2 mb-2 text-xs">
                              {item.data.brand_name && (
                                <span className="text-gray-500 line-clamp-1">
                                  {item.data.brand_name?.text || "No brand"}
                                </span>
                              )}
                              {item.data.variant && (
                                <span className="text-gray-500 line-clamp-1">
                                  • {item.data.variant?.text || "No variant"}
                                </span>
                              )}
                            </div>

                            {/* Price and Rating */}
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-gray-900 text-sm">
                                {item.data.normal_price?.text || "No price"}
                              </p>
                              {item.data.rating &&
                                item.data.rating.bar.value > 0 && (
                                  <span className="text-xs text-gray-600">
                                    ★ {item.data.rating?.bar?.value.toFixed(1) || 0}
                                  </span>
                                )}
                            </div>

                            {/* Stock Status */}
                            <div className="mb-3">
                              {!item.data.is_sold_out &&
                              item.data.inventory > 0 ? (
                                <span className="text-xs text-gray-600">
                                  In Stock ({item.data.inventory})
                                </span>
                              ) : (
                                <span className="text-xs text-red-600">
                                  Out of Stock
                                </span>
                              )}
                            </div>

                            {/* Add to Cart Button */}
                            <button
                              onClick={() => handleAddToCart(item.data)}
                              disabled={
                                item.data.is_sold_out ||
                                item.data.inventory === 0
                              }
                              className="w-full py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {item.data.stepper_data?.state?.title?.text ||
                                "Add to Cart"}
                            </button>
                          </div>
                        </div>
                      )
                  )}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg text-sm font-medium hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-sm text-gray-600 mb-1">
                  No items found for "{searchQuery}"
                </p>
                <p className="text-xs text-gray-500">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-gray-600 mb-1">
              Start searching for items
            </p>
            <p className="text-xs text-gray-500">
              Select an address and enter a search query above to find products
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
