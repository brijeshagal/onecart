import React, { useState } from 'react';
import { AddressData } from '@/types';
import { apiService } from '@/lib/api';

interface AddressDetailsFormProps {
  address: AddressData;
  onSave: (updatedAddress: AddressData) => void;
  onCancel: () => void;
  primaryPhone?: string;
}

export const AddressDetailsForm: React.FC<AddressDetailsFormProps> = ({
  address,
  onSave,
  onCancel,
  primaryPhone = "",
}) => {
  const [usePrimaryPhone, setUsePrimaryPhone] = useState(
    !address.address_details_info?.phone || 
    address.address_details_info?.phone === primaryPhone ||
    primaryPhone !== ""
  );

  const [formData, setFormData] = useState({
    tower: address.address_details_info?.tower || '',
    house: address.address_details_info?.house || '',
    floor: address.address_details_info?.floor || '',
    phone: usePrimaryPhone ? primaryPhone : (address.address_details_info?.phone || ''),
    landmark: address.address_details_info?.landmark || '',
    tags: address.address_details_info?.tags || '',
    template_id: address.address_details_info?.template_id || 1,
    alias_id: address.address_details_info?.alias_id || 0,
    name: address.address_details_info?.name || address.name || '',
  });

  const [locationInfo, setLocationInfo] = useState(address.location_info);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Don't update form data if using primary phone
    if (name === 'phone' && usePrimaryPhone) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handlePhoneOptionChange = (usePrimary: boolean) => {
    setUsePrimaryPhone(usePrimary);
    
    // When switching to custom mode, clear the phone field
    // When switching to primary mode, keep the current formData.phone as is
    if (!usePrimary) {
      setFormData(prev => ({
        ...prev,
        phone: '',
      }));
    }
    
    // Clear phone error when switching options
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Address name is required';
    }
    
    // Phone validation - check if we have a valid phone number
    const phoneToValidate = usePrimaryPhone ? primaryPhone : formData.phone;
    if (!phoneToValidate.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(phoneToValidate)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.house.trim()) {
      newErrors.house = 'House number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Prepare the data with the correct phone number
      const dataToSubmit = {
        ...formData,
        phone: usePrimaryPhone ? primaryPhone : formData.phone,
      };

      // Call reverse geocoding API to get location info
      const response = await apiService.reverseGeocode(
        address.latitude,
        address.longitude,
        dataToSubmit
      );

      if (response.success && response.data) {
        // Update location info state
        setLocationInfo(response.data.location_info);
        
        const updatedAddress: AddressData = {
          ...address,
          address_details_info: dataToSubmit,
          location_info: response.data.location_info,
        };

        onSave(updatedAddress);
      } else {
        setErrors({ general: 'Failed to update address details' });
      }
    } catch (error: any) {
      console.error('Error updating address details:', error);
      setErrors({ general: error.message || 'Failed to update address details' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {address.address_details_info ? 'Edit Address Details' : 'Add Address Details'}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {address.display_address}
          </p>
          {locationInfo && locationInfo.state && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Location:</span> {locationInfo.city}, {locationInfo.state} - {locationInfo.postal_code}
              </p>
            </div>
          )}
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block h-5 text-sm font-medium text-gray-700 mb-1">
              Address Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Home, Office"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 h-5">
                Phone Number *
              </label>
              <button
                type="button"
                onClick={() => handlePhoneOptionChange(!usePrimaryPhone)}
                className={`relative inline-flex h-5 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  usePrimaryPhone ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                title={usePrimaryPhone ? 'Using primary contact' : 'Using custom number'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    usePrimaryPhone ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <input
              type="tel"
              id="phone"
              name="phone"
              value={usePrimaryPhone ? (primaryPhone || '') : formData.phone}
              onChange={handleInputChange}
              disabled={usePrimaryPhone}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } ${usePrimaryPhone ? 'bg-gray-50 text-gray-500' : ''}`}
              placeholder={usePrimaryPhone ? 'Primary phone not added yet' : '+91 9876543210'}
            />
            
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="house" className="block text-sm font-medium text-gray-700 mb-1">
              House/Flat Number *
            </label>
            <input
              type="text"
              id="house"
              name="house"
              value={formData.house}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.house ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 123, A-45"
            />
            {errors.house && (
              <p className="mt-1 text-sm text-red-600">{errors.house}</p>
            )}
          </div>

          <div>
            <label htmlFor="tower" className="block text-sm font-medium text-gray-700 mb-1">
              Tower/Building
            </label>
            <input
              type="text"
              id="tower"
              name="tower"
              value={formData.tower}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Tower A, Building 2"
            />
          </div>

          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <input
              type="text"
              id="floor"
              name="floor"
              value={formData.floor}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 4th Floor, Ground Floor"
            />
          </div>

          <div>
            <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">
              Landmark
            </label>
            <input
              type="text"
              id="landmark"
              name="landmark"
              value={formData.landmark}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Near Central Park"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., home, office, delivery"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </form>
    </div>
  );
};
