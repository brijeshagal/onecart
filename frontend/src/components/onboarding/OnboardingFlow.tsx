"use client";

import { AddressDetailsStep } from "./AddressDetailsStep";
import { AddressStep } from "./AddressStep";
import { FarcasterAuthStep } from "./FarcasterAuthStep";
import { PhoneNumberStep } from "./PhoneNumberStep";
import { AddressData } from "@/types";
import { getCurrentLocation } from "@/lib/location";
import { useEffect, useState } from "react";

interface OnboardingFlowProps {
  onComplete: (data: {
    profile: any;
    walletAddresses: Array<{ address: string; verified: boolean; id: string }>;
    phone: string;
    address: AddressData;
  }) => void;
  onCancel?: () => void;
  onExistingUser?: (user: any) => void;
}

type OnboardingStep = 'auth' | 'phone' | 'address' | 'details';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onCancel,
  onExistingUser,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth');
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Step data
  const [authData, setAuthData] = useState<{
    profile: any;
    walletAddresses: Array<{ address: string; verified: boolean; id: string }>;
  } | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<AddressData | null>(null);

  // Get current location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const result = await getCurrentLocation();
        if (result.coordinates.lat && result.coordinates.lng) {
          setCurrentLocation(result.coordinates);
        }
      } catch (error) {
        console.error("Failed to get location:", error);
      }
    };
    getLocation();
  }, []);

  const handleAuthComplete = (data: {
    profile: any;
    walletAddresses: Array<{ address: string; verified: boolean; id: string }>;
  }) => {
    setAuthData(data);
    setCurrentStep('phone');
  };

  const handlePhoneComplete = (phoneNumber: string) => {
    setPhone(phoneNumber);
    setCurrentStep('address');
  };

  const handleAddressComplete = (addressData: AddressData) => {
    setAddress(addressData);
    setCurrentStep('details');
  };

  const handleDetailsComplete = (updatedAddress: AddressData) => {
    if (authData) {
      onComplete({
        ...authData,
        phone,
        address: updatedAddress,
      });
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'phone':
        setCurrentStep('auth');
        break;
      case 'address':
        setCurrentStep('phone');
        break;
      case 'details':
        setCurrentStep('address');
        break;
      default:
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'auth':
        return 'Connect Your Account';
      case 'phone':
        return 'Add Your Phone Number';
      case 'address':
        return 'Add Your Address';
      case 'details':
        return 'Address Details';
      default:
        return 'Setup';
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'auth':
        return 1;
      case 'phone':
        return 2;
      case 'address':
        return 3;
      case 'details':
        return 4;
      default:
        return 1;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'auth':
        return (
          <FarcasterAuthStep
            onComplete={handleAuthComplete}
            onBack={onCancel}
            onExistingUser={onExistingUser}
          />
        );
      case 'phone':
        return (
          <PhoneNumberStep
            onComplete={handlePhoneComplete}
            onBack={handleBack}
            initialPhone={phone}
          />
        );
      case 'address':
        return (
          <AddressStep
            onComplete={handleAddressComplete}
            onBack={handleBack}
            currentLocation={currentLocation}
            phone={phone}
          />
        );
      case 'details':
        return address ? (
          <AddressDetailsStep
            address={address}
            phone={phone}
            onComplete={handleDetailsComplete}
            onBack={handleBack}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to OneCart
          </h1>
          <p className="text-gray-600 mb-6">
            Let&apos;s get you set up in just a few steps
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getStepNumber() / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderStep()}
        </div>

        {/* Cancel Option */}
        {onCancel && (
          <div className="text-center mt-6">
            <button
              onClick={onCancel}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cancel setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
