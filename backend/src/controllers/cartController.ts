import { NextFunction, Request, Response } from 'express';
import { cartModel, ICart, ISimplifiedCartItem } from '../models/Cart';
import { userModel } from '../models/User';
import { AddressData } from '../types/address';
import { CartResponse } from '../types/api';
// UUID generation using crypto module
const generateCartId = () =>
  `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

      if (
        !senderUserId ||
        !receiverUserId ||
        !receiveAddress ||
        !itemsOrdered.length
      ) {
        res.status(400).json({
          success: false,
          error:
            'Sender ID, receiver ID, address, product data, and quantity are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (quantity < 1) {
        res.status(400).json({
          success: false,
          error: 'Quantity must be at least 1',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verify both users exist
      const sender = await userModel.findById(senderUserId);
      const receiver = await userModel.findById(receiverUserId);

      if (!sender || !receiver) {
        res.status(404).json({
          success: false,
          error: 'Sender or receiver not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (activeCartId) {
        // Find or create active cart for sender
        const existingCart = await cartModel.findByCartId(activeCartId);

        if (!existingCart) {
          res.json({
            success: false,
            error: 'Invalid active cart ID',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        existingCart.itemsOrdered = itemsOrdered.map(
          (item: ISimplifiedCartItem) => {
            const itemIndex = existingCart.itemsOrdered.findIndex(
              (i: ISimplifiedCartItem) => i.productId === item.productId
            );
            return itemIndex !== -1
              ? {
                  ...existingCart.itemsOrdered[itemIndex]!,
                  quantity:
                    existingCart.itemsOrdered[itemIndex]!.quantity! + quantity,
                }
              : { ...item, quantity: quantity };
          }
        );

        existingCart.totalItems = existingCart.itemsOrdered.reduce(
          (total: number, item: ISimplifiedCartItem) => total + item.quantity!,
          0
        );

        await existingCart.save();

        res.status(200).json({
          success: true,
          data: {
            cartId: existingCart.cartId,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        const newCart: ICart = {
          cartId: generateCartId(),
          senderUserId,
          receiverUserId,
          receiveAddress,
          itemsOrdered,
          totalItems: itemsOrdered.reduce(
            (total: number, item: ISimplifiedCartItem) =>
              total + item.quantity!,
            0
          ),
          cartStatus: 'open',
          orderTimestamp: new Date(),
          orderNotes: orderNotes || '',
        };

        await cartModel.create(newCart);

        await userModel.updateOne(
          { _id: senderUserId },
          { activeCartId: newCart.cartId }
        );

        res.status(200).json({
          success: true,
          data: {
            cartId: newCart.cartId,
          },
        });
      }
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

      const cart = await cartModel.findActiveCart(userId);

      if (!cart) {
        res.status(404).json({
          success: false,
          error: 'Active cart not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Find the product in cart
      const productIndex = cart.itemsOrdered.findIndex(
        (item: ISimplifiedCartItem) => item.productId === productId
      );

      if (productIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Product not found in cart',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Remove the product from cart
      cart.itemsOrdered.splice(productIndex, 1);

      // Recalculate total items
      cart.totalItems = cart.itemsOrdered.reduce(
        (total: number, item: ISimplifiedCartItem) => total + item.quantity,
        0
      );

      // Save updated cart
      await cartModel.updateOne(
        { cartId: cart.cartId },
        {
          itemsOrdered: cart.itemsOrdered,
          totalItems: cart.itemsOrdered.length,
        }
      );

      console.log(
        `✅ Product removed from cart ${cart.cartId} for sender ${userId}`
      );

      res.status(200).json({
        success: true,
        data: {
          cartId: cart.cartId,
          totalItems: cart.itemsOrdered.length,
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

      const cart = await cartModel.findActiveCart(userId);

      if (!cart) {
        res.status(200).json({
          success: true,
          message: 'No active cart to clear',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Clear the cart
      await cartModel.updateOne(
        { cartId: cart.cartId },
        {
          itemsOrdered: [],
          totalItems: 0,
          cartStatus: 'cancelled',
        }
      );

      // Remove active cart reference from user
      await userModel.updateOne({ _id: userId }, { activeCartId: null });

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
