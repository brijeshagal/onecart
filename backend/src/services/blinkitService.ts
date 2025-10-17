import axios, { AxiosResponse } from 'axios';
import { UIData } from '@/types/ui';
import { AppError } from '@/middleware/errorHandler';

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
      const params = new URLSearchParams({
        query,
        lat: lat.toString(),
        lng: lng.toString(),
      });

      const url = `${this.BASE_URL}${this.AUTO_SUGGEST_ENDPOINT}?${params}`;

      console.log(`🔍 Calling Blinkit API: ${url}`);

      const response: AxiosResponse<UIData> = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'OneCart-Backend/1.0.0',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Blinkit API returned status ${response.status}`);
      }

      if (!response.data || !response.data.suggestions) {
        throw new Error('Invalid response from Blinkit API');
      }

      console.log(`✅ Blinkit API returned ${response.data.suggestions.length} suggestions`);

      return response.data;
    } catch (error) {
      console.error('❌ Blinkit API Error:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new AppError('Blinkit API request timeout');
        }
        if (error.response) {
          throw new AppError(`Blinkit API error: ${error.response.status} - ${error.response.statusText}`);
        }
        if (error.request) {
          throw new AppError('Unable to reach Blinkit API');
        }
      }

      throw new AppError(`Failed to search location: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  static formatCoordinates(lat: number, lng: number): { lat: string; lng: string } {
    return {
      lat: lat.toFixed(7),
      lng: lng.toFixed(7),
    };
  }
}
