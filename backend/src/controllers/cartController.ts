import { NextFunction, Request, Response } from 'express';
import { cartModel, ICart, ISimplifiedCartItem } from '../models/Cart';
import { userModel } from '../models/User';
import { AddressData } from '../types/address';
import { CartResponse } from '../types/api';
import {
  clearCart,
  createNewCart,
  handleExistingCart,
  removeCartItem,
  validateAddToCartRequest,
  validateCartOwnership,
  validateUsersExist,
} from '../utils/cartUtils';

/**
 * Cart Controller
 * Handles multi-user cart/order operations
 */
export class CartController {
  /**
   * Add item to sender's active cart or create new cart
   * @route POST /api/cart/add
   * @param {Object} req.body - Cart add request
   * @param {string} req.body.senderUserId - Sender's User ID
   * @param {string} req.body.receiverUserId - Receiver's User ID
   * @param {AddressData} req.body.receiveAddress - Delivery address
   * @param {Object} req.body.product - Simplified product data to add
   * @param {number} req.body.quantity - Quantity of product to add
   * @param {string} req.body.orderNotes - Optional order notes
   * @returns {Promise<void>}
   */
  static async addToCart(
    req: Request<
      {},
      CartResponse,
      {
        activeCartId?: string;
        senderUserId: string;
        receiverUserId: string;
        receiveAddress: AddressData;
        itemsOrdered: ISimplifiedCartItem[];
        quantity: number;
        orderNotes?: string;
      }
    >,
    res: Response<CartResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        activeCartId,
        senderUserId,
        receiverUserId,
        receiveAddress,
        itemsOrdered,
        quantity,
        orderNotes,
      } = req.body;

