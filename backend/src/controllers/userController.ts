import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { cartModel, ICart } from '../models/Cart';
import { userModel } from '../models/User';
import { RegisterUserRequest, RegisterUserResponse } from '../types/user';
import { Address } from 'viem';

/**
 * User Controller
 * Handles user registration and profile management
 */
export class UserController {
  static async registerUser(
    req: Request<{}, RegisterUserResponse, RegisterUserRequest>,
    res: Response<RegisterUserResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        socialLogins,
        username,
        email,
        phone,
        walletAddresses = [],
        addresses = [],
        defaultAddressIndex = -1,
        receiveAddressIndex = -1,
        askBeforeReceiving = true,
        farcasterWalletAddress = -1,
        primaryWalletIndex = -1,
      } = req.body;

      console.log('Register request:', {
        phone,
        username,
        socialLogins: socialLogins ? Object.keys(socialLogins) : 'none',
      });

      // Check if user already exists by phone
      const existingUserByPhone = await userModel.findOne({ phone });
      if (existingUserByPhone) {
        const error = new AppError(
          'User with this phone number already exists'
        );
        error.statusCode = 409;
        return next(error);
      }

      // Check if user already exists by username (from social logins or direct username)
      if (socialLogins?.farcaster?.username) {
        const existingUserByUsername = await userModel.findOne({
          'socialLogins.farcaster.username': socialLogins.farcaster.username,
          'socialLogins.farcaster.fid': socialLogins.farcaster.fid,
        });
        if (existingUserByUsername) {
          const error = new AppError(
            `User with username ${socialLogins.farcaster.username} already exists`
          );
          error.statusCode = 409;
          return next(error);
        }
      }
      if (username) {
        const existingUserByUsername = await userModel.findOne({ username });
        if (existingUserByUsername) {
          const error = new AppError(
            `User with username ${username} already exists`
          );
          error.statusCode = 409;
          return next(error);
        }
      }

      // Create user
      const newUser = await userModel.create({
        username,
        email: email || undefined,
        phone,
        addresses,
        defaultAddressIndex,
        askBeforeReceiving,
        walletAddresses,
        receiveAddressIndex,
        farcasterWalletAddress,
        primaryWalletIndex,
        socialLogins,
      });

      console.log(
        `✅ User registered successfully: ID=${newUser._id}, username=${newUser.username}`
      );

      const response: RegisterUserResponse = {
        success: true,
        data: {
          user: {
            id: newUser._id.toString(),
            username: newUser.username,
            email: newUser.email,
            phone: newUser.phone,
            addresses: newUser.addresses,
            defaultAddressIndex: newUser.defaultAddressIndex,
            receiveAddressIndex: newUser.receiveAddressIndex,
            askBeforeReceiving: newUser.askBeforeReceiving,
            walletAddresses: newUser.walletAddresses,
            farcasterWalletAddress: newUser.farcasterWalletAddress,
            primaryWalletIndex: newUser.primaryWalletIndex,
          },
          message: 'User registered successfully',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ User registration error:', error);
      next(error);
    }
  }

  /**
   * Get user profile by ID
   * @route GET /api/user/:id
   * @param {string} req.params.id - User ID
   * @returns {Promise<User>} User profile data
   */
  static async getUserProfile(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      console.log(`👤 Get user profile request: ID=${id}`);

      const user = await userModel.findById(id);
      if (!user) {
        const error = new AppError('User not found');
        error.statusCode = 404;
        return next(error);
      }
      let activeCartData: ICart | null = null;
      if (user.activeCartIds && user.activeCartIds.length > 0) {
        const activeCart = await cartModel.findByCartId(user.activeCartIds[0]);
        if (activeCart) {
          activeCartData = activeCart;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          activeCart: activeCartData,
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses,
            defaultAddressIndex: user.defaultAddressIndex,
            receiveAddressIndex: user.receiveAddressIndex,
            askBeforeReceiving: user.askBeforeReceiving,
            walletAddresses: user.walletAddresses,
            farcasterWalletAddress: user.farcasterWalletAddress,
            primaryWalletIndex: user.primaryWalletIndex,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      next(error);
    }
  }

  /**
   * Add or verify wallet address for user
   * @route POST /api/user/:id/wallet-address
   * @param {string} req.params.id - User ID
   * @param {string} req.body.walletAddress - Wallet address to add/verify
   * @returns {Promise<void>}
   */
  static async addWalletAddress(
    req: Request<{ id: string }, {}, { walletAddress: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { walletAddress } = req.body;

      console.log(`👛 Add wallet address request: UserID=${id}, Address=${walletAddress}`);

      if (!walletAddress || typeof walletAddress !== 'string') {
        const error = new AppError('Invalid wallet address');
        error.statusCode = 400;
        return next(error);
      }

      // Normalize wallet address to lowercase
      const normalizedAddress = walletAddress.toLowerCase();

      // Find user
      const user = await userModel.findById(id);
      if (!user) {
        const error = new AppError('User not found');
        error.statusCode = 404;
        return next(error);
      }

      // Check if wallet address already exists (case-insensitive)
      const addressExists = user.walletAddresses.some(
        (addr: Address) => addr.toLowerCase() === normalizedAddress
      );

      if (addressExists) {
        // Wallet address already exists, return success
        console.log(`✅ Wallet address already exists for user: ${normalizedAddress}`);
        res.status(200).json({
          success: true,
          message: 'Wallet address already verified',
          data: {
            walletAddress: normalizedAddress,
            isNew: false,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Add new wallet address
      user.walletAddresses.push(normalizedAddress);
      
      // If this is the first wallet, set it as primary
      if (user.walletAddresses.length === 1) {
        user.primaryWalletIndex = 0;
      }

      await user.save();

      console.log(`✅ Wallet address added successfully: ${normalizedAddress}`);

      res.status(200).json({
        success: true,
        message: 'Wallet address added successfully',
        data: {
          walletAddress: normalizedAddress,
          isNew: true,
          walletAddresses: user.walletAddresses,
          primaryWalletIndex: user.primaryWalletIndex,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Add wallet address error:', error);
      next(error);
    }
  }
}
