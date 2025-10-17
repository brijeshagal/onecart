import { AppError } from '../middleware/errorHandler';
import { UIData } from '../types/ui';

export class BlinkitService {
  private static readonly BASE_URL = 'https://blinkit.com';
  private static readonly AUTO_SUGGEST_ENDPOINT = '/location/autoSuggest';

  /**
   * Search for location suggestions using Blinkit API
   */
  static async searchLocation(
    query: string,
    lat: number,
    lng: number
  ): Promise<UIData> {
    try {
      const url = new URL(`${this.BASE_URL}${this.AUTO_SUGGEST_ENDPOINT}`);
      url.searchParams.set('query', query.trim() || '');
      url.searchParams.set('lat', lat.toFixed(7).trim() || '');
      url.searchParams.set('lng', lng.toFixed(7).trim() || '');

      console.log(`🔍 Calling Blinkit API: ${url}`);

      const response: Response = await fetch(url.toString(), {
        headers: {
          accept: 'application/json, text/plain, */*',
          'user-agent': 'Mozilla/5.0 (Node)',
        },
      });

      if (!response.ok) {
        throw new AppError(`Blinkit API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data as unknown as UIData;
    } catch (error) {
      console.error('❌ Blinkit API Error:', error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AppError('Unable to reach Blinkit API');
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to search location: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate coordinates
   */
  static validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Format coordinates for API call
   */
  static formatCoordinates(
    lat: number,
    lng: number
  ): { lat: string; lng: string } {
    return {
      lat: lat.toFixed(7),
      lng: lng.toFixed(7),
    };
  }
}
