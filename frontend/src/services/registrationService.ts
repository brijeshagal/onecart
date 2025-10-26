import { RegisterUserRequest } from "@/types";
import { apiService } from "@/lib/api";

export interface RegistrationData {
  formData: Partial<RegisterUserRequest>;
  profile: {
    username?: string;
    fid?: number;
  } | null;
  walletAddresses: Array<{
    address: string;
    verified: boolean;
    id: string;
  }>;
}

export class RegistrationService {
  /**
   * Prepares registration data with Farcaster and wallet information
   */
  static prepareRegistrationData({
    formData,
    profile,
    walletAddresses,
  }: RegistrationData): RegisterUserRequest {
    // Get verified wallet addresses
    const verifiedWallets = walletAddresses.filter((w) => w.verified);

    return {
      ...formData,
      socialLogins: profile?.username
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
  }

  /**
   * Validates registration form data
   */
  static validateRegistrationData({
    formData,
    profile,
    walletAddresses,
  }: RegistrationData): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!formData.phone) {
      errors.phone = "Phone number is required";
    }

    if (!formData.addresses || formData.addresses.length === 0) {
      errors.addresses = "At least one address is required";
    }

    // Optional field validation
    if (formData.username && formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Farcaster validation
    if (!profile) {
      errors.farcaster = "Farcaster sign-in is required to create an account";
    }

    // Wallet validation
    if (walletAddresses.length === 0) {
      errors.wallet = "At least one wallet address is required";
    } else {
      const verifiedWallets = walletAddresses.filter((w) => w.verified);
      if (verifiedWallets.length === 0) {
        errors.wallet = "At least one wallet address must be verified";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Submits registration data to the API
   */
  static async submitRegistration(
    registrationData: RegisterUserRequest
  ): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await apiService.registerUser(registrationData);

      if (response.success && response.data) {
        return {
          success: true,
          user: response.data.user,
        };
      } else {
        return {
          success: false,
          error: response.error?.message || "Registration failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }
}
