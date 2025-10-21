'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiService } from '@/lib/api';
import { getCurrentLocation } from '@/lib/location';
import { AddressData, RegisterUserRequest } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { isLoading, setLoading, setError, setUser } = useAppStore();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<RegisterUserRequest>>({
    username: '',
    email: '',
    phone: '',
    addresses: [],
    defaultAddressIndex: -1,
    receiveAddressIndex: -1,
    askBeforeReceiving: true,
    walletAddresses: [],
    farcasterWalletAddress: -1,
    primaryWalletIndex: -1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

  // Get current location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const result = await getCurrentLocation();
        if (result.coordinates.lat && result.coordinates.lng) {
          setCurrentLocation(result.coordinates);
        }
      } catch (error) {
        console.error('Failed to get location:', error);
      }
    };
    getLocation();
  }, []);

  // Search locations when user types
  useEffect(() => {
    if (locationSearchQuery.length > 2 && currentLocation) {
      const searchLocations = async () => {
        try {
          const response = await apiService.searchLocation({
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            query: locationSearchQuery,
          });
          if (response.success && response.data) {
            setLocationSuggestions(response.data.suggestions);
          }
        } catch (error) {
          console.error('Location search error:', error);
        }
      };
      searchLocations();
    } else {
      setLocationSuggestions([]);
    }
  }, [locationSearchQuery, currentLocation]);

  const handleInputChange = (field: keyof RegisterUserRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.addresses || formData.addresses.length === 0) {
      newErrors.addresses = 'At least one address is required';
    }
    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.registerUser(formData as RegisterUserRequest);

      if (response.success && response.data) {
        setUser(response.data.user);
        router.push('/');
      } else {
        setError(response.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const addAddress = (suggestion?: any) => {
    let address: AddressData;

    if (suggestion) {
      // Use selected location suggestion
      address = {
        name: suggestion.title.text,
        label: 'Home',
        label_id: 'home',
        line1: suggestion.title.text,
        line2: suggestion.subtitle?.text || '',
        display_address: `${suggestion.title.text}${suggestion.subtitle?.text ? `, ${suggestion.subtitle.text}` : ''}`,
        landmark: null,
        latitude: currentLocation?.lat || 0,
        longitude: currentLocation?.lng || 0,
        use_corrected_location: false,
        install_ts: new Date().toISOString(),
        update_ts: new Date().toISOString(),
        corrected_location_info: {
          confidence: 'high',
          landmark: '',
          latitude: currentLocation?.lat || 0,
          longitude: currentLocation?.lng || 0,
        },
        location_info: {
          state: 'Delhi',
          postal_code: '110001',
          city: 'New Delhi',
        },
        address_meta: {
          source: 'user',
          source_ref_id: 'user_registration',
        },
        location: {
          latitude: currentLocation?.lat || 0,
          longitude: currentLocation?.lng || 0,
        },
        coordinates: {
          lat: currentLocation?.lat || 0,
          lon: currentLocation?.lng || 0,
        },
        address_details_info: {
          tower: '',
          house: '',
          floor: '',
          phone: formData.phone || '',
          landmark: '',
          tags: 'home',
          template_id: 1,
          alias_id: 0,
          name: 'Home',
        },
      };
    } else {
      // Create default address
      address = {
        name: 'Home',
        label: 'Home',
        label_id: 'home',
        line1: 'Enter your address',
        line2: '',
        display_address: 'Enter your address',
        landmark: null,
        latitude: currentLocation?.lat || 28.7041,
        longitude: currentLocation?.lng || 77.1025,
        use_corrected_location: false,
        install_ts: new Date().toISOString(),
        update_ts: new Date().toISOString(),
        corrected_location_info: {
          confidence: 'high',
          landmark: '',
          latitude: currentLocation?.lat || 28.7041,
          longitude: currentLocation?.lng || 77.1025,
        },
        location_info: {
          state: 'Delhi',
          postal_code: '110001',
          city: 'New Delhi',
        },
        address_meta: {
          source: 'user',
          source_ref_id: 'user_registration',
        },
        location: {
          latitude: currentLocation?.lat || 28.7041,
          longitude: currentLocation?.lng || 77.1025,
        },
        coordinates: {
          lat: currentLocation?.lat || 28.7041,
          lon: currentLocation?.lng || 77.1025,
        },
        address_details_info: {
          tower: '',
          house: '',
          floor: '',
          phone: formData.phone || '',
          landmark: '',
          tags: 'home',
          template_id: 1,
          alias_id: 0,
          name: 'Home',
        },
      };
    }

    setFormData(prev => ({
      ...prev,
      addresses: [...(prev.addresses || []), address],
      defaultAddressIndex: prev.addresses ? prev.addresses.length : 0,
      receiveAddressIndex: prev.addresses ? prev.addresses.length : 0,
    }));

    setIsLocationSearchOpen(false);
    setLocationSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black mb-2">Create Account</h1>
          <p className="text-gray-600">Join OneCart for seamless deliveries</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username (optional)"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-colors"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-colors"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <input
              type="tel"
              placeholder="Phone number *"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-colors"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Delivery Address *
            </label>

            {formData.addresses && formData.addresses.length > 0 ? (
              <div className="space-y-2">
                {formData.addresses.map((address, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <p className="font-medium text-black">{address.name}</p>
                    <p className="text-sm text-gray-600">{address.display_address}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No address added yet</p>
            )}

            <button
              type="button"
              onClick={() => setIsLocationSearchOpen(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-black hover:text-black transition-colors"
            >
              + Add Address
            </button>

            {errors.addresses && (
              <p className="text-sm text-red-600">{errors.addresses}</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.askBeforeReceiving}
              onChange={(e) => handleInputChange('askBeforeReceiving', e.target.checked)}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <label className="text-sm text-gray-700">
              Ask before receiving deliveries
            </label>
          </div>

          {/* Error Message */}
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.form}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Location Search Modal */}
      {isLocationSearchOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Search Location</h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search for your area..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            {/* Suggestions */}
            <div className="max-h-48 overflow-y-auto mb-4">
              {locationSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addAddress(suggestion)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-medium text-black">{suggestion.title.text}</p>
                      {suggestion.subtitle && (
                        <p className="text-sm text-gray-600">{suggestion.subtitle.text}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : locationSearchQuery.length > 2 ? (
                <p className="text-sm text-gray-500 italic">No results found</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Type to search locations</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => addAddress()}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Use Current Location
              </button>
              <button
                type="button"
                onClick={() => setIsLocationSearchOpen(false)}
                className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
