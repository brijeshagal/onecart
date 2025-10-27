"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

interface PhoneNumberStepProps {
  onComplete: (phone: string) => void;
  onBack?: () => void;
  initialPhone?: string;
}

export const PhoneNumberStep: React.FC<PhoneNumberStepProps> = ({
  onComplete,
  onBack,
  initialPhone = "",
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = (phoneNumber: string) => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onComplete(phone.trim());
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Your Phone Number
        </h2>
        <p className="text-gray-600">
          We'll use this to contact you about your orders
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <Input
            type="tel"
            id="phone"
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            error={errors.phone}
            className="text-gray-400 placeholder:text-gray-400 focus:text-gray-900"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                Your phone number will be used for delivery notifications and order updates.
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
          disabled={!phone.trim()}
          className="px-6"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
