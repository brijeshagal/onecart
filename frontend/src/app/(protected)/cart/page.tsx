"use client";

import { AddressModal } from "@/components/AddressModal";
import { Navbar } from "@/components/Navbar";
import {
  useCart,
  useCartActions,
  useCartLoading,
  useCheckoutCart,
} from "@/lib/cartStore";
import { getCurrentLocation } from "@/lib/location";
import { useAppStore } from "@/lib/store";
import { BillDetailsWidget } from "@/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CartPage() {
  const { user, selectedAddress, setSelectedAddress } = useAppStore();
  const cart = useCart();
  const checkoutCart = useCheckoutCart();
  const {
    decrementProductQuantity,
    incrementProductQuantity,
    removeProductFromCart,
    clearCart,
    fetchCartCheckoutDetails,
  } = useCartActions();
  const isLoading = useCartLoading();

  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Local mutable copy of checkoutCart for UI updates
  const [localCheckoutCart, setLocalCheckoutCart] = useState<any>(null);
  // Sync localCheckoutCart with global checkoutCart
  useEffect(() => {
    if (checkoutCart) {
      setLocalCheckoutCart(JSON.parse(JSON.stringify(checkoutCart)));
    }
  }, [checkoutCart]);

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

  // Fetch cart checkout details on mount and when cart changes
  useEffect(() => {
    if (user?.id && cart?.cartId) {
      fetchCartCheckoutDetails(user.id);
    }
  }, [user?.id, cart?.cartId, fetchCartCheckoutDetails]);

  // Parse checkout data to extract bill details
  const billDetails = useMemo((): {
    subtotal: number;
    deliveryCharge: number;
    surgeCharge: number;
    handlingCharge: number;
    slotCharge: number;
    discount: number;
    total: number;
    payableAmount: number;
  } | null => {
    if (!localCheckoutCart) return null;

    // Use cart_data.bill_details as primary source
    const cartBillDetails = localCheckoutCart.cart_data?.bill_details;
    if (cartBillDetails) {
      return {
        subtotal: cartBillDetails.total_cost || 0,
        deliveryCharge: cartBillDetails.delivery_charge || 0,
        surgeCharge: cartBillDetails.surge_charge_v2?.surge_amount || 0,
        handlingCharge: cartBillDetails.additional_charge || 0,
        slotCharge: cartBillDetails.slot_charge || 0,
        discount: cartBillDetails.product_discount || 0,
        total: cartBillDetails.bill_total || 0,
        payableAmount:
          cartBillDetails.payable_amount || cartBillDetails.bill_total || 0,
      };
    }

    // Fallback to BillDetailsWidget parsing
    const billWidget = localCheckoutCart.objects.find(
      (obj) => obj.type === 118
    ) as BillDetailsWidget | undefined;

    if (!billWidget) {
      return null;
    }

    // Parse bill components from widget
    const components = billWidget.data.bill_components;
    const billData = {
      subtotal: 0,
      deliveryCharge: 0,
      surgeCharge: 0,
      handlingCharge: 0,
      slotCharge: 0,
      discount: 0,
      total: 0,
      payableAmount: 0,
    };

    components.forEach((component) => {
      const id = component.identity.id.toLowerCase();
      const value = parseFloat(
        component.right_header?.text.replace(/[^0-9.-]/g, "") || "0"
      );

      if (id.includes("items_total") || id.includes("subtotal")) {
        billData.subtotal = value;
      } else if (id.includes("delivery_charge")) {
        billData.deliveryCharge = value;
      } else if (id.includes("rain_surge") || id.includes("surge")) {
        billData.surgeCharge = value;
      } else if (id.includes("packaging_charge") || id.includes("handling")) {
        billData.handlingCharge = value;
      } else if (id.includes("slot_charge")) {
        billData.slotCharge = value;
      } else if (id.includes("discount") || id.includes("saving")) {
        billData.discount = Math.abs(value);
      } else if (id.includes("bill_total") || id.includes("grand_total")) {
        billData.total = value;
        billData.payableAmount = value;
      }
    });

    return billData;
  }, [localCheckoutCart]);

  // Calculate ETA from checkout data
  const estimatedDelivery = useMemo(() => {
    if (!localCheckoutCart?.cart_data?.shipments?.[0]) return "10-15 minutes";

    const shipment = localCheckoutCart.cart_data.shipments[0];
    const eta = shipment.slot_details?.serviceability?.eta || 0;

    if (eta > 0) {
      return `${eta} minutes`;
    }

    return "10-15 minutes";
  }, [localCheckoutCart]);

  // Get display items from checkout cart if available, otherwise use cart items
  const displayItems = useMemo(() => {
    if (!localCheckoutCart?.cart_data?.shipments?.[0]?.items) {
      // Fallback to cart items
      return (
        cart?.items?.map((item) => {
          const price = item.price?.senderCurrencyValue || 0;
          return {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: price,
            mrp: price,
            imageUrl: "",
            brand: "",
            unit: "",
            totalPrice: price * item.quantity,
            isFromCheckout: false,
          };
        }) || []
      );
    }

    // Use checkout cart items for accurate data, but merge with cart quantities for real-time updates
    const shipmentItems = localCheckoutCart.cart_data.shipments[0].items;
    const cartItemsMap = new Map(
      cart?.items?.map((item) => [item.productId, item.quantity]) || []
    );

    return shipmentItems
      .map((item) => {
        const productId = item.product_id.toString();
        const cartQuantity = cartItemsMap.get(productId);

        // If item was removed from cart, don't display it
        if (cartQuantity === undefined) {
          return null;
        }

        return {
          productId,
          name: item.name,
          quantity: cartQuantity, // Use cart quantity for real-time updates
          price: item.price,
          mrp: item.mrp,
          imageUrl: item.image_url || item.png_image_url || "",
          brand: item.brand,
          unit: item.unit,
          totalPrice:
            typeof item.total_price === "number"
              ? item.total_price
              : item.price * cartQuantity,
          isFromCheckout: true,
        };
      })
      .filter((item) => item !== null);
  }, [localCheckoutCart, cart?.items]);

  // Get total items count - prioritize cart for real-time updates
  const totalItemsCount = useMemo(() => {
    if (cart?.totalItems) {
      return cart.totalItems;
    }
    if (localCheckoutCart?.cart_data?.bill_details?.total_items) {
      return localCheckoutCart.cart_data.bill_details.total_items;
    }
    return 0;
  }, [cart, localCheckoutCart]);

  // Handle increment quantity
  const handleIncrementQuantity = async (item: any) => {
    if (!user?.id || !cart?.cartId) return;

    setUpdatingItems((prev) => new Set(prev).add(item.productId));

    try {
      await incrementProductQuantity(user.id, item.productId, cart.cartId);

      // Update localCheckoutCart totals
      if (localCheckoutCart?.cart_data?.bill_details) {
        setLocalCheckoutCart((prev: any) => {
          if (!prev) return prev;
          const updated = JSON.parse(JSON.stringify(prev));
          const billDetails = updated.cart_data.bill_details;

          // Add item price to totals
          const itemPrice = item.price || 0;
          billDetails.total_cost = (billDetails.total_cost || 0) + itemPrice;
          billDetails.bill_total = (billDetails.bill_total || 0) + itemPrice;
          billDetails.payable_amount =
            (billDetails.payable_amount || billDetails.bill_total || 0) +
            itemPrice;
          billDetails.total_items = (billDetails.total_items || 0) + 1;

          return updated;
        });
      }

      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.productId);
        return newSet;
      });
    } catch (error) {
      console.error("Error incrementing quantity:", error);
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.productId);
        return newSet;
      });
    }
  };

  // Handle decrement quantity
  const handleDecrementQuantity = async (productId: string, cartId: string) => {
    if (!user?.id) return;

    setUpdatingItems((prev) => new Set(prev).add(productId));

    // Find the item to get its price
    const item = displayItems.find((i) => i.productId === productId);
    const itemPrice = item?.price || 0;

    try {
      await decrementProductQuantity(user.id, productId, cartId);

      // Update localCheckoutCart totals
      if (localCheckoutCart?.cart_data?.bill_details) {
        setLocalCheckoutCart((prev: any) => {
          if (!prev) return prev;
          const updated = JSON.parse(JSON.stringify(prev));
          const billDetails = updated.cart_data.bill_details;

          // Subtract item price from totals
          billDetails.total_cost = Math.max(
            0,
            (billDetails.total_cost || 0) - itemPrice
          );
          billDetails.bill_total = Math.max(
            0,
            (billDetails.bill_total || 0) - itemPrice
          );
          billDetails.payable_amount = Math.max(
            0,
            (billDetails.payable_amount || billDetails.bill_total || 0) -
              itemPrice
          );
          billDetails.total_items = Math.max(
            0,
            (billDetails.total_items || 0) - 1
          );

          return updated;
        });
      }

      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } catch (error) {
      console.error("Error decrementing quantity:", error);
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Handle remove item completely
  const handleRemoveItem = async (productId: string, cartId: string) => {
    if (!user?.id) return;

    if (!window.confirm("Remove this item from cart?")) {
      return;
    }

    // Find the item to get its price and quantity
    const item = displayItems.find((i) => i.productId === productId);
    const itemPrice = item?.price || 0;
    const itemQuantity = item?.quantity || 0;
    const totalItemPrice = itemPrice * itemQuantity;

    try {
      await removeProductFromCart(user.id, productId, cartId);

      // Update localCheckoutCart totals
      if (localCheckoutCart?.cart_data?.bill_details && item) {
        setLocalCheckoutCart((prev: any) => {
          if (!prev) return prev;
          const updated = JSON.parse(JSON.stringify(prev));
          const billDetails = updated.cart_data.bill_details;

          // Subtract total item price from totals
          billDetails.total_cost = Math.max(
            0,
            (billDetails.total_cost || 0) - totalItemPrice
          );
          billDetails.bill_total = Math.max(
            0,
            (billDetails.bill_total || 0) - totalItemPrice
          );
          billDetails.payable_amount = Math.max(
            0,
            (billDetails.payable_amount || billDetails.bill_total || 0) -
              totalItemPrice
          );
          billDetails.total_items = Math.max(
            0,
            (billDetails.total_items || 0) - itemQuantity
          );

          return updated;
        });
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    if (!user?.id) return;

    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    const result = await clearCart(user.id);

    if (!result.success) {
      alert(result.error || "Failed to clear cart");
    }
  };

  // Calculate totals - use checkout data if available, otherwise fallback to cart data
  const pricingInfo = useMemo(() => {
    if (billDetails) {
      return {
        subtotal: billDetails.subtotal,
        deliveryFee: billDetails.deliveryCharge,
        surgeCharge: billDetails.surgeCharge,
        handlingCharge: billDetails.handlingCharge,
        slotCharge: billDetails.slotCharge,
        discount: billDetails.discount,
        total: billDetails.total,
        payableAmount: billDetails.payableAmount,
        isFromCheckout: true,
      };
    }

    // Fallback to simple calculation from cart items
    const subtotal =
      cart?.items?.reduce((sum, item) => {
        return sum + (item.price?.senderCurrencyValue || 0) * item.quantity;
      }, 0) || 0;

    const deliveryFee = subtotal > 0 ? 20 : 0;
    const total = subtotal + deliveryFee;

    return {
      subtotal,
      deliveryFee,
      surgeCharge: 0,
      handlingCharge: 0,
      slotCharge: 0,
      discount: 0,
      total,
      payableAmount: total,
      isFromCheckout: false,
    };
  }, [billDetails, cart?.items]);

  // Handle checkout - Navigate to payment page
  const handleCheckout = () => {
    if (!user?.id || !cart?.cartId || !selectedAddress) {
      alert("Please ensure all details are filled");
      return;
    }

    // Navigate to checkout page
    window.location.href = "/checkout";
  };

  // If no user, redirect to register
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar showCart={false} />
        <div className="pt-16 max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Sign in Required
            </h2>
            <p className="text-gray-600 mb-4">
              Please sign in to view your cart
            </p>
            <Link
              href="/register"
              className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar showCart={false} />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={async (address) => {
          setSelectedAddress(address);
          setIsAddressModalOpen(false);

          // Refetch checkout details with new address since prices vary by location
          if (user?.id && cart?.cartId) {
            console.log(
              "📍 Address changed, refetching checkout details with new location..."
            );
            await fetchCartCheckoutDetails(user.id, address);
          }
        }}
        savedAddresses={user?.addresses || []}
        currentLocation={currentLocation || undefined}
      />

      <div className="pt-16 max-w-md mx-auto pb-32">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-sm text-gray-600 mt-1">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
              </p>
            </div>
            {cart && totalItemsCount > 0 && (
              <button
                onClick={handleClearCart}
                disabled={isLoading}
                className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (!cart || !checkoutCart) && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <p className="text-sm text-gray-600">
                  {!cart ? "Loading cart..." : "Loading checkout details..."}
                </p>
              </div>
            </div>
          )}

          {/* Empty Cart */}
          {!isLoading && (!cart || totalItemsCount === 0) && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 mb-6">
                Add items to your cart to get started
              </p>
              <Link
                href="/search-items"
                className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          )}

          {/* Cart Items */}
          {cart && totalItemsCount > 0 && (
            <div className="space-y-4">
              {/* Delivery Address - Use selectedAddress from global state */}
              {selectedAddress ? (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📍</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Delivery Address
                      </h3>
                      <p className="text-sm text-gray-600 mb-0.5">
                        {selectedAddress.label && (
                          <span className="font-medium text-gray-900">
                            {selectedAddress.label}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedAddress.display_address}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddressModalOpen(true)}
                      className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium shrink-0"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        No Delivery Address Selected
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Please select a delivery address to continue
                      </p>
                      <button
                        onClick={() => setIsAddressModalOpen(true)}
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Select Address
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
                {/* Loading skeleton for items */}
                {isLoading &&
                  !checkoutCart &&
                  cart?.items &&
                  cart.items.length > 0 && (
                    <>
                      {cart.items.map((_, index) => (
                        <div
                          key={`skeleton-${index}`}
                          className="p-4 animate-pulse"
                        >
                          <div className="flex gap-3">
                            {/* Image skeleton */}
                            <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0"></div>
                            {/* Content skeleton */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              <div className="flex gap-2">
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                {/* Actual items */}
                {(!isLoading || checkoutCart) &&
                  displayItems.map((item) => {
                    const isUpdating = updatingItems.has(item.productId);
                    const itemTotal =
                      item.totalPrice || item.price * item.quantity;
                    const itemCheckoutDetails =
                      localCheckoutCart?.cart_data?.shipments?.[0]?.items.find(
                        (i) => i.product_id.toString() === item.productId
                      );
                    const itemPrice = itemCheckoutDetails?.price || item.price;
                    const itemMrp = itemCheckoutDetails?.mrp || item.mrp;
                    const itemBrand = itemCheckoutDetails?.brand || item.brand;
                    const itemUnit = itemCheckoutDetails?.unit || item.unit;
                    const itemQuantity =
                      itemCheckoutDetails?.quantity || item.quantity;
                    const itemTotalPrice =
                      itemCheckoutDetails?.total_price || item.totalPrice;
                    const itemIsFromCheckout = itemCheckoutDetails
                      ? true
                      : false;
                    return (
                      <div
                        key={item.productId}
                        className={`p-4 transition-opacity ${
                          isUpdating ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Product Image */}
                          {item.imageUrl && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                              {item.name}
                            </h3>

                            {/* Brand and Unit */}
                            {(item.brand || item.unit) && (
                              <p className="text-xs text-gray-500 mb-2">
                                {item.brand && <span>{item.brand}</span>}
                                {item.brand && item.unit && <span> • </span>}
                                {item.unit && <span>{item.unit}</span>}
                              </p>
                            )}

                            {/* Quantity and Price */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span>Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>₹{itemPrice.toFixed(2)}</span>
                              {itemMrp > itemPrice && (
                                <span className="text-xs line-through text-gray-400">
                                  ₹{itemMrp.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {/* Item Total and Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-gray-900">
                                  ₹{itemTotal.toFixed(2)}
                                </span>
                                {itemMrp > itemPrice && (
                                  <span className="ml-2 text-xs text-green-600">
                                    Save ₹
                                    {(
                                      (itemMrp - itemPrice) *
                                      itemQuantity
                                    ).toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-black text-white rounded px-2 py-1">
                                  <button
                                    onClick={() =>
                                      handleDecrementQuantity(
                                        item.productId,
                                        cart.cartId
                                      )
                                    }
                                    disabled={isUpdating}
                                    className="cursor-pointer w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span className="text-sm font-bold">−</span>
                                  </button>
                                  <span className="min-w-[24px] text-center text-sm font-semibold">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleIncrementQuantity(item)
                                    }
                                    disabled={isUpdating}
                                    className="cursor-pointer w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span className="text-sm font-bold">+</span>
                                  </button>
                                </div>

                                {/* Remove Button (Trash Icon) */}
                                <button
                                  onClick={() =>
                                    handleRemoveItem(
                                      item.productId,
                                      cart.cartId
                                    )
                                  }
                                  disabled={isUpdating}
                                  className="text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
                                  title="Remove from cart"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Checkout indicator */}
                            {item.isFromCheckout && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>Live pricing</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Order Summary
                  </h3>
                  {!pricingInfo.isFromCheckout && checkoutCart === null && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                      Updating...
                    </span>
                  )}
                </div>

                {/* Loading skeleton for order summary */}
                {isLoading && !checkoutCart && (
                  <div className="space-y-2 mb-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actual order summary */}
                {(!isLoading || checkoutCart) && (
                  <>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">
                          ₹{pricingInfo.subtotal.toFixed(2)}
                        </span>
                      </div>

                      {pricingInfo.discount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-green-600">
                            -₹{pricingInfo.discount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="text-gray-900">
                          {pricingInfo.deliveryFee === 0 ? (
                            <span className="text-green-600 font-medium">
                              FREE
                            </span>
                          ) : (
                            `₹${pricingInfo.deliveryFee.toFixed(2)}`
                          )}
                        </span>
                      </div>

                      {pricingInfo.surgeCharge > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Rain Surge Charge
                          </span>
                          <span className="text-gray-900">
                            ₹{pricingInfo.surgeCharge.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {pricingInfo.slotCharge > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Slot Charge</span>
                          <span className="text-gray-900">
                            ₹{pricingInfo.slotCharge.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {pricingInfo.handlingCharge > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Handling Charge</span>
                          <span className="text-gray-900">
                            ₹{pricingInfo.handlingCharge.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Additional charges from checkout data */}
                      {localCheckoutCart?.cart_data?.bill_details && (
                        <>
                          {localCheckoutCart.cart_data.bill_details
                            .gifting_services_charge &&
                            localCheckoutCart.cart_data.bill_details
                              .gifting_services_charge > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  Gifting Services
                                </span>
                                <span className="text-gray-900">
                                  ₹
                                  {localCheckoutCart.cart_data.bill_details.gifting_services_charge.toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            )}

                          {localCheckoutCart.cart_data.bill_details
                            .payable_amount &&
                            localCheckoutCart.cart_data.bill_details
                              .payable_amount !==
                              localCheckoutCart.cart_data.bill_details
                                .bill_total && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  Payable Amount
                                </span>
                                <span className="text-gray-900">
                                  ₹
                                  {localCheckoutCart.cart_data.bill_details.payable_amount.toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            )}
                        </>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-gray-900">
                          {pricingInfo.payableAmount !== pricingInfo.total
                            ? "Payable Amount"
                            : "Total"}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ₹{pricingInfo.payableAmount.toFixed(2)}
                        </span>
                      </div>

                      {/* Show breakdown if payable amount differs from bill total */}
                      {localCheckoutCart?.cart_data?.bill_details
                        ?.payable_amount &&
                        localCheckoutCart.cart_data.bill_details
                          .payable_amount !==
                          localCheckoutCart.cart_data.bill_details
                            .bill_total && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Final Amount to Pay
                              </span>
                              <span className="text-base font-semibold text-gray-900">
                                ₹
                                {localCheckoutCart.cart_data.bill_details.payable_amount.toFixed(
                                  2
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Pricing source indicator */}
                    {pricingInfo.isFromCheckout && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Final pricing confirmed
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Notes */}
              {cart.orderNotes && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Order Notes
                  </h3>
                  <p className="text-sm text-gray-600">{cart.orderNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Checkout */}
        {cart && totalItemsCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-md mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{pricingInfo.total.toFixed(2)}
                  </p>
                  {!pricingInfo.isFromCheckout && (
                    <p className="text-xs text-gray-500">
                      (Final price may vary)
                    </p>
                  )}
                  {localCheckoutCart?.cart_data?.bill_details?.payable_amount &&
                    localCheckoutCart.cart_data.bill_details.payable_amount !==
                      localCheckoutCart.cart_data.bill_details.bill_total && (
                      <p className="text-xs text-blue-600">
                        Payable: ₹
                        {localCheckoutCart.cart_data.bill_details.payable_amount.toFixed(
                          2
                        )}
                      </p>
                    )}
                </div>
                <button
                  onClick={handleCheckout}
                  className="cursor-pointer px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    isLoading ||
                    isCheckingOut ||
                    !checkoutCart ||
                    !selectedAddress
                  }
                >
                  {isCheckingOut ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                      Processing...
                    </span>
                  ) : !selectedAddress ? (
                    "Select Address"
                  ) : !checkoutCart ? (
                    "Loading..."
                  ) : (
                    "Proceed to Checkout"
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Estimated delivery in {estimatedDelivery}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  <span className="font-semibold">Cancellation Policy:</span>{" "}
                  Orders cannot be cancelled once packed for delivery. In case
                  of unexpected delays, a refund will be provided, if
                  applicable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
