import { Request, Response, NextFunction } from 'express';
import { FeedRequest, FeedResponse } from '../types/api';

/**
 * Feed Controller
 * Handles home page product feed based on user's location (Blinkit India)
 * TODO: Replace with actual Blinkit API integration
 */
export class FeedController {
  /**
   * Get home page product feed based on location
   * @route GET /api/feed
   * @param {FeedRequest} req.query - Feed request parameters
   * @returns {Promise<FeedResponse>} Home page product feed
   */
  static async getFeed(
    req: Request<{}, FeedResponse, {}, FeedRequest>,
    res: Response<FeedResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { lat, lng, offset = 0, limit = 20 } = req.query;

      console.log(`📱 Feed request: lat=${lat}, lng=${lng}, offset=${offset}, limit=${limit}`);

      // TODO: Replace with actual Blinkit API call
      // For now, return a basic structure that will be replaced with real data
      const response: FeedResponse = {
        success: true,
        data: {
          sections: [
            {
              id: 'categories',
              title: 'Shop by Category',
              type: 'categories',
              categories: [
                'Fruits & Vegetables',
                'Dairy & Eggs',
                'Bakery',
                'Beverages',
                'Snacks & Munchies'
              ]
            }
          ],
          location: {
            lat,
            lng,
            city: this.getCityFromCoordinates(lat, lng)
          },
          pagination: {
            offset,
            limit,
            hasMore: false
          }
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Feed error:', error);
      next(error);
    }
  }

  /**
   * Get city name from coordinates (simplified logic)
   */
  private static getCityFromCoordinates(lat: number, lng: number): string {
    // In a real implementation, this would use reverse geocoding
    if (lat >= 12 && lat <= 14 && lng >= 77 && lng <= 78) {
      return 'Bangalore';
    } else if (lat >= 28 && lat <= 29 && lng >= 77 && lng <= 78) {
      return 'Delhi';
    } else if (lat >= 19 && lat <= 20 && lng >= 72 && lng <= 73) {
      return 'Mumbai';
    }

    return 'India'; // Default fallback
  }
}
