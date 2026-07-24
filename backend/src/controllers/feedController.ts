import { Request, Response, NextFunction } from 'express';
import { Page } from 'puppeteer';
import { FeedRequest, FeedResponse } from '../types/api';
import { launchBrowser } from '../utils/blinkit/browserUtils';
import { getBlinkitHomeFeed, setAddressOnPage } from '../utils/blinkit/searchUtils';
import { AddressData } from '../types/address';

/**
 * Feed Controller
 * Handles home page product feed based on user's location (Blinkit India)
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
    const browser = await launchBrowser();
    try {
      const { lat, lng, offset = 0, limit = 20, address } = req.query;

      console.log(`📱 Feed request: lat=${lat}, lng=${lng}, offset=${offset}, limit=${limit}`);

      const [page] = (await browser.pages()) as [Page];
      await page.goto('https://www.blinkit.com', {
        waitUntil: 'domcontentloaded',
      });

      // Set address if provided
      if (address) {
        try {
          const addressData = typeof address === 'string' 
            ? JSON.parse(address) as AddressData 
            : address as AddressData;
          await setAddressOnPage(addressData, page);
          await new Promise(resolve => setTimeout(resolve, 1200));
        } catch (error) {
          console.warn('Failed to set address, using default location:', error);
        }
      }

      // Get home feed from Blinkit
      const blinkitFeedResponse = await getBlinkitHomeFeed(page);

      res.status(200).json({
        success: true,
        data: blinkitFeedResponse,
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error('❌ Feed error:', error);
      next(error);
    } finally {
      await browser.close();
    }
  }
}
