import { NextFunction, Request, Response } from 'express';
import { Page } from 'puppeteer';
import { userModel } from '../models/User';
import { AddressData } from '../types/address';
import { SearchItemsRequest, SearchItemsResponse } from '../types/api';
import { launchBrowser } from '../utils/blinkit/browserUtils';
import {
  performBlinkitSearch,
  setAddressOnPage,
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
    req: Request<{}, SearchItemsResponse, SearchItemsRequest>,
    res: Response<SearchItemsResponse>,
    next: NextFunction
  ): Promise<void> {
    const browser = await launchBrowser();
    try {
      const {
        userId,
        receiverUsername,
        presetAddressId: _presetAddressId,
        query,
        newAddress,
      } = req.body;

      console.log(
        `🔍 Search items request: query="${query}", newAddress provided: ${!!newAddress}`
      );

      const [page] = (await browser.pages()) as [Page];
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

        const addressDetails = userDetails.addresses.find(
          (a: any) => String(a._id.toString()) === String(_presetAddressId)
        ) as AddressData;
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
      } else if (newAddress) {
        // Use the UISuggestion data to construct address (max 50 chars)
        const fullAddress =
          `${newAddress.title.text} ${newAddress.subtitle.text}`.replace(
            ',',
            ''
          );
        addressData = fullAddress.substring(0, 40);
      }

      if (!addressData) {
        res.status(400).json({
          success: false,
          error: 'No valid location data provided',
        });
        return;
      }

      await setAddressOnPage(addressData, page);
      await new Promise(resolve => setTimeout(resolve, 1200));
      const blinkitSearchResponse = await performBlinkitSearch(page, query);

      res.status(200).json({
        success: true,
        data: blinkitSearchResponse,
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error('❌ Search items error:', error);
      next(error);
    } finally {
      await browser.close();
    }
  }
}
