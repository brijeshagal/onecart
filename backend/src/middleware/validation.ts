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

// Validation middleware for feed request
export const validateFeedRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const { lat, lng, offset, limit } = req.query;

  // Check required fields
  if (!lat || !lng) {
    const error = new Error('Missing required fields: lat and lng are required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate latitude
  const latNum = parseFloat(lat as string);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    const error = new Error('Invalid latitude: must be a number between -90 and 90') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate longitude
  const lngNum = parseFloat(lng as string);
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    const error = new Error('Invalid longitude: must be a number between -180 and 180') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate offset (optional)
  if (offset !== undefined) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || offsetNum < 0) {
      const error = new Error('Invalid offset: must be a non-negative integer') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      const error = new Error('Invalid limit: must be an integer between 1 and 50') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  next();
};

// Validation middleware for search items request
export const validateSearchItemsRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const {
    receiverUsername,
    lat,
    lng,
    presetAddressId,
    newAddress,
    query,
    offset,
    limit
  } = req.query;

  // Check that query is provided
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    const error = new Error('Missing or invalid query: query is required and must be a non-empty string') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Check that at least one location option is provided
  const hasLocationOption = receiverUsername || (lat && lng) || presetAddressId || newAddress;
  if (!hasLocationOption) {
    const error = new Error('Missing location: at least one of receiverUsername, lat+lng, presetAddressId, or newAddress is required') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate coordinates if provided
  if (lat || lng) {
    if (!lat || !lng) {
      const error = new Error('Invalid coordinates: both lat and lng must be provided together') as AppError;
      error.statusCode = 400;
      return next(error);
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      const error = new Error('Invalid latitude: must be a number between -90 and 90') as AppError;
      error.statusCode = 400;
      return next(error);
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      const error = new Error('Invalid longitude: must be a number between -180 and 180') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate newAddress if provided
  if (newAddress) {
    const address = newAddress as any;
    if (!address.name || !address.address || !address.phone || !address.saveAs) {
      const error = new Error('Invalid newAddress: name, address, phone, and saveAs are required') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate offset (optional)
  if (offset !== undefined) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || offsetNum < 0) {
      const error = new Error('Invalid offset: must be a non-negative integer') as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      const error = new Error('Invalid limit: must be an integer between 1 and 50') as AppError;
      error.statusCode = 400;
      return next(error);
    }
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
