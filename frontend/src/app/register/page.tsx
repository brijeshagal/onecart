"use client";

import { AddressList } from "@/components/AddressList";
import { AddressSearch } from "@/components/AddressSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiService } from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";
import { useAppStore } from "@/lib/store";
import { RegisterUserRequest } from "@/types";
import { SignInButton, useProfile, useSignIn } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

export default function RegisterPage() {
  const router = useRouter();
  const { isLoading, setLoading, setError, setUser } = useAppStore();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<RegisterUserRequest>>({
    username: "",
    email: "",
    phone: "",
    addresses: [],
    defaultAddressIndex: -1,
    receiveAddressIndex: -1,
    askBeforeReceiving: true,
    walletAddresses: [],
    farcasterWalletAddress: -1,
    primaryWalletIndex: -1,
  });

  const [walletAddresses, setWalletAddresses] = useState<
    Array<{
      address: string;
      verified: boolean;
      id: string;
    }>
  >([]);
  const { address, isConnected } = useAccount();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { disconnect } = useDisconnect();
  const { isAuthenticated, profile } = useProfile();
  const { signOut } = useSignIn({});

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

  const handleInputChange = (
    field: keyof RegisterUserRequest,
    value: string | boolean | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddConnectedWallet = () => {
    if (!isConnected || !address) {
      return;
    }

    // Check if address already exists
    if (
      walletAddresses.some(
        (w) => w.address.toLowerCase() === address?.toLowerCase()
      )
    ) {
      return;
    }

    const newWallet = {
      address,
      verified: false,
      id: Date.now().toString(),
    };

    setWalletAddresses((prev) => [...prev, newWallet]);

    // Set the first wallet (index 0) as primary by default
    if (walletAddresses.length === 0) {
      setFormData((prev) => ({ ...prev, primaryWalletIndex: 0 }));
    }
  };

  const handleRemoveWallet = (walletId: string) => {
    const walletIndex = walletAddresses.findIndex((w) => w.id === walletId);
    setWalletAddresses((prev) => prev.filter((w) => w.id !== walletId));

    // If we're removing the primary wallet, update the primary wallet index
    if ((formData.primaryWalletIndex ?? -1) === walletIndex) {
      setFormData((prev) => ({
        ...prev,
        primaryWalletIndex: walletAddresses.length > 1 ? 0 : -1,
      }));
    } else if ((formData.primaryWalletIndex ?? -1) > walletIndex) {
      // If we're removing a wallet before the primary wallet, adjust the index
      setFormData((prev) => ({
        ...prev,
        primaryWalletIndex: (prev.primaryWalletIndex ?? 0) - 1,
      }));
    }
  };

  const handleSetPrimaryWallet = (walletId: string) => {
    setFormData((prev) => {
      const walletIndex = walletAddresses.findIndex((w) => w.id === walletId);
      return { ...prev, primaryWalletIndex: walletIndex };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone) newErrors.phone = "Phone number is required";
    if (!formData.addresses || formData.addresses.length === 0) {
      newErrors.addresses = "At least one address is required";
    }
    if (formData.username && formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!profile) {
      newErrors.farcaster = "Farcaster connection is required";
    }
    if (walletAddresses.length === 0) {
      newErrors.wallet = "At least one wallet address is required";
    } else {
      const verifiedWallets = walletAddresses.filter((w) => w.verified);
      if (verifiedWallets.length === 0) {
        newErrors.wallet = "At least one wallet address must be verified";
      }
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
      // Get verified wallet addresses
      const verifiedWallets = walletAddresses.filter((w) => w.verified);

      // Prepare registration data with Farcaster and wallet info
      const registrationData: RegisterUserRequest = {
        ...formData,
        socialLogins: profile.username
          ? [
              {
                platform: "farcaster",
                username: profile.username,
                fid: profile.fid?.toString() ?? "",
              },
            ]
          : [],
        walletAddresses: verifiedWallets.map((w) => w.address),
        farcasterWalletAddress: verifiedWallets.length > 0 ? 0 : -1,
        primaryWalletIndex:
          (formData.primaryWalletIndex ?? -1) >= 0
            ? formData.primaryWalletIndex ?? -1
            : verifiedWallets.length > 0
            ? 0
            : -1,
      } as RegisterUserRequest;

      const response = await apiService.registerUser(registrationData);

      if (response.success && response.data) {
        setUser(response.data.user);
        router.push("/");
      } else {
        setError(response.error?.message || "Registration failed");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black mb-2">Create Account</h1>
          <p className="text-gray-600">
            Join OneCart for seamless global deliveries
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Farcaster Connection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Social Logins*
            </label>

            {isAuthenticated && profile ? (
              // Connected State
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  {profile?.pfpUrl ? (
                    <span className="text-white text-sm font-bold w-8 h-8 rounded-full">
                      <img
                        src={profile?.pfpUrl ?? ""}
                        alt="Farcaster"
                        className="w-full h-full rounded-full"
                        width={32}
                        height={32}
                      />
                    </span>
                  ) : (
                    <span className="text-white text-sm font-bold w-8 h-8 rounded-full bg-gray-200">
                      <span className="text-gray-400 text-sm font-bold">
                        {profile?.username?.charAt(0)}
                      </span>
                    </span>
                  )}
                  <span className="text-green-800 font-medium">
                    {profile?.username}
                  </span>
                  <span className="text-xs text-green-600">
                    {profile?.fid?.toString()}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                  onClick={() => signOut()}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <SignInButton />
            )}
            {errors.farcaster && (
              <p className="text-sm text-red-600">{errors.farcaster}</p>
            )}
          </div>

          {/* Wallet Addresses */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Wallet Addresses
            </label>

            {/* Connect Wallet */}
            {!isConnected || !address ? (
              <div className="mb-2">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className="cursor-pointer px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
                    >
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">W</span>
                    </div>
                    <span className="font-mono text-sm text-gray-400">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      onClick={handleAddConnectedWallet}
                      size="sm"
                      className="text-xs cursor-pointer"
                    >
                      Add to List
                    </Button>
                    <button
                      type="button"
                      onClick={() => disconnect()}
                      className="text-red-600 hover:text-red-800 text-xs cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet List */}
            {walletAddresses.length > 0 && (
              <div className="space-y-2">
                {walletAddresses.map((wallet, index) => {
                  const isPrimary = formData.primaryWalletIndex === index;
                  return (
                    <div
                      key={wallet.id}
                      className={`p-3 rounded-lg border text-gray-400 cursor-pointer transition-colors ${
                        isPrimary
                          ? "bg-blue-50 border-blue-200"
                          : "bg-green-50 border-green-200 hover:bg-green-100"
                      }`}
                      onClick={() => handleSetPrimaryWallet(wallet.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isPrimary ? "bg-blue-500" : "bg-green-500"
                            }`}
                          ></div>
                          <span className="font-mono text-sm text-gray-400">
                            {wallet.address.slice(0, 6)}...
                            {wallet.address.slice(-4)}
                          </span>
                          {isPrimary && (
                            <div className="flex items-center space-x-1">
                              <svg
                                className="w-4 h-4 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-xs text-blue-600 font-medium">
                                Primary
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWallet(wallet.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {errors.wallet && (
              <p className="text-sm text-red-600">{errors.wallet}</p>
            )}
            <p className="text-xs text-gray-500">
              Add your Ethereum wallet addresses and verify them for secure
              transactions
            </p>
          </div>

          {/* Username */}
          <Input
            type="text"
            placeholder="Username (optional)"
            value={formData.username || ""}
            onChange={(e) => handleInputChange("username", e.target.value)}
            error={errors.username}
            className="text-gray-400 placeholder:text-gray-400 focus:text-gray-900"
          />

          {/* Email */}
          <Input
            type="email"
            placeholder="Email (optional)"
            value={formData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            error={errors.email}
            className="text-gray-400 placeholder:text-gray-400 focus:text-gray-900"
          />

          {/* Phone */}
          <Input
            type="tel"
            placeholder="Phone number *"
            value={formData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            error={errors.phone}
            className="text-gray-400 placeholder:text-gray-400 focus:text-gray-900"
          />

          {/* Address Section */}
          <div className="space-y-4">
            <AddressList
              addresses={formData.addresses || []}
              onRemove={handleAddressRemove}
            />

            <AddressSearch
              currentLocation={currentLocation}
              phone={formData.phone || ""}
            />

            {errors.addresses && (
              <p className="text-sm text-red-600">{errors.addresses}</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.askBeforeReceiving}
              onChange={(e) =>
                handleInputChange("askBeforeReceiving", e.target.checked)
              }
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
          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            className="w-full"
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}
