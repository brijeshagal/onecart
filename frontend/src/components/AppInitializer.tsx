"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useCartStore } from "@/lib/cartStore";
import { apiService } from "@/lib/api";

/**
 * AppInitializer - Fetches user and cart data on app load
 * This component should be mounted in the root layout
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user, setUser, setLoading, selectedAddress, setSelectedAddress } = useAppStore();
  const { fetchCart } = useCartStore();
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
        const userResponse = await apiService.getUserProfile(user.id);

        if (userResponse.success && userResponse.data) {
          console.log("✅ User profile fetched:", userResponse.data);
          setUser(userResponse.data);

          // Fetch active cart for this user
          console.log("🔄 Fetching active cart for user:", userResponse.data.id);
          await fetchCart(userResponse.data.id!);
          console.log("✅ Cart data loaded");
        } else {
          console.error("❌ Failed to fetch user profile:", userResponse.error);
          // Keep the cached user data but mark as potentially stale
        }
      } catch (error) {
        console.error("❌ Error initializing app:", error);
        // Keep cached data on error
      } finally {
        setLoading(false);
      }
    };

    // Run initialization
    initializeApp();
  }, [user?.id]); // Only re-run if user ID changes

  // Ensure selectedAddress is always set to user's default address if not already set
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0 && !selectedAddress) {
      console.log("📍 Setting selectedAddress to user's default address");
      setSelectedAddress(user.addresses[user.defaultAddressIndex || 0]);
    }
  }, [user, selectedAddress, setSelectedAddress]);

  return <>{children}</>;
}

