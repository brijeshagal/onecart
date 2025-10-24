import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import Razorpay from 'razorpay';
import { env } from '../config/env';
import { userModel } from '../models/User';
import { AppError } from '../middleware/errorHandler';

const razorpay = new Razorpay({
  key_id: env.RZPAY_TEST_KEY_ID || '',
  key_secret: env.RZPAY_TEST_KEY_SECRET || '',
});

export class PaymentController {
  /**
   * Create a Razorpay order
   */
  static async createOrder(
    req: Request<{}, {}, { amount: number; currency?: string; cartId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { amount, currency = 'INR', cartId } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create Razorpay order
      const options = {
        amount: Math.round(amount * 100), // Amount in paise (multiply by 100)
        currency,
        receipt: `receipt_${cartId}_${Date.now()}`,
        notes: {
          cartId,
        },
      };

      const order = await razorpay.orders.create(options);

      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Create order error:', error);
      next(error);
    }
  }

  /**
   * Verify payment signature
   */
  static async verifyPayment(
    req: Request<
      {},
      {},
      {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({
          success: false,
          error: 'Missing payment verification parameters',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create signature to verify
      const generatedSignature = crypto
        .createHmac('sha256', env['RZPAY_TEST_KEY_SECRET'] || '')
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      // Verify signature
      if (generatedSignature === razorpay_signature) {
        // Payment is verified
        // Here you can update your order status in database
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid payment signature',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Verify payment error:', error);
      next(error);
    }
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(
    req: Request<{ paymentId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      const payment = await razorpay.payments.fetch(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Get payment details error:', error);
      next(error);
    }
  }

  /**
   * Verify crypto payment transaction
   * @route POST /api/payment/verify-crypto
   * @body {string} userId - User ID
   * @body {string} txHash - Transaction hash
   * @body {number} expectedAmount - Expected payment amount in INR
   * @returns {Promise<void>}
   */
  static async verifyCryptoPayment(
    req: Request<
      {},
      {},
      {
        userId: string;
        txHash: string;
        expectedAmount: number;
      }
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, txHash, expectedAmount } = req.body;

      console.log(`🔐 Verify crypto payment: UserID=${userId}, TxHash=${txHash}`);

      if (!userId || !txHash || !expectedAmount) {
        const error = new AppError('Missing required parameters');
        error.statusCode = 400;
        return next(error);
      }

      // Find user and get their wallet addresses
      const user = await userModel.findById(userId);
      if (!user) {
        const error = new AppError('User not found');
        error.statusCode = 404;
        return next(error);
      }

      if (!user.walletAddresses || user.walletAddresses.length === 0) {
        const error = new AppError('No wallet addresses registered for user');
        error.statusCode = 400;
        return next(error);
      }

      // Normalize user's wallet addresses for comparison
      const normalizedUserAddresses = user.walletAddresses.map((addr) =>
        addr.toLowerCase()
      );

      console.log(`👤 User wallet addresses: ${normalizedUserAddresses.join(', ')}`);

      // Import viem dynamically (since it's ESM)
      const { createPublicClient, http } = await import('viem');
      const { baseSepolia } = await import('viem/chains');

      // Create public client to fetch transaction
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      // Fetch transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt) {
        const error = new AppError('Transaction not found');
        error.statusCode = 404;
        return next(error);
      }

      // Check if transaction was successful
      if (receipt.status !== 'success') {
        const error = new AppError('Transaction failed on blockchain');
        error.statusCode = 400;
        return next(error);
      }

      // Fetch transaction details to get the sender
      const transaction = await publicClient.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (!transaction) {
        const error = new AppError('Transaction details not found');
        error.statusCode = 404;
        return next(error);
      }

      // Normalize sender address
      const senderAddress = transaction.from.toLowerCase();
      console.log(`💸 Transaction sender: ${senderAddress}`);

      // Verify sender is in user's wallet addresses
      const isValidSender = normalizedUserAddresses.includes(senderAddress);

      if (!isValidSender) {
        const error = new AppError(
          `Transaction sender (${senderAddress}) does not match any registered wallet address for this user`
        );
        error.statusCode = 403;
        return next(error);
      }

      console.log(`✅ Crypto payment verified successfully`);
      console.log(`   - Transaction: ${txHash}`);
      console.log(`   - Sender: ${senderAddress}`);
      console.log(`   - Status: ${receipt.status}`);

      res.status(200).json({
        success: true,
        message: 'Crypto payment verified successfully',
        data: {
          txHash,
          sender: senderAddress,
          status: receipt.status,
          blockNumber: receipt.blockNumber.toString(),
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Verify crypto payment error:', error);
      
      // Handle specific viem errors
      if (error instanceof Error) {
        if (error.message.includes('Transaction not found')) {
          const appError = new AppError('Transaction not found on blockchain');
          appError.statusCode = 404;
          return next(appError);
        }
      }
      
      next(error);
    }
  }
}
