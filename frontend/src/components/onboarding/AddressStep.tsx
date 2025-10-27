"use client";

import { AddressSearch } from "@/components/AddressSearch";
import { Button } from "@/components/ui/Button";
import { AddressData } from "@/types";
import { useState } from "react";

interface AddressStepProps {
  onComplete: (address: AddressData) => void;
  onBack?: () => void;
  currentLocation: { lat: number; lng: number } | null;
  phone: string;
}

export const AddressStep: React.FC<AddressStepProps> = ({
  onComplete,
  onBack,
  currentLocation,
  phone,
}) => {
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddressSelect = (address: AddressData) => {
    setSelectedAddress(address);
    // Clear any errors when address is selected
    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: "" }));
    }
  };

  const handleContinue = () => {
    if (!selectedAddress) {
      setErrors({ address: "Please select a delivery address" });
      return;
    }

    onComplete(selectedAddress);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Your Address
        </h2>
        <p className="text-gray-600">
          Where should we deliver your orders?
        </p>
      </div>

      <div className="space-y-4">
        <AddressSearch
          currentLocation={currentLocation}
          phone={phone}
          onAddressSelect={handleAddressSelect}
        />

        {errors.address && (
          <p className="text-sm text-red-600">{errors.address}</p>
        )}

        {/* Selected Address Display */}
        {selectedAddress && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedAddress.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {selectedAddress.display_address}
                </p>
                {selectedAddress.location_info && selectedAddress.location_info.state && (
                  <p className="text-xs text-gray-500">
                    {selectedAddress.location_info.city}, {selectedAddress.location_info.state} - {selectedAddress.location_info.postal_code}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedAddress(null)}
                className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
              >
                Change
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                You can add more addresses later in your profile settings.
              </p>
            </div>
          </div>
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
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!selectedAddress}
          className="px-6"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
