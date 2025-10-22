import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

// Validation middleware for search location
export const validateSearchLocation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { lat, lng, query } = req.query;

  // Check required fields
  if (!lat || !lng || !query) {
    const error = new Error(
      'Missing required fields: lat, lng, and query are required'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate latitude
  const latNum = parseFloat(lat as string);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    const error = new Error(
      'Invalid latitude: must be a number between -90 and 90'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate longitude
  const lngNum = parseFloat(lng as string);
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    const error = new Error(
      'Invalid longitude: must be a number between -180 and 180'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate query
  if (typeof query !== 'string' || query.trim().length === 0) {
    const error = new Error(
      'Invalid query: must be a non-empty string'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate query length
  if (query.length > 100) {
    const error = new Error(
      'Query too long: maximum 100 characters allowed'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  next();
};

// Validation middleware for feed request
export const validateFeedRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { lat, lng, offset, limit } = req.query;

  // Check required fields
  if (!lat || !lng) {
    const error = new Error(
      'Missing required fields: lat and lng are required'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate latitude
  const latNum = parseFloat(lat as string);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    const error = new Error(
      'Invalid latitude: must be a number between -90 and 90'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate longitude
  const lngNum = parseFloat(lng as string);
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    const error = new Error(
      'Invalid longitude: must be a number between -180 and 180'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate offset (optional)
  if (offset !== undefined) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || offsetNum < 0) {
      const error = new Error(
        'Invalid offset: must be a non-negative integer'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      const error = new Error(
        'Invalid limit: must be an integer between 1 and 50'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  next();
};


// Validation middleware for search items request
export const validateSearchItemsRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const {
    userId,
    receiverUsername,
    lat,
    lng,
    presetAddressId,
    newAddress,
    query,
    offset,
    limit,
  } = req.query;

  // Check that query is provided
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    const error = new Error(
      'Missing or invalid query: query is required and must be a non-empty string'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Check that at least one location option is provided
  const hasLocationOption =
    receiverUsername || (lat && lng) || presetAddressId || newAddress || userId;
  if (!hasLocationOption) {
    const error = new Error(
      'Missing context: provide one of userId, receiverUsername, lat+lng, presetAddressId, or newAddress'
    ) as AppError;
    error.statusCode = 400;
    return next(error);
  }

  // Validate coordinates if provided
  if (lat || lng) {
    if (!lat || !lng) {
      const error = new Error(
        'Invalid coordinates: both lat and lng must be provided together'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      const error = new Error(
        'Invalid latitude: must be a number between -90 and 90'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      const error = new Error(
        'Invalid longitude: must be a number between -180 and 180'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate newAddress if provided
  if (newAddress) {
    const address = newAddress as any;
    if (
      !address.name ||
      !address.address ||
      !address.phone ||
      !address.saveAs
    ) {
      const error = new Error(
        'Invalid newAddress: name, address, phone, and saveAs are required'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate offset (optional)
  if (offset !== undefined) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || offsetNum < 0) {
      const error = new Error(
        'Invalid offset: must be a non-negative integer'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      const error = new Error(
        'Invalid limit: must be an integer between 1 and 50'
      ) as AppError;
      error.statusCode = 400;
      return next(error);
    }
  }

  next();
};
