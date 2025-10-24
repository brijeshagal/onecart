"use client";

import { apiService } from "@/lib/api";
import { Cart, useCartStore } from "@/lib/cartStore";
import { useAppStore } from "@/lib/store";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useRef } from "react";

/**
 * AppInitializer - Fetches user and cart data on app load
 * This component should be mounted in the root layout
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const {
    user,
    setUser,
    setLoading,
    selectedAddress,
    setSelectedAddress,
    isLoading,
  } = useAppStore();
  const { setCart } = useCartStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeApp = async () => {
      if (!user?.id) {
        console.log("⚠️  No user found in store");
        return;
      }

      setLoading(true);

      try {
        // Fetch latest user profile from backend
        console.log("🔄 Fetching user profile for:", user.id);
        const responseData = await apiService.getUserProfile(user.id);
        if (responseData.success && responseData.data) {
          const userResponse = responseData.data.user;
          console.log("✅ User profile fetched:", userResponse);
          setUser(userResponse);
          setCart(responseData.data.activeCart as Cart);
        }
      } catch (error) {
        console.error("❌ Failed to fetch user profile:", error);
      } finally {
        setLoading(false);
      }
      await sdk.actions.ready();
    };

    // Run initialization
    initializeApp();
  }, [user?.id, setUser, setCart, setLoading]); // Only re-run if user ID changes

  // Ensure selectedAddress is always set to user's default address if not already set
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0 && !selectedAddress) {
      console.log("📍 Setting selectedAddress to user's default address");
      setSelectedAddress(user.addresses[user.defaultAddressIndex || 0]);
    }
  }, [user, selectedAddress, setSelectedAddress]);

  return !isLoading && <>{children}</>;
}
