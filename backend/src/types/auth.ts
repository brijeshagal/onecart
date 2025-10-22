import { User } from './user';

// Authentication types
export interface LoginRequest {
  // Traditional login
  email?: string;
  phone?: string;
  password?: string;
  
  // Farcaster social login
  farcasterToken?: string; // JWT token from Farcaster Quick Auth
  farcasterFid?: number;
  
  // Login method
  method: 'password' | 'farcaster';
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

export interface RegisterRequest {
  // Basic user info
  username?: string;
  email?: string;
  phone: string;
  password?: string; // Optional for Farcaster users
  
  // Addresses
  addresses: any[];
  defaultAddressIndex: number;
  receiveAddressIndex: number;
  askBeforeReceiving: boolean;
  
  // Wallets
  walletAddresses: string[];
  farcasterWalletAddress: number;
  primaryWalletIndex: number;
  
  // Farcaster data
  farcasterFid?: number;
  farcasterToken?: string; // For verification
  
  // Registration method
  method: 'password' | 'farcaster';
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    user: User;
    token?: string; // Only for Farcaster users
    refreshToken?: string;
    message: string;
  };
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email?: string;
  phone?: string;
  farcasterFid?: number;
  method: 'password' | 'farcaster';
  iat: number;
  exp: number;
}

// User session
export interface UserSession {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  method: 'password' | 'farcaster';
  createdAt: Date;
  lastAccessedAt: Date;
}

// Authentication middleware types
export interface AuthenticatedRequest {
  user?: User;
  userId?: string;
  method?: 'password' | 'farcaster';
}

// Password reset types
export interface ForgotPasswordRequest {
  email?: string;
  phone?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// Farcaster token verification
export interface FarcasterTokenPayload {
  sub: number; // FID
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
}
