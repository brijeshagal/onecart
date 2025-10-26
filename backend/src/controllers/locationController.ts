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

  /**
   * Get location details from coordinates (reverse geocoding)
   * @route POST /api/location/reverse-geocode
   * @param {ReverseGeocodeRequest} req.body - Coordinates and address details
   * @returns {Promise<ReverseGeocodeResponse>} Location details with state, postal_code, city
   */
  static async reverseGeocode(
    req: Request<{}, any, { lat: number; lng: number; address_details_info: any }>,
    res: Response<any>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { lat, lng, address_details_info } = req.body;

      console.log(
        `🗺️ Reverse geocoding request: lat=${lat}, lng=${lng}`
      );

      // Validate coordinates
      if (!BlinkitService.validateCoordinates(lat, lng)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid coordinates provided' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get location details from coordinates
      const locationInfo = this.getLocationInfoFromCoordinates(lat, lng);

      // Format response
      const response = {
        success: true,
        data: {
          location_info: locationInfo,
          coordinates: { lat, lng },
          address_details_info,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      next(error);
    }
  }

  /**
   * Get location info from coordinates (simplified reverse geocoding)
   * In a real implementation, this would use a proper reverse geocoding service
   */
  private static getLocationInfoFromCoordinates(lat: number, lng: number): {
    state: string;
    postal_code: string;
    city: string;
  } {
    // Simplified logic - in production, use a proper reverse geocoding service
    if (lat >= 12 && lat <= 14 && lng >= 77 && lng <= 78) {
      return {
        state: 'Karnataka',
        postal_code: '560001',
        city: 'Bangalore',
      };
    } else if (lat >= 28 && lat <= 29 && lng >= 77 && lng <= 78) {
      return {
        state: 'Delhi',
        postal_code: '110001',
        city: 'New Delhi',
      };
    } else if (lat >= 19 && lat <= 20 && lng >= 72 && lng <= 73) {
      return {
        state: 'Maharashtra',
        postal_code: '400001',
        city: 'Mumbai',
      };
    }

    // Default fallback
    return {
      state: 'India',
      postal_code: '000000',
      city: 'Unknown',
    };
  }
}
