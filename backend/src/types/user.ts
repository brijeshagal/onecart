import { AddressData } from './address';

// User data structure
export interface User {
  id?: string;
  username: string; // Farcaster username
  email?: string | undefined; // Optional email
  phone: string; // Phone number with country code
  addresses: AddressData[]; // Array of user addresses
  defaultAddressIndex: number; // Index of default address (-1 if none)
  receiveAddressIndex: number; // Index of receive address (-1 if none)
  askBeforeReceiving: boolean; // Default true
  walletAddresses: string[]; // Array of wallet addresses
  farcasterWalletAddress: number; // Default -1 if not connected
  primaryWalletIndex: number; // Default -1 if no wallet selected
  created_at?: Date;
  updated_at?: Date;
  activeCartId?: string;
  previousOrders?: string[];
  receiveOrders?: string[];
}

// Social login types
export interface SocialLogin {
  farcaster?: {
    walletAddress?: string;
    username: string;
  };
}

// User registration response
export interface RegisterUserResponse {
  success: boolean;
  data: {
    user: User;
    message: string;
  };
  timestamp: string;
}

export interface RegisterUserRequest {
  socialLogins?: SocialLogin; // optional object with farcaster login
  username?: string; // required if no socialLogins provided
  email?: string;
  phone: string;
  addresses: AddressData[];
  defaultAddressIndex: number;
  receiveAddressIndex: number;
  askBeforeReceiving: boolean;
  walletAddresses: string[];
  farcasterWalletAddress: number;
  primaryWalletIndex: number;
}