      // Validate request body
      const validation = validateAddToCartRequest(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error || '',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate users exist and get sender user data
      const userValidation = await validateUsersExist(
        senderUserId,
        receiverUserId
      );
      if (!userValidation.isValid) {
        res.status(404).json({
          success: false,
          error: userValidation.error || '',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const senderUser = userValidation.sender;
      let cart: ICart;

      // Check if sender has an active cart
      if (
        activeCartId &&
        senderUser?.activeCartIds &&
        senderUser.activeCartIds.length > 0
      ) {
        // Handle existing cart - use the first active cart
        const existingCart = await cartModel.findByCartId(activeCartId);
        if (!existingCart) {
          res.status(400).json({
            success: false,
            error: 'Invalid active cart ID stored in user',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        cart = await handleExistingCart(existingCart, itemsOrdered, quantity);
      } else {
        // Create new cart
        cart = await createNewCart(
          senderUserId,
          receiverUserId,
          receiveAddress,
          itemsOrdered,
          orderNotes
        );
      }

      res.status(200).json({
        success: true,
        data: {
          cartId: cart.cartId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Add to cart error:', error);
      next(error);
    }
  }

  /**
   * Get user's active cart (as sender)
   * @route GET /api/cart/active/:userId
   * @param {string} req.params.userId - User ID (as sender)
   * @returns {Promise<void>}
   */
  static async getActiveCart(
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cart = await cartModel.findActiveCart(userId);

      if (!cart) {
        res.status(200).json({
          success: true,
          data: {
            userId,
            items: [],
            totalItems: 0,
            cartStatus: 'none',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          cartId: cart.cartId,
          senderUserId: cart.senderUserId,
          receiverUserId: cart.receiverUserId,
          receiveAddress: cart.receiveAddress,
          items: cart.itemsOrdered.map((item: ISimplifiedCartItem) => ({
            productId: item.productId,
            identityId: item.identityId,
            name: item.name,
            quantity: item.quantity,
            addedAt: item.addedAt,
          })),
          totalItems: cart.totalItems,
          cartStatus: cart.cartStatus,
          orderTimestamp: cart.orderTimestamp,
          orderNotes: cart.orderNotes,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get active cart error:', error);
      next(error);
    }
  }

  /**
   * Remove item from user's active cart
   * @route DELETE /api/cart/:userId/:productId
   * @param {string} req.params.userId - User ID (as sender)
   * @param {string} req.params.productId - Product ID to remove
   * @returns {Promise<void>}
   */
  static async removeFromCart(
    req: Request<{ userId: string; productId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, productId } = req.params;

      if (!userId || !productId) {
        res.status(400).json({
          success: false,
          error: 'User ID and Product ID are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate cart ownership
      const cartValidation = await validateCartOwnership(userId);
      if (!cartValidation.isValid) {
        res.status(404).json({
          success: false,
          error: cartValidation.error,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cart = cartValidation.cart!;

      // Remove item from cart
      const removeResult = await removeCartItem(cart, productId);
      if (!removeResult.success) {
        res.status(404).json({
          success: false,
          error: removeResult.error,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(
        `✅ Product removed from cart ${cart.cartId} for sender ${userId}`
      );

      res.status(200).json({
        success: true,
        data: {
          cartId: cart.cartId,
          totalItems: cart.totalItems,
          removedProductId: productId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Remove from cart error:', error);
      next(error);
    }
  }

  /**
   * Clear user's active cart
   * @route DELETE /api/cart/clear/:userId
   * @param {string} req.params.userId - User ID (as sender)
   * @returns {Promise<void>}
   */
  static async clearCart(
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate cart ownership
      const cartValidation = await validateCartOwnership(userId);
      if (!cartValidation.isValid) {
        if (cartValidation.error === 'No active cart found') {
          res.status(200).json({
            success: true,
            message: 'No active cart to clear',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        res.status(404).json({
          success: false,
          error: cartValidation.error,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cart = cartValidation.cart!;

      // Clear the cart
      await clearCart(cart);

      // Remove active cart reference from user's activeCartIds array
      await userModel.updateOne(
        { _id: userId },
        { $pull: { activeCartIds: cart.cartId } }
      );

      console.log(`✅ Cart ${cart.cartId} cleared for sender ${userId}`);

      res.status(200).json({
        success: true,
        data: {
          cartId: cart.cartId,
          totalItems: 0,
          cartStatus: 'cancelled',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Clear cart error:', error);
      next(error);
    }
  }

  /**
   * Get user's order history (as sender)
   * @route GET /api/cart/orders/:userId
   * @param {string} req.params.userId - User ID (as sender)
   * @returns {Promise<void>}
   */
  static async getOrderHistory(
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const orders = await cartModel.findBySenderId(userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          orders: orders.map((order: any) => ({
            cartId: order.cartId,
            receiverUserId: order.receiverUserId,
            receiveAddress: order.receiveAddress,
            items: order.itemsOrdered.map((item: ISimplifiedCartItem) => ({
              productId: item.productId,
              identityId: item.identityId,
              name: item.name,
              quantity: item.quantity,
              addedAt: item.addedAt,
            })),
            totalItems: order.totalItems,
            cartStatus: order.cartStatus,
            orderTimestamp: order.orderTimestamp,
            fulfillmentTimestamp: order.fulfillmentTimestamp,
            orderNotes: order.orderNotes,
            totalAmount: order.totalAmount,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get order history error:', error);
      next(error);
    }
  }

  /**
   * Get user's received orders (as receiver)
   * @route GET /api/cart/received/:userId
   * @param {string} req.params.userId - User ID (as receiver)
   * @returns {Promise<void>}
   */
  static async getReceivedOrders(
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const receivedOrders = await cartModel.findByReceiverId(userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          receivedOrders: receivedOrders.map((order: any) => ({
            cartId: order.cartId,
            senderUserId: order.senderUserId,
            receiveAddress: order.receiveAddress,
            items: order.itemsOrdered.map((item: ISimplifiedCartItem) => ({
              productId: item.productId,
              identityId: item.identityId,
              name: item.name,
              quantity: item.quantity,
              addedAt: item.addedAt,
            })),
            totalItems: order.totalItems,
            cartStatus: order.cartStatus,
            orderTimestamp: order.orderTimestamp,
            fulfillmentTimestamp: order.fulfillmentTimestamp,
            orderNotes: order.orderNotes,
            totalAmount: order.totalAmount,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get received orders error:', error);
      next(error);
    }
  }
}
