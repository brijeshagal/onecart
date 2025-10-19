import { NextFunction, Request, Response } from 'express';
import { userModel } from '../models/User';
import { AddressData } from '../types/address';
import { SearchItemsRequest, SearchItemsResponse } from '../types/api';
import {
  createIncognitoPage,
  launchBrowser,
} from '../utils/blinkit/browserUtils';
import {
  setAddressOnPage,
  performBlinkitSearch,
} from '../utils/blinkit/searchUtils';

/**
 * Search Items Controller
 * Handles product search based on user's query and location
 * TODO: Implement actual Blinkit search with puppeteer browser automation
 */
export class SearchItemsController {
  /**
   * Search for items based on query and location
   * @route GET /api/search-items
   * @param {SearchItemsRequest} req.query - Search request parameters
   * @returns {Promise<SearchItemsResponse>} Search results
   */
  static async searchItems(
    req: Request<{}, SearchItemsResponse, {}, SearchItemsRequest>,
    res: Response<SearchItemsResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        receiverUsername,
        lat: _lat,
        lng: _lng,
        presetAddressId: _presetAddressId,
        query,
      } = req.query;

      console.log(
        `🔍 Search items request: query="${query}", location options provided`
      );

      const browser = await launchBrowser();
      const { page, context } = await createIncognitoPage(browser);
      await page.goto('https://www.blinkit.com', {
        waitUntil: 'domcontentloaded',
      });

      // Resolve address context: from presetAddressId or user's default address
      let addressData: any = '';
      if (_presetAddressId && userId) {
        const userDetails = await userModel.findOne({
          _id: userId,
          'addresses._id': _presetAddressId,
        });
        if (!userDetails) {
          res.status(404).json({
            success: false,
            error: 'Address not found',
          });
          return;
        }
        console.log('userDetails: ', userDetails);
        const addressDetails = userDetails.addresses.find(
          (a: any) => String(a._id.toString()) === String(_presetAddressId)
        ) as AddressData;
        console.log(addressDetails);
        addressData = addressDetails.display_address;
      } else if (receiverUsername) {
        const userDetails = await userModel.findOne({
          username: receiverUsername,
        });
        if (!userDetails) {
          res.status(404).json({
            success: false,
            error: 'User not found',
          });
          return;
        }
        const addressDetails =
          userDetails.addresses[userDetails.receiveAddressIndex];
        addressData = addressDetails.display_address;
      }

      await setAddressOnPage(addressData, page);
      const blinkitSearchResponse = await performBlinkitSearch(page, query);

      await page.close();
      if (context) {
        await context.close();
      }
      res.status(200).json({
        success: true,
        data: blinkitSearchResponse,
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error('❌ Search items error:', error);
      next(error);
    }
  }
}
