"use client";

import { AddressModal } from "@/components/AddressModal";
import { Navbar } from "@/components/Navbar";
import { apiService } from "@/lib/api";
import { useCartActions, useCartStore } from "@/lib/cartStore";
import { getCurrentLocation } from "@/lib/location";
import { useAppStore } from "@/lib/store";
import {
  AddressData,
  AddToCartRequest,
  BlinkitProductResponse,
  SearchItem,
  SimplifiedCartItem,
  UISuggestion,
} from "@/types";
import { useCallback, useEffect, useState } from "react";

export default function SearchItemsPage() {
  const { user, selectedAddress, setSelectedAddress } = useAppStore();
  const { cart, addToCart: addToCartStore } = useCartStore();
  const { removeFromCart } = useCartActions();

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
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Helper function to get item quantity from cart
  const getItemQuantityInCart = useCallback(
    (productId: string): number => {
      if (!cart?.items) return 0;
      const cartItem = cart.items.find((item) => item.productId === productId);
      return cartItem?.quantity || 0;
    },
    [cart?.items]
  );

  // Get current location on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const result = await getCurrentLocation();
        if (result.coordinates.lat && result.coordinates.lng) {
          setCurrentLocation(result.coordinates);
        }
      } catch (error) {
        console.error("Failed to get current location:", error);
      }
    };

    initialize();
  }, []);

  // Helper function to convert AddressData to UISuggestion
  const addressToUISuggestion = useCallback(
    (address: AddressData): UISuggestion => {
      return {
        title: {
          text: address.name || address.label || "Address",
          color: { type: "black", tint: "900" },
          font: { size: "400", weight: "medium" },
        },
        subtitle: {
          text: address.display_address,
          color: { type: "grey", tint: "700" },
          font: { size: "300", weight: "regular" },
        },
        left_image: {
          url: "https://cdn.grofers.com/layout-engine/v2/2025-01/address_other_icon_v4_1/light.png",
        },
        meta: {
          place_id: `address-${address.id}`,
          session_token: `session-${Date.now()}`,
        },
      };
    },
    []
  );

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    if (!selectedAddress) {
      setError("Please select a delivery address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      // Convert selectedAddress to UISuggestion for API call
      const deliveryAddressForAPI = addressToUISuggestion(selectedAddress);

      // Make API request
      const response = await apiService.searchItems({
        query: searchQuery,
        offset: 0,
        limit,
        newAddress: deliveryAddressForAPI,
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
  }, [searchQuery, selectedAddress, limit, addressToUISuggestion]);

  // Load more items
  const handleLoadMore = useCallback(async () => {
    if (!selectedAddress) return;

    const nextOffset = offset + limit;
    setIsLoading(true);
    setError(null);

    try {
      // Convert selectedAddress to UISuggestion for API call
      const deliveryAddressForAPI = addressToUISuggestion(selectedAddress);

      const response = await apiService.searchItems({
        query: searchQuery,
        offset: nextOffset,
        limit,
        newAddress: deliveryAddressForAPI,
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
  }, [offset, limit, searchQuery, selectedAddress, addressToUISuggestion]);

  // Add to cart handler
  const handleAddToCart = async (item: SearchItem) => {
    console.log("Adding to cart:", item);
    setError(null);

    try {
      // Parse price from item.normal_price.text (e.g., "₹42" -> 42)
      const priceText = item.normal_price?.text || "0";
      const price = parseFloat(priceText.replace(/[^\d.]/g, "")) || 0;

      // Use selectedAddress for cart
      if (!selectedAddress) {
        setError("No delivery address found. Please select an address.");
        return;
      }

      if (!user?.id) {
        setError("User not found. Please log in.");
        return;
      }

      const cartRequest: AddToCartRequest = {
        senderUserId: user.id,
        receiverUserId: user.id, // For now, sender = receiver
        receiveAddress: selectedAddress,
        items: [
          {
            productId: item.product_id,
            identityId: item.identity.id,
            name: item.display_name.text,
            quantity: 1,
            price: {
              senderCurrencyValue: price,
              receiverCurrencyValue: price,
            },
          },
        ],
        quantity: 1,
        totalAmount: {
          senderCurrencyValue: price,
          receiverCurrencyValue: price,
        },
      };

      // Use cart store to add item
      const result = await addToCartStore(cartRequest);

      if (result.success) {
        console.log("✅ Item added to cart. Cart items:", cart?.totalItems);
        // TODO: Show success toast message
      } else {
        throw new Error(result.error || "Failed to add to cart");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add to cart";
      setError(errorMessage);
      console.error("Add to cart error:", err);
    }
  };

  // Increment item quantity in cart
  const handleIncrementQuantity = async (item: SearchItem) => {
    // Simply add to cart again - backend will handle incrementing quantity
    await handleAddToCart(item);
  };

  // Decrement item quantity in cart
  const handleDecrementQuantity = async (productId: string, cartId: string) => {
    if (!user?.id || !cart?.cartId) {
      setError("User not found. Please log in.");
      return;
    }

    try {
      const result = await removeFromCart(user.id, productId, cartId);

      if (!result.success) {
        throw new Error(result.error || "Failed to remove from cart");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update cart";
      setError(errorMessage);
      console.error("Update cart error:", err);
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        showAddress={true}
        showCart={true}
        selectedAddress={selectedAddress?.display_address}
        addressLabel={selectedAddress?.name}
        onAddressClick={() => setIsAddressModalOpen(true)}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={(address) => {
          setSelectedAddress(address);
        }}
        savedAddresses={user?.addresses || []}
        currentLocation={currentLocation || undefined}
      />

      {/* Main Content - Mobile design centered on desktop with white space */}
      <main className="max-w-md mx-auto px-4 py-6 pt-24 pb-24 border-x border-gray-200 min-h-screen bg-white">
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
            disabled={isLoading || !selectedAddress}
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
        {isLoading && hasSearched ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
            <p className="text-sm text-gray-600 mb-1">Getting results...</p>
            <p className="text-xs text-gray-500">
              Searching for "{searchQuery}"
            </p>
          </div>
        ) : hasSearched ? (
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
                {/* Product Grid - 2 columns */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {items.map((item) => {
                    const cartQuantity =
                      (cart?.items || ([] as SimplifiedCartItem[])).find(
                        (cartItem) =>
                          cartItem.productId === item.data.product_id
                      )?.quantity || 0;
                    return (
                      item.data.display_name && (
                        <div
                          key={item.data.product_id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:border-black transition-colors flex flex-col"
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
                                <div className="text-xl text-gray-400 mb-1">
                                  □
                                </div>
                                <span className="text-xs text-gray-400">
                                  No image
                                </span>
                              </div>
                            )}
                            {/* {item.data.product_badges &&
                              item.data.product_badges.length > 0 && (
                                <div className="absolute top-1.5 right-1.5 bg-black text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                                  {item.data.product_badges[0].label}
                                </div>
                              )} */}
                          </div>

                          {/* Product Info */}
                          <div className="p-2 flex flex-col flex-1 w-full">
                            <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 text-xs leading-tight">
                              {item.data.display_name?.text || "No name"}
                            </h3>

                            {/* Variant */}
                            {item.data.variant && (
                              <p className="w-full flex items-center justify-between text-xs text-gray-500 line-clamp-1 mb-1">
                                {item.data.variant?.text}

                                {item.data.rating &&
                                  item.data.rating.bar.value > 0 && (
                                    <span className="ml-auto text-xs text-gray-600">
                                      ★ {item.data.rating.bar.value.toFixed(1)}
                                    </span>
                                  )}
                              </p>
                            )}

                            {/* Price and Rating */}
                            <div className="flex items-center justify-between mb-2 mt-auto">
                              <p className="font-bold text-gray-900 text-sm">
                                {item.data.normal_price?.text || "—"}
                              </p>
                              {/* Add to Cart Button or Quantity Stepper */}
                              {cart &&
                                (() => {
                                  const quantityInCart = getItemQuantityInCart(
                                    item.data.product_id
                                  );

                                  if (quantityInCart > 0) {
                                    // Show quantity stepper
                                    return (
                                      <div className="flex items-center gap-2 bg-black text-white rounded px-2 py-1">
                                        <button
                                          onClick={() =>
                                            handleDecrementQuantity(
                                              item.data.product_id,
                                              cart.cartId
                                            )
                                          }
                                          className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
                                        >
                                          <span className="text-sm font-bold">
                                            −
                                          </span>
                                        </button>
                                        <span className="min-w-[20px] text-center text-xs font-semibold">
                                          {quantityInCart}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleIncrementQuantity(item.data)
                                          }
                                          disabled={item.data.is_sold_out}
                                          className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <span className="text-sm font-bold">
                                            +
                                          </span>
                                        </button>
                                      </div>
                                    );
                                  } else {
                                    // Show Add button
                                    return (
                                      <div className="flex items-center justify-center gap-1">
                                        {item.data.is_sold_out ? (
                                          <button
                                            onClick={() =>
                                              handleAddToCart(item.data)
                                            }
                                            disabled={item.data.is_sold_out}
                                            className="cursor-pointer px-3 py-1.5 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                          >
                                            Out of Stock
                                          </button>
                                        ) : cartQuantity > 0 && cart ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() =>
                                                handleDecrementQuantity(
                                                  item.data.product_id,
                                                  cart.cartId
                                                )
                                              }
                                              className="cursor-pointer"
                                            >
                                              -
                                            </button>
                                            <span>{cartQuantity}</span>
                                            <button
                                              onClick={() =>
                                                handleIncrementQuantity(
                                                  item.data
                                                )
                                              }
                                              className="cursor-pointer"
                                            >
                                              +
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              handleAddToCart(item.data)
                                            }
                                            disabled={item.data.is_sold_out}
                                            className="cursor-pointer px-3 py-1.5 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                          >
                                            Add
                                          </button>
                                        )}
                                      </div>
                                    );
                                  }
                                })()}
                            </div>
                          </div>
                        </div>
                      )
                    );
                  })}
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
