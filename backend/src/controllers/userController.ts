import { AppError } from '@/middleware/errorHandler';
import { userModel } from '@/models/User';
import { RegisterUserRequest, RegisterUserResponse } from '@/types/user';
import { NextFunction, Request, Response } from 'express';

/**
 * User Controller
 * Handles user registration and profile management
 */
export class UserController {
  /**
   * Register a new user with social logins and addresses
   * @route POST /api/register
   * @param {RegisterUserRequest} req.body - User registration data
   * @returns {Promise<RegisterUserResponse>} Registration response with user data
   */
  static async registerUser(
    req: Request<{}, RegisterUserResponse, RegisterUserRequest>,
    res: Response<RegisterUserResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        socialLogins,
        email,
        phone,
        walletAddresses,
        addresses,
        defaultAddressIndex = -1,
        askBeforeReceiving = true,
        currentLatitude,
        currentLongitude,
      } = req.body;

      console.log(
        `👤 User registration request: phone=${phone}, socialLogins=${socialLogins.length}`
      );

      // Check if user already exists by phone
      const existingUserByPhone = await userModel.findOne({ phone });
      if (existingUserByPhone) {
        const error = new AppError(
          'User with this phone number already exists'
        );
        error.statusCode = 409;
        return next(error);
      }

      // Check if user already exists by username (from social logins)
      for (const socialLogin of socialLogins) {
        const existingUserByUsername = await userModel.findOne({
          username: socialLogin.username,
        });
        if (existingUserByUsername) {
          const error = new AppError(
            `User with username ${socialLogin.username} already exists`
          );
          error.statusCode = 409;
          return next(error);
        }
      }

      // Create user addresses with coordinates if provided
      const userAddresses = addresses.map((address, index) => ({
        name: address.name,
        address: address.address,
        floor: address.floor,
        landmark: address.landmark,
        phone: address.phone,
        save_as: address.save_as,
        latitude:
          address.latitude || (index === 0 ? currentLatitude : undefined),
        longitude:
          address.longitude || (index === 0 ? currentLongitude : undefined),
        is_default: index === defaultAddressIndex,
      }));

      // Create user
      const newUser = await userModel.create({
        username: socialLogins[0]!.username, // Use first social login as primary username
        email: email || undefined,
        phone,
        addresses: userAddresses,
        defaultAddressIndex,
        askBeforeReceiving,
        walletAddresses,
        farcasterWalletAddress: -1, // Default -1 if not connected
        primaryWalletIndex: -1, // Default -1 if no wallet selected
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
            created_at: newUser.createdAt,
            updated_at: newUser.updatedAt,
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
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      next(error);
    }
  }
}
