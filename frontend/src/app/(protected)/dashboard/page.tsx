"use client";

import { AddressModal } from "@/components/AddressModal";
import { BottomNav } from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { useAppStore } from "@/lib/store";
import { useCartActions, useCartStore } from "@/lib/cartStore";
import { getCurrentLocation } from "@/lib/location";
import { apiService } from "@/lib/api";
import {
  BlinkitProductResponse,
  SearchItem,
  SimplifiedCartItem,
  AddToCartRequest,
} from "@/types";
import { useEffect, useState, useCallback } from "react";

export default function DashboardPage() {
  const { user, selectedAddress, setSelectedAddress } = useAppStore();
  const { cart, addToCart: addToCartStore } = useCartStore();
  const { decrementProductQuantity } = useCartActions();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Feed state
  const [feedItems, setFeedItems] = useState<BlinkitProductResponse>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

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

  // Fetch feed when selectedAddress changes
  useEffect(() => {
    const fetchFeed = async () => {
      if (!selectedAddress) return;

      setIsLoadingFeed(true);
      setFeedError(null);

      try {
        const response = await apiService.getFeed({
          lat: selectedAddress.latitude,
          lng: selectedAddress.longitude,
          limit: 50,
          address: selectedAddress,
        });

        if (response.success && response.data) {
          setFeedItems(response.data || []);
        } else {
          throw new Error(
            typeof response.error === "string"
              ? response.error
              : response.error?.message || "Failed to fetch feed"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch feed";
        setFeedError(errorMessage);
        console.error("Feed error:", error);
      } finally {
        setIsLoadingFeed(false);
      }
    };

    fetchFeed();
  }, [selectedAddress]);

  // Add to cart handler
  const handleAddToCart = async (item: SearchItem) => {
    setFeedError(null);

    try {
      const priceText = item.normal_price?.text || "0";
      const price = parseFloat(priceText.replace(/[^\d.]/g, "")) || 0;

      if (!selectedAddress) {
        setFeedError("No delivery address found. Please select an address.");
        return;
      }

      if (!user?.id) {
        setFeedError("User not found. Please log in.");
        return;
      }

      const cartRequest: AddToCartRequest = {
        senderUserId: user.id,
        receiverUserId: user.id,
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

      const result = await addToCartStore(cartRequest);

      if (!result.success) {
        throw new Error(result.error || "Failed to add to cart");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add to cart";
      setFeedError(errorMessage);
      console.error("Add to cart error:", err);
    }
  };

  // Increment item quantity in cart
  const handleIncrementQuantity = async (item: SearchItem) => {
    await handleAddToCart(item);
  };

  // Decrement item quantity in cart
  const handleDecrementQuantity = async (productId: string, cartId: string) => {
    if (!user?.id || !cart?.cartId) {
      setFeedError("User not found. Please log in.");
      return;
    }

    try {
      const result = await decrementProductQuantity(user.id, productId, cartId);

      if (!result.success) {
        throw new Error(result.error || "Failed to decrement quantity");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update cart";
      setFeedError(errorMessage);
      console.error("Update cart error:", err);
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
      <main className="max-w-md mx-auto px-4 pt-24 pb-24 border-x border-gray-200 min-h-screen bg-white">
        {/* No Address Selected Message */}
        {!selectedAddress && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  No Delivery Address Selected
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Please select a delivery address to see available products
                </p>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Select Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed Items */}
        {selectedAddress && (
          <>
            {feedError && (
              <div className="mb-4 p-3 border border-red-300 rounded-lg bg-red-50">
                <p className="text-xs text-red-700">{feedError}</p>
              </div>
            )}

            {isLoadingFeed ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black mb-2"></div>
                <p className="text-xs text-gray-600">Loading products...</p>
              </div>
            ) : feedItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {feedItems.map((item) => {
                  if (!item.data.display_name) return null;
                  const cartQuantity = getItemQuantityInCart(item.data.product_id);
                  return (
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
                            <div className="text-xl text-gray-400 mb-1">□</div>
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
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
                            {item.data.rating && item.data.rating.bar.value > 0 && (
                              <span className="ml-auto text-xs text-gray-600">
                                ★ {item.data.rating.bar.value.toFixed(1)}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Price and Add Button */}
                        <div className="flex items-center justify-between mb-2 mt-auto">
                          <p className="font-bold text-gray-900 text-sm">
                            {item.data.normal_price?.text || "—"}
                          </p>

                          {cart && cartQuantity > 0 ? (
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
                                <span className="text-sm font-bold">−</span>
                              </button>
                              <span className="min-w-[20px] text-center text-xs font-semibold">
                                {cartQuantity}
                              </span>
                              <button
                                onClick={() => handleIncrementQuantity(item.data)}
                                disabled={item.data.is_sold_out}
                                className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="text-sm font-bold">+</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item.data)}
                              disabled={item.data.is_sold_out}
                              className="cursor-pointer px-3 py-1.5 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {item.data.is_sold_out ? "Out" : "Add"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">No products available</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try searching for specific items
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
