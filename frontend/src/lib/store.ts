import { AddressData, AppState, User } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Default user data based on backend User type and API documentation
const defaultUser: User = {
  id: "68f74f252122160e209f4c89",
  username: "testuser123",
  email: "test@example.com",
  phone: "+1234567890",
  addresses: [
    {
      id: 123,
      name: "Home",
      label: "Home",
      label_id: "home",
      line1: "123 Main Street",
      line2: "Apartment 4B",
      display_address: "123 Main Street, Apartment 4B",
      landmark: "Near Central Park",
      latitude: 28.4652382,
      longitude: 77.0615957,
      use_corrected_location: false,
      install_ts: "2024-01-01T00:00:00.000Z",
      update_ts: "2024-01-01T00:00:00.000Z",
      corrected_location_info: {
        confidence: "high",
        landmark: "Near Central Park",
        latitude: 28.4652382,
        longitude: 77.0615957,
      },
      location_info: {
        state: "Delhi",
        postal_code: "110001",
        city: "New Delhi",
      },
      address_meta: {
        source: "manual",
        source_ref_id: "address-123",
      },
      location: {
        latitude: 28.4652382,
        longitude: 77.0615957,
      },
      coordinates: {
        lat: 28.4652382,
        lon: 77.0615957,
      },
      address_details_info: {
        tower: "",
        house: "4B",
        floor: "4th Floor",
        phone: "+1234567890",
        landmark: "Near Central Park",
        tags: "home",
        template_id: 1,
        alias_id: 1,
        name: "Home",
      },
    },
  ],
  defaultAddressIndex: 0,
  receiveAddressIndex: 0,
  askBeforeReceiving: true,
  walletAddresses: ["0x1234567890abcdef"],
  farcasterWalletAddress: -1,
  primaryWalletIndex: 0,
  created_at: new Date("2024-01-01T00:00:00.000Z"),
  updated_at: new Date("2024-01-01T00:00:00.000Z"),
  activeCartIds: [],
  previousOrders: [],
  receiveOrders: [],
  socialLogins: {
    farcaster: {
      walletAddress: "0x1234567890abcdef",
      username: "testuser123",
      fid: "123456",
    },
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state with default user data
      user: defaultUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      currentLocation: {
        lat: 28.4652382,
        lng: 77.0615957,
      },
      // Initialize selectedAddress from default user's first address
      selectedAddress:
        defaultUser.addresses[defaultUser.defaultAddressIndex || 0],
      searchResults: [],

      // Actions
      setUser: (user: User | null) => {
        // When user is set, also update selected address from their default address
        const selectedAddress =
          user?.addresses && user.addresses.length > 0
            ? user.addresses[user.defaultAddressIndex || 0]
            : defaultUser.addresses[defaultUser.defaultAddressIndex || 0];
        set({ user, isAuthenticated: !!user, selectedAddress });
      },
      setAuthenticated: (authenticated: boolean) =>
        set({ isAuthenticated: authenticated }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      setCurrentLocation: (location) => set({ currentLocation: location }),
      setSelectedAddress: (address: AddressData) =>
        set({ selectedAddress: address }),
      setSearchResults: (results) => set({ searchResults: results }),

      clearState: () =>
        set({
          user: defaultUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          currentLocation: {
            lat: 28.4652382,
            lng: 77.0615957,
          },
          selectedAddress:
            defaultUser.addresses[defaultUser.defaultAddressIndex || 0],
          searchResults: [],
        }),
    }),
    {
      name: "onecart-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentLocation: state.currentLocation,
        selectedAddress: state.selectedAddress,
      }),
    }
  )
);

// Convenience hooks
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAppStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useCurrentLocation = () =>
  useAppStore((state) => state.currentLocation);
export const useSelectedAddress = () =>
  useAppStore((state) => state.selectedAddress);
export const useSearchResults = () =>
  useAppStore((state) => state.searchResults);
