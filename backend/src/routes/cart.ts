import { Router } from 'express';
import { CartController } from '../controllers/cartController';

/**
 * Cart routes
 * @description Shopping cart management endpoints
 */
const router: Router = Router();

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to sender's active cart
 *     description: |
 *       Add a product to the sender's active cart for delivery to a receiver.
 *
 *       **Example Request Body:**
 *       ```json
 *       {
 *         "senderUserId": "507f1f77bcf86cd799439011",
 *         "receiverUserId": "507f1f77bcf86cd799439012",
 *         "receiveAddress": {
 *           "name": "John Doe",
 *           "display_address": "123 Main St, New York, NY 10001",
 *           "line1": "123 Main St",
 *           "line2": "Apartment 4B",
 *           "latitude": 40.7128,
 *           "longitude": -74.0060,
 *           "landmark": "Near Central Park",
 *           "label": "Home"
 *         },
 *         "product": {
 *           "identity": {
 *             "id": "12872"
 *           },
 *           "product_id": "12872",
 *           "name": {
 *             "text": "Amul Gold Full Cream Milk"
 *           }
 *         },
 *         "quantity": 2,
 *         "orderNotes": "Please deliver by 5 PM"
 *       }
 *       ```
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderUserId
 *               - receiverUserId
 *               - receiveAddress
 *               - product
 *               - quantity
 *             properties:
 *               senderUserId:
 *                 type: string
 *                 description: User ID of the sender (person placing order)
 *                 example: "507f1f77bcf86cd799439011"
 *               receiverUserId:
 *                 type: string
 *                 description: User ID of the receiver (person receiving order)
 *                 example: "507f1f77bcf86cd799439012"
 *               receiveAddress:
 *                 type: object
 *                 description: Complete delivery address data
 *               product:
 *                 type: object
 *                 description: Simplified product data (only essential fields)
 *                 required:
 *                   - identity
 *                   - product_id
 *                   - name
 *                 properties:
 *                   identity:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "12872"
 *                   product_id:
 *                     type: string
 *                     example: "12872"
 *                   name:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                         example: "Amul Gold Full Cream Milk"
 *                 example: {
 *                   "identity": {
 *                     "id": "12872"
 *                   },
 *                   "product_id": "12872",
 *                   "name": {
 *                     "text": "Amul Gold Full Cream Milk"
 *                   }
 *                 }
 *               quantity:
 *                 type: number
 *                 description: Quantity of product to add
 *                 minimum: 1
 *                 example: 2
 *               orderNotes:
 *                 type: string
 *                 description: Optional order notes
 *                 example: "Please deliver by 5 PM"
 *     responses:
 *       200:
 *         description: Product added to cart successfully
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
 *                     cartId:
 *                       type: string
 *                     senderUserId:
 *                       type: string
 *                     receiverUserId:
 *                       type: string
 *                     totalItems:
 *                       type: number
 *                     cartStatus:
 *                       type: string
 *                     product:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: string
 *                           example: "12872"
 *                         identityId:
 *                           type: string
 *                           example: "12872"
 *                         name:
 *                           type: string
 *                           example: "Amul Gold Full Cream Milk"
 *                         quantity:
 *                           type: number
 *                           example: 2
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *             example:
 *               success: true
 *               data:
 *                 cartId: "cart_1705314600000_abc123def"
 *                 senderUserId: "507f1f77bcf86cd799439011"
 *                 receiverUserId: "507f1f77bcf86cd799439012"
 *                 totalItems: 2
 *                 cartStatus: "open"
 *                 product:
 *                   productId: "12872"
 *                   identityId: "12872"
 *                   name: "Amul Gold Full Cream Milk"
 *                   quantity: 2
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - missing required fields or invalid quantity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Sender ID, receiver ID, address, product data, and quantity are required"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       404:
 *         description: Sender or receiver not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Sender or receiver not found"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 */
router.post('/add', CartController.addToCart);

