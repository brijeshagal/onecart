import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';

const router: Router = Router();

/**
 * @swagger
 * /api/payment/create-order:
 *   post:
 *     summary: Create a Razorpay order
 *     description: Creates a Razorpay order for payment processing
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - cartId
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in rupees (will be converted to paise)
 *                 example: 500.50
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 default: INR
 *                 example: INR
 *               cartId:
 *                 type: string
 *                 description: Cart ID for reference
 *                 example: "cart_1761209168596_ny90b33fy"
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       description: Razorpay order ID
 *                     amount:
 *                       type: number
 *                       description: Amount in paise
 *                     currency:
 *                       type: string
 *                     receipt:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/create-order', PaymentController.createOrder);

/**
 * @swagger
 * /api/payment/verify:
 *   post:
 *     summary: Verify payment signature
 *     description: Verifies the Razorpay payment signature after successful payment
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *                 description: Razorpay order ID
 *                 example: "order_9A33XWu170gUtm"
 *               razorpay_payment_id:
 *                 type: string
 *                 description: Razorpay payment ID
 *                 example: "pay_29QQoUBi66xm2f"
 *               razorpay_signature:
 *                 type: string
 *                 description: Razorpay signature for verification
 *                 example: "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     paymentId:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid signature or missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/verify', PaymentController.verifyPayment);

/**
 * @swagger
 * /api/payment/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     description: Retrieves payment details from Razorpay
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay payment ID
 *         example: "pay_29QQoUBi66xm2f"
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Payment details from Razorpay
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:paymentId', PaymentController.getPaymentDetails);

/**
 * @swagger
 * /api/payment/verify-crypto:
 *   post:
 *     summary: Verify crypto payment transaction
 *     description: Verifies that a crypto transaction was sent by a registered wallet address of the user
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - txHash
 *               - expectedAmount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "507f1f77bcf86cd799439011"
 *               txHash:
 *                 type: string
 *                 description: Blockchain transaction hash
 *                 example: "0x1234567890abcdef..."
 *               expectedAmount:
 *                 type: number
 *                 description: Expected payment amount in INR
 *                 example: 500.50
 *     responses:
 *       200:
 *         description: Transaction verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Crypto payment verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     txHash:
 *                       type: string
 *                     sender:
 *                       type: string
 *                     status:
 *                       type: string
 *                     blockNumber:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request or transaction failed
 *       403:
 *         description: Sender address does not match user's registered wallet addresses
 *       404:
 *         description: Transaction or user not found
 *       500:
 *         description: Internal server error
 */
router.post('/verify-crypto', PaymentController.verifyCryptoPayment);

export { router as paymentRoutes };

