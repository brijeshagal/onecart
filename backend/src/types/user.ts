import { UserAddress, CreateAddressRequest } from './address';

// User data structure
export interface User {
  id?: string;
  username: string; // Farcaster username
  email?: string | undefined; // Optional email
  phone: string; // Phone number with country code
  addresses: UserAddress[]; // Array of user addresses
  defaultAddressIndex: number; // Index of default address (-1 if none)
  receiveAddressIndex: number; // Index of receive address (-1 if none)
  askBeforeReceiving: boolean; // Default true
  walletAddresses: string[]; // Array of wallet addresses
  farcasterWalletAddress: number; // Default -1 if not connected
  primaryWalletIndex: number; // Default -1 if no wallet selected
  created_at?: Date;
  updated_at?: Date;
}

// Social login types
export interface SocialLogin {
  platform: 'farcaster' | 'twitter' | 'discord' | 'telegram';
  username: string;
  walletAddress?: string;
}

// User registration request
export interface RegisterUserRequest {
  socialLogins: SocialLogin[];
  email?: string;
  phone: string;
  walletAddresses: string[];
  addresses: CreateAddressRequest[];
  defaultAddressIndex?: number; // Default -1
  askBeforeReceiving?: boolean; // Default true
  currentLatitude?: number;
  currentLongitude?: number;
}

// User registration response
export interface RegisterUserResponse {
  success: boolean;
  data?: {
    user: User;
    message: string;
  };
  error?: string;
  timestamp?: string;
}

// User profile response
export interface UserProfileResponse {
  success: boolean;
  data?: User;
  error?: string;
}
