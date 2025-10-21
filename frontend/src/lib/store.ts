import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AppState } from '@/types';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      currentLocation: null,
      searchResults: [],

      // Actions
      setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (authenticated: boolean) => set({ isAuthenticated: authenticated }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      setCurrentLocation: (location) => set({ currentLocation: location }),
      setSearchResults: (results) => set({ searchResults: results }),

      clearState: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        currentLocation: null,
        searchResults: [],
      }),
    }),
    {
      name: 'onecart-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentLocation: state.currentLocation,
      }),
    }
  )
);

// Convenience hooks
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useCurrentLocation = () => useAppStore((state) => state.currentLocation);
export const useSearchResults = () => useAppStore((state) => state.searchResults);
