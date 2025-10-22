import { NextFunction, Request, Response } from 'express';
import { BlinkitService } from '../services/blinkitService';
import { SearchLocationRequest, SearchLocationResponse } from '../types/api';

/**
 * Location Controller
 * Handles location search operations using Blinkit API
 */
export class LocationController {
  /**
   * Search for location suggestions
   * @route GET /api/location/search
   * @param {SearchLocationRequest} req.query - Location search parameters
   * @returns {Promise<SearchLocationResponse>} Location suggestions
   */
  static async searchLocation(
    req: Request<{}, SearchLocationResponse, SearchLocationRequest>,
    res: Response<SearchLocationResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { lat, lng, query } = req.query as unknown as {
        lat: number;
        lng: number;
        query: string;
      };

      console.log(
        `🔍 Location search request: query="${query}", lat=${lat}, lng=${lng}`
      );

      // Call Blinkit API
      const blinkitData = await BlinkitService.searchLocation(query, lat, lng);

      // Format response
      const response: SearchLocationResponse = {
        success: true,
        data: {
          suggestions: blinkitData.suggestions,
          query,
          coordinates: {
            lat,
            lng,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Location search error:', error);
      next(error);
    }
  }
}
