"use client";

import { Button } from "@/components/ui/Button";
import { AddressData } from "@/types";
import { useState } from "react";

interface AddressDetailsStepProps {
  address: AddressData;
  phone: string;
  onComplete: (updatedAddress: AddressData) => void;
  onBack?: () => void;
}

export const AddressDetailsStep: React.FC<AddressDetailsStepProps> = ({
  address,
  phone,
  onComplete,
  onBack,
}) => {
  const [usePrimaryPhone, setUsePrimaryPhone] = useState(
    !address.address_details_info?.phone ||
      address.address_details_info?.phone === phone ||
      phone !== ""
  );

  const [formData, setFormData] = useState({
    tower: address.address_details_info?.tower || "",
    house: address.address_details_info?.house || "",
    floor: address.address_details_info?.floor || "",
    phone: usePrimaryPhone ? phone : address.address_details_info?.phone || "",
    landmark: address.address_details_info?.landmark || "",
    tags: address.address_details_info?.tags || "",
    template_id: address.address_details_info?.template_id || 1,
    alias_id: address.address_details_info?.alias_id || 0,
    name: address.address_details_info?.name || address.name || "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Don't update form data if using primary phone
    if (name === "phone" && usePrimaryPhone) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePhoneOptionChange = (usePrimary: boolean) => {
    setUsePrimaryPhone(usePrimary);

    // When switching to custom mode, clear the phone field
    if (!usePrimary) {
      setFormData((prev) => ({
        ...prev,
        phone: "",
      }));
    }

    // Clear phone error when switching options
    if (errors.phone) {
      setErrors((prev) => ({
        ...prev,
        phone: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Address name is required";
    }

    // Phone validation - check if we have a valid phone number
    const phoneToValidate = usePrimaryPhone ? phone : formData.phone;
    if (!phoneToValidate.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(phoneToValidate)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.house.trim()) {
      newErrors.house = "House number is required";
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
      const dataToSubmit: AddressData = {
        ...address,
        address_details_info: formData,
      };

      onComplete(dataToSubmit);
    } catch (error: any) {
      console.error("Error updating address details:", error);
      setErrors({
        general: error.message || "Failed to update address details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Address Details
        </h2>
        <p className="text-gray-600">
          Add specific details for accurate delivery
        </p>
      </div>

      <div className="space-y-4">
        {/* Address Preview */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">
            Selected Address:
          </h3>
          <p className="text-sm text-blue-900 font-medium">
            {address.display_address}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Address Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500 ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="e.g., Home, Office"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <button
                  type="button"
                  onClick={() => handlePhoneOptionChange(!usePrimaryPhone)}
                  className={`relative inline-flex h-5 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    usePrimaryPhone ? "bg-blue-600" : "bg-gray-200"
                  }`}
                  title={
                    usePrimaryPhone
                      ? "Using primary contact"
                      : "Using custom number"
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      usePrimaryPhone ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <input
                type="tel"
                id="phone"
                name="phone"
                value={usePrimaryPhone ? phone : formData.phone}
                onChange={handleInputChange}
                disabled={usePrimaryPhone}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500 ${
                  errors.phone ? "border-red-300" : "border-gray-300"
                } ${usePrimaryPhone ? "bg-gray-50 text-gray-700" : ""}`}
                placeholder={usePrimaryPhone ? phone : "+91 9876543210"}
              />

              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="house"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                House/Flat Number *
              </label>
              <input
                type="text"
                id="house"
                name="house"
                value={formData.house}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500 ${
                  errors.house ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="e.g., 123, A-45"
              />
              {errors.house && (
                <p className="mt-1 text-sm text-red-600">{errors.house}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="tower"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tower/Building
              </label>
              <input
                type="text"
                id="tower"
                name="tower"
                value={formData.tower}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., Tower A, Building 2"
              />
            </div>

            <div>
              <label
                htmlFor="floor"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Floor
              </label>
              <input
                type="text"
                id="floor"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., 4th Floor, Ground Floor"
              />
            </div>

            <div>
              <label
                htmlFor="landmark"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Landmark
              </label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., Near Central Park"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="px-6"
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="px-6">
              {isLoading ? "Saving..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
