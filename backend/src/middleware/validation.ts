import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Validation middleware for search location
export const validateSearchLocation = (req: Request, _res: Response, next: NextFunction): void => {
  const { lat, lng, query } = req.body;

  // Check required fields
  if (!lat || !lng || !query) {
    const error = new Error('Missing required fields: lat, lng, and query are required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate latitude
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    const error = new Error('Invalid latitude: must be a number between -90 and 90') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate longitude
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    const error = new Error('Invalid longitude: must be a number between -180 and 180') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate query
  if (typeof query !== 'string' || query.trim().length === 0) {
    const error = new Error('Invalid query: must be a non-empty string') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate query length
  if (query.length > 100) {
    const error = new Error('Query too long: maximum 100 characters allowed') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  next();
};

// Validation middleware for user registration
export const validateRegisterUser = (req: Request, _res: Response, next: NextFunction): void => {
  const {
    socialLogins,
    email,
    phone,
    walletAddresses,
    addresses,
    defaultAddressIndex,
    askBeforeReceiving,
    currentLatitude,
    currentLongitude
  } = req.body;

  // Validate social logins
  if (!socialLogins || !Array.isArray(socialLogins) || socialLogins.length === 0) {
    const error = new Error('At least one social login is required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate each social login
  for (const login of socialLogins) {
    if (!login.platform || !login.username) {
      const error = new Error('Each social login must have platform and username') as AppError;
      error.statusCode = 400;
      return next(error);
    }

    const validPlatforms = ['farcaster', 'twitter', 'discord', 'telegram'];
    if (!validPlatforms.includes(login.platform)) {
      const error = new Error(`Invalid platform: ${login.platform}. Must be one of: ${validPlatforms.join(', ')}`) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate email (optional)
  if (email && typeof email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Invalid email format') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate phone
  if (!phone || typeof phone !== 'string') {
    const error = new Error('Phone number is required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Basic phone validation (can be enhanced)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    const error = new Error('Invalid phone number format') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate wallet addresses
  if (!walletAddresses || !Array.isArray(walletAddresses)) {
    const error = new Error('Wallet addresses must be an array') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate addresses
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    const error = new Error('At least one address is required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate each address
  for (const address of addresses) {
    if (!address.name || !address.address || !address.floor || !address.landmark || !address.phone || !address.save_as) {
      const error = new Error('Each address must have: name, address, floor, landmark, phone, and save_as') as AppError;
      error.statusCode = 400;
      return next(error);
    }

    // Validate address length
    if (address.address.length > 60) {
      const error = new Error('Address must be 60 characters or less') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate default address index
  if (defaultAddressIndex !== undefined) {
    if (typeof defaultAddressIndex !== 'number' || defaultAddressIndex < -1 || defaultAddressIndex >= addresses.length) {
      const error = new Error('Invalid default address index') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate askBeforeReceiving
  if (askBeforeReceiving !== undefined && typeof askBeforeReceiving !== 'boolean') {
    const error = new Error('askBeforeReceiving must be a boolean') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate coordinates if provided
  if (currentLatitude !== undefined) {
    if (typeof currentLatitude !== 'number' || currentLatitude < -90 || currentLatitude > 90) {
      const error = new Error('Invalid current latitude') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  if (currentLongitude !== undefined) {
    if (typeof currentLongitude !== 'number' || currentLongitude < -180 || currentLongitude > 180) {
      const error = new Error('Invalid current longitude') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  next();
};
