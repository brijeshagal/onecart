import type {
  AddressData,
  AddToCartRequest,
  CheckoutCartResponse,
  SimplifiedCartItem,
} from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { apiService } from "./api";

export interface Cart {
  cartId: string;
  senderUserId: string;
  receiverUserId: string;
  receiveAddress: AddressData;
  receiverCountryCode?: string;
  items: SimplifiedCartItem[];
  totalItems: number;
  totalAmount?: {
    senderCurrencyValue: number;
    receiverCurrencyValue: number;
  };
  paymentMode?: "cash" | "card" | "wallet" | "upi" | "bank_transfer";
  paymentStatus?: "pending" | "completed" | "failed";
  cartStatus: "open" | "in-progress" | "fulfilled" | "cancelled";
  orderTimestamp: string;
  fulfillmentTimestamp?: string;
  orderNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CartState {
  fetchCartCheckoutDetails: (
    userId: string,
    addressData?: AddressData
  ) => Promise<{ success: boolean; error?: string }>;
  // State
  cart: Cart | null;
  checkoutCart: CheckoutCartResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addToCart: (
    request: Omit<AddToCartRequest, "activeCartId">
  ) => Promise<{ success: boolean; error?: string }>;
  fetchCart: (userId: string) => Promise<void>;
  decrementProductQuantity: (
    userId: string,
    productId: string,
    cartId: string
  ) => Promise<{ success: boolean; error?: string; cart?: Cart }>;
  incrementProductQuantity: (
    userId: string,
    productId: string,
    cartId: string
  ) => Promise<{ success: boolean; error?: string; cart?: Cart }>;
  removeProductFromCart: (
    userId: string,
    productId: string,
    cartId: string
  ) => Promise<{ success: boolean; error?: string; cart?: Cart }>;
  clearCart: (userId: string) => Promise<{ success: boolean; error?: string }>;
  setCart: (cart: Cart | null) => void;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      cart: null,
      checkoutCart: null,
      isLoading: false,
      error: null,

      // Add item to cart
      addToCart: async (request) => {
        set({ isLoading: true, error: null });

        try {
          const currentCart = get().cart;
          const requestWithCartId: AddToCartRequest = {
            ...request,
            activeCartId: currentCart?.cartId,
          };

          const response = await apiService.addToCart(requestWithCartId);

          if (response.success && response.data?.cartId) {
            // Fetch the updated cart from backend
            await get().fetchCart(request.senderUserId);
            set({
              isLoading: false,
              cart: response.data as Cart,
            });
            return { success: true, cart: response.data as Cart };
          } else {
            throw new Error(response.error || "Failed to add to cart");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to add to cart";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch cart from backend
      fetchCart: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.getActiveCart(userId);

          if (response.success && response.data) {
            // If cart exists, set it
            if (response.data.cartId) {
              set({
                cart: response.data as Cart,
                isLoading: false,
                error: null,
              });
            } else {
              // No active cart
              set({ cart: null, isLoading: false });
            }
          } else {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to fetch cart";
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch cart";
          set({ error: errorMessage, isLoading: false });
        }
      },

      fetchCartCheckoutDetails: async (
        userId: string,
        addressData?: AddressData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const cart = get().cart;
          if (!cart) {
            return { success: true, checkoutCart: null };
          }
          const response = await apiService.getCartCheckoutDetails(
            userId,
            cart.cartId,
            addressData ? addressData : cart.receiveAddress
          );

          if (response.success && response.data) {
            set({
              checkoutCart: response.data as CheckoutCartResponse,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(
              typeof response.error === "string"
                ? response.error
                : response.error?.message ||
                  "Failed to fetch cart checkout details"
            );
          }
          return {
            success: true,
            checkoutCart: response.data as CheckoutCartResponse,
          };
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to fetch cart checkout details";
          set({ error: errorMessage, isLoading: false });
          return { success: false, checkoutCart: null, error: errorMessage };
        }
      },

      // Decrement product quantity (removes 1 unit)
      decrementProductQuantity: async (
        userId: string,
        productId: string,
        cartId: string
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.decrementProductQuantity(
            userId,
            productId,
            cartId
          );

          if (response.success) {
            set({ isLoading: false, cart: response.data as Cart });
            return { success: true, cart: response.data as Cart };
          } else {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to decrement quantity";
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to decrement quantity";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Increment product quantity (adds 1 unit)
      incrementProductQuantity: async (
        userId: string,
        productId: string,
        cartId: string
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.incrementProductQuantity(
            userId,
            productId,
            cartId
          );

          if (response.success) {
            set({ isLoading: false, cart: response.data as Cart });
            return { success: true, cart: response.data as Cart };
          } else {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to increment quantity";
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to increment quantity";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Completely remove product from cart
      removeProductFromCart: async (
        userId: string,
        productId: string,
        cartId: string
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.removeProductFromCart(
            userId,
            productId,
            cartId
          );

          if (response.success) {
            set({ isLoading: false, cart: response.data as Cart });
            return { success: true, cart: response.data as Cart };
          } else {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to remove product";
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to remove product";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Clear entire cart
      clearCart: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.clearCart(userId);

          if (response.success) {
            set({ cart: response.data as Cart, isLoading: false });
            return { success: true };
          } else {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to clear cart";
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to clear cart";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Set cart directly (useful for manual updates)
      setCart: (cart) => set({ cart }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: "cart-store",
      partialize: (state) => ({
        cart: state.cart,
      }),
    }
  )
);

// Convenience hooks
export const useCart = () => useCartStore((state) => state.cart);
export const useCheckoutCart = () =>
  useCartStore((state) => state.checkoutCart);
export const useCartLoading = () => useCartStore((state) => state.isLoading);
export const useCartError = () => useCartStore((state) => state.error);

// Actions selector with shallow comparison to prevent infinite loops
export const useCartActions = () =>
  useCartStore(
    useShallow((state) => ({
      addToCart: state.addToCart,
      fetchCart: state.fetchCart,
      fetchCartCheckoutDetails: state.fetchCartCheckoutDetails,
      decrementProductQuantity: state.decrementProductQuantity,
      incrementProductQuantity: state.incrementProductQuantity,
      removeProductFromCart: state.removeProductFromCart,
      clearCart: state.clearCart,
      clearError: state.clearError,
    }))
  );
