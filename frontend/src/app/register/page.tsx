"use client";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { apiService } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { RegisterUserRequest } from "@/types";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const { setLoading, setError, setUser } = useAppStore();

  const handleExistingUser = async (user: any) => {
    console.log("User already exists, signing in:", user);
    setUser(user);
    router.push("/");
  };

  const handleOnboardingComplete = async (data: {
    profile: any;
    walletAddresses: Array<{ address: string; verified: boolean; id: string }>;
    phone: string;
    address: any;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare registration data
      const registrationData: RegisterUserRequest = {
        username: data.profile.username || "",
        email: "",
        phone: data.phone,
        addresses: [data.address],
        defaultAddressIndex: 0,
        receiveAddressIndex: -1,
        askBeforeReceiving: true,
        walletAddresses: data.walletAddresses.map((w) => w.address),
        farcasterWalletAddress: 0,
        primaryWalletIndex: 0,
        socialLogins: {
          farcaster: {
            username: data.profile.username,
            fid: data.profile.fid?.toString() ?? "",
          },
        },
      };

      console.log("Registration data:", registrationData);

      // Call registration API
      const response = await apiService.registerUser(registrationData);
      if (response.success && response.data?.user) {
        console.log("Registration successful:", response.data);
        setUser(response.data.user);
        router.push("/");
      } else {
        setError(response.error?.message || "Registration failed");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <OnboardingFlow
      onComplete={handleOnboardingComplete}
      onCancel={handleCancel}
      onExistingUser={handleExistingUser}
    />
  );
}
