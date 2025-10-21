/**
 * Location utility functions
 */

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface LocationResult {
  coordinates: LocationCoordinates;
  error?: LocationError;
}

/**
 * Get current user location using Geolocation API
 */
export const getCurrentLocation = (): Promise<LocationResult> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        coordinates: { lat: 0, lng: 0 },
        error: { code: 0, message: 'Geolocation is not supported by this browser.' }
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      (error) => {
        resolve({
          coordinates: { lat: 0, lng: 0 },
          error: {
            code: error.code,
            message: error.message,
          },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm}km`;
};

/**
 * Default coordinates (fallback)
 */
export const DEFAULT_COORDINATES: LocationCoordinates = {
  lat: 28.7041, // New Delhi
  lng: 77.1025,
};
