import { NextFunction, Request, Response } from 'express';
import { userModel } from '../models/User';
import { SearchItemsRequest, SearchItemsResponse } from '../types/api';
import BrowserManager from '../utils/BrowserManager';
import {
  setAddressOnPage,
  waitForSearchResults,
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

      const page = await BrowserManager.createPage();
      await page.goto('https://www.blinkit.com', {
        waitUntil: 'domcontentloaded',
      });

      // Resolve address context: from presetAddressId or user's default address
      let addressData: any = '';
      if (_presetAddressId && userId) {
        addressData = await userModel.findOne({
          _id: userId,
          'addresses._id': _presetAddressId,
        });
        if (!addressData) {
          res.status(404).json({
            success: false,
            error: 'Address not found',
          });
          return;
        }
        addressData = addressData.addresses.find(
          (a: any) => String(a._id) === String(_presetAddressId)
        ) as any;
        if (!addressData) {
          res.status(404).json({
            success: false,
            error: 'Address not found',
          });
          return;
        }
      } else if (receiverUsername) {
        const user = await userModel.findOne({
          username: receiverUsername,
        });
        if (!user) {
          res.status(404).json({
            success: false,
            error: 'User not found',
          });
          return;
        }
        addressData = user.addresses[user.receiveAddressIndex];
        if (!addressData) {
          res.status(404).json({
            success: false,
            error: 'Address not found',
          });
          return;
        }
      }
      await setAddressOnPage(addressData, page);
      const blinkitSearchResponse = await waitForSearchResults(page, query);
      await page.close();
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
