import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { userModel } from '../models/User';
import {
  RegisterUserRequest,
  RegisterUserResponse,
} from '../types/user'; 

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

      console.log('Register request:', { phone, username, socialLogins: socialLogins ? Object.keys(socialLogins) : 'none' });

      // Check if user already exists by phone
      const existingUserByPhone = await userModel.findOne({ phone });
      if (existingUserByPhone) {
        const error = new AppError('User with this phone number already exists');
        error.statusCode = 409;
        return next(error);
      }

      // Check if user already exists by username (from social logins or direct username)
      if (socialLogins?.farcaster?.username) {
        const existingUserByUsername = await userModel.findOne({
          'socialLogins.farcaster.username': socialLogins.farcaster.username,
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
          const error = new AppError(`User with username ${username} already exists`);
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

      res.status(200).json({
        success: true,
        data: {
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
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      next(error);
    }
  }
}