/**
 * @swagger
 * /api/cart/active/{userId}:
 *   get:
 *     summary: Get user's active cart (as sender)
 *     description: Retrieve the user's active cart where they are the sender
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (as sender)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Active cart retrieved successfully
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
 *                     cartId:
 *                       type: string
 *                     senderUserId:
 *                       type: string
 *                     receiverUserId:
 *                       type: string
 *                     receiveAddress:
 *                       type: object
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                             example: "12872"
 *                           identityId:
 *                             type: string
 *                             example: "12872"
 *                           name:
 *                             type: string
 *                             example: "Amul Gold Full Cream Milk"
 *                           quantity:
 *                             type: number
 *                             example: 2
 *                           addedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                     totalItems:
 *                       type: number
 *                     cartStatus:
 *                       type: string
 *                     orderTimestamp:
 *                       type: string
 *                       format: date-time
 *                     orderNotes:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No active cart found
 *       500:
 *         description: Internal server error
 */
router.get('/active/:userId', CartController.getActiveCart);

/**
 * @swagger
 * /api/cart/orders/{userId}:
 *   get:
 *     summary: Get user's order history (as sender)
 *     description: Retrieve all orders placed by the user as sender
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (as sender)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cartId:
 *                             type: string
 *                           receiverUserId:
 *                             type: string
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 productId:
 *                                   type: string
 *                                   example: "12872"
 *                                 identityId:
 *                                   type: string
 *                                   example: "12872"
 *                                 name:
 *                                   type: string
 *                                   example: "Amul Gold Full Cream Milk"
 *                                 quantity:
 *                                   type: number
 *                                   example: 2
 *                                 addedAt:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2024-01-15T10:30:00.000Z"
 *                           totalItems:
 *                             type: number
 *                           cartStatus:
 *                             type: string
 *                           orderTimestamp:
 *                             type: string
 *                             format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/orders/:userId', CartController.getOrderHistory);

/**
 * @swagger
 * /api/cart/received/{userId}:
 *   get:
 *     summary: Get user's received orders (as receiver)
 *     description: Retrieve all orders received by the user as receiver
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (as receiver)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Received orders retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     receivedOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cartId:
 *                             type: string
 *                           senderUserId:
 *                             type: string
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 productId:
 *                                   type: string
 *                                   example: "12872"
 *                                 identityId:
 *                                   type: string
 *                                   example: "12872"
 *                                 name:
 *                                   type: string
 *                                   example: "Amul Gold Full Cream Milk"
 *                                 quantity:
 *                                   type: number
 *                                   example: 2
 *                                 addedAt:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2024-01-15T10:30:00.000Z"
 *                           totalItems:
 *                             type: number
 *                           cartStatus:
 *                             type: string
 *                           orderTimestamp:
 *                             type: string
 *                             format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/received/:userId', CartController.getReceivedOrders);

/**
 * @swagger
 * /api/cart/{userId}/{productId}:
 *   delete:
 *     summary: Remove item from user's active cart
 *     description: Remove a specific product from the user's active cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (as sender)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to remove
 *         example: "product_123"
 *     responses:
 *       200:
 *         description: Product removed from cart successfully
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
 *                     cartId:
 *                       type: string
 *                     totalItems:
 *                       type: number
 *                     removedProductId:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Cart or product not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:userId/:productId', CartController.removeFromCart);

/**
 * @swagger
 * /api/cart/clear/{userId}:
 *   delete:
 *     summary: Clear user's active cart
 *     description: Remove all items from the user's active cart and cancel it
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (as sender)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Cart cleared successfully
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
 *                     cartId:
 *                       type: string
 *                     totalItems:
 *                       type: number
 *                       example: 0
 *                     cartStatus:
 *                       type: string
 *                       example: "cancelled"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No active cart found
 *       500:
 *         description: Internal server error
 */
router.delete('/clear/:userId', CartController.clearCart);

export { router as cartRoutes };
