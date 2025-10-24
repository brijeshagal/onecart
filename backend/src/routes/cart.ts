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
 *       Add product(s) to the sender's active cart for delivery to a receiver.
 *
 *       **Behavior:**
 *       - If an `activeCartId` is provided in the request, items are added to that specific cart.
 *       - If `activeCartId` is not provided but sender has active carts, items are added to the first active cart.
 *       - If sender has no active carts, a new cart is created.
 *       - Users can maintain multiple active carts with different receivers, preventing interference when a receiver confirms orders.
 *
 *       **Example Request Body:**
 *       ```json
 *       {
 *         "senderUserId": "507f1f77bcf86cd799439011",
 *         "receiverUserId": "507f1f77bcf86cd799439012",
 *         "activeCartId": "cart_1705314600000_abc123def",
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
 *         "receiverCountryCode": "US",
 *         "items": [
 *           {
 *             "productId": "12872",
 *             "identityId": "12872",
 *             "name": "Amul Gold Full Cream Milk",
 *             "quantity": 2,
 *             "price": {
 *               "senderCurrencyValue": 10.50,
 *               "receiverCurrencyValue": 8.99
 *             }
 *           }
 *         ],
 *         "quantity": 2,
 *         "totalAmount": {
 *           "senderCurrencyValue": 21.00,
 *           "receiverCurrencyValue": 17.98
 *         },
 *         "paymentMode": "card",
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
 *               - items
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
 *               activeCartId:
 *                 type: string
 *                 description: Optional - Specific cart ID to add items to. If provided, items are added to this cart. If not provided, system uses the first active cart or creates a new one.
 *                 example: "cart_1705314600000_abc123def"
 *               receiveAddress:
 *                 type: object
 *                 description: Complete delivery address data
 *                 required:
 *                   - name
 *                   - display_address
 *                   - line1
 *                   - latitude
 *                   - longitude
 *                   - label
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Recipient name
 *                     example: "John Doe"
 *                   display_address:
 *                     type: string
 *                     description: Full address display
 *                     example: "123 Main St, New York, NY 10001"
 *                   line1:
 *                     type: string
 *                     description: Primary address line
 *                     example: "123 Main St"
 *                   line2:
 *                     type: string
 *                     description: Secondary address line (optional)
 *                     example: "Apartment 4B"
 *                   latitude:
 *                     type: number
 *                     description: Latitude coordinate
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     description: Longitude coordinate
 *                     example: -74.0060
 *                   landmark:
 *                     type: string
 *                     description: Nearby landmark (optional)
 *                     example: "Near Central Park"
 *                   label:
 *                     type: string
 *                     description: Address label
 *                     example: "Home"
 *                 example:
 *                   name: "John Doe"
 *                   display_address: "123 Main St, New York, NY 10001"
 *                   line1: "123 Main St"
 *                   line2: "Apartment 4B"
 *                   latitude: 40.7128
 *                   longitude: -74.0060
 *                   landmark: "Near Central Park"
 *                   label: "Home"
 *               receiverCountryCode:
 *                 type: string
 *                 description: Country code of receiver's address (e.g., US, IN, GB)
 *                 example: "US"
 *               items:
 *                 type: array
 *                 description: Array of simplified product items to add to cart
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - identityId
 *                     - name
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                       example: "12872"
 *                     identityId:
 *                       type: string
 *                       description: Identity ID (usually same as productId)
 *                       example: "12872"
 *                     name:
 *                       type: string
 *                       description: Product name
 *                       example: "Amul Gold Full Cream Milk"
 *                     quantity:
 *                       type: number
 *                       description: Quantity of this item
 *                       minimum: 1
 *                       example: 2
 *                     price:
 *                       type: object
 *                       description: Product price in dual currencies
 *                       properties:
 *                         senderCurrencyValue:
 *                           type: number
 *                           description: Price in sender's local currency
 *                           example: 10.50
 *                         receiverCurrencyValue:
 *                           type: number
 *                           description: Price in receiver's local currency
 *                           example: 8.99
 *                 example: [
 *                   {
 *                     "productId": "12872",
 *                     "identityId": "12872",
 *                     "name": "Amul Gold Full Cream Milk",
 *                     "quantity": 2,
 *                     "price": {
 *                       "senderCurrencyValue": 10.50,
 *                       "receiverCurrencyValue": 8.99
 *                     }
 *                   }
 *                 ]
 *               quantity:
 *                 type: number
 *                 description: Quantity for the items being added
 *                 minimum: 1
 *                 example: 2
 *               totalAmount:
 *                 type: object
 *                 description: Total cart amount in dual currencies
 *                 properties:
 *                   senderCurrencyValue:
 *                     type: number
 *                     description: Total in sender's local currency
 *                     example: 21.00
 *                   receiverCurrencyValue:
 *                     type: number
 *                     description: Total in receiver's local currency
 *                     example: 17.98
 *               paymentMode:
 *                 type: string
 *                 description: Payment method for the order
 *                 enum: ['cash', 'card', 'wallet', 'upi', 'bank_transfer']
 *                 example: "card"
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
 *                       description: Unique cart identifier
 *                       example: "cart_1705314600000_abc123def"
 *                     senderUserId:
 *                       type: string
 *                       description: User ID of the sender
 *                       example: "507f1f77bcf86cd799439011"
 *                     receiverUserId:
 *                       type: string
 *                       description: User ID of the receiver
 *                       example: "507f1f77bcf86cd799439012"
 *                     totalItems:
 *                       type: number
 *                       description: Total quantity of all items in cart
 *                       example: 2
 *                     cartStatus:
 *                       type: string
 *                       description: Current cart status
 *                       enum: ['open', 'in-progress', 'fulfilled', 'cancelled']
 *                       example: "open"
 *                     receiverCountryCode:
 *                       type: string
 *                       description: Country code of receiver's address
 *                       example: "US"
 *                     totalAmount:
 *                       type: object
 *                       description: Total amount in dual currencies
 *                       properties:
 *                         senderCurrencyValue:
 *                           type: number
 *                           example: 21.00
 *                         receiverCurrencyValue:
 *                           type: number
 *                           example: 17.98
 *                     paymentMode:
 *                       type: string
 *                       description: Selected payment mode
 *                       enum: ['cash', 'card', 'wallet', 'upi', 'bank_transfer']
 *                       example: "card"
 *                     paymentStatus:
 *                       type: string
 *                       description: Payment status
 *                       enum: ['pending', 'completed', 'failed']
 *                       example: "pending"
 *                     items:
 *                       type: array
 *                       description: Array of items in the cart
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
 *                           price:
 *                             type: object
 *                             description: Product price in dual currencies
 *                             properties:
 *                               senderCurrencyValue:
 *                                 type: number
 *                                 example: 10.50
 *                               receiverCurrencyValue:
 *                                 type: number
 *                                 example: 8.99
 *                           addedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
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
 *                 receiverCountryCode: "US"
 *                 totalAmount:
 *                   senderCurrencyValue: 21.00
 *                   receiverCurrencyValue: 17.98
 *                 paymentMode: "card"
 *                 paymentStatus: "pending"
 *                 items:
 *                   - productId: "12872"
 *                     identityId: "12872"
 *                     name: "Amul Gold Full Cream Milk"
 *                     quantity: 2
 *                     price:
 *                       senderCurrencyValue: 10.50
 *                       receiverCurrencyValue: 8.99
 *                     addedAt: "2024-01-15T10:30:00.000Z"
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
 * /api/cart/{userId}/{cartId}/{productId}:
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
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart ID
 *         example: "cart_1761209168596_ny90b33fy"
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
router.get('/remove/:userId/:cartId/:productId', CartController.removeFromCart);

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

/**
 * @swagger
 * /api/cart/checkout/{userId}/{cartId}:
 *   post:
 *     summary: Get cart checkout details
 *     description: |
 *       Retrieve detailed checkout information for a specific cart including pricing, delivery details, and available payment options.
 *       
 *       **Returns:**
 *       - Complete cart checkout data from Blinkit API
 *       - Pricing breakdown with all charges
 *       - Delivery time estimates
 *       - Payment options and restrictions
 *       
 *       **Use Cases:**
 *       - Display final pricing before checkout
 *       - Show delivery time estimates
 *       - Validate cart before payment
 *       
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "68f74f252122160e209f4c89"
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart ID
 *         example: "cart_1761209168596_ny90b33fy"
 *       - in: body
 *         name: receiveAddress
 *         required: true
 *         schema:
 *           type: object
 *         description: Receive address
 *         example:
 *           name: "John Doe"
 *           display_address: "123 Main St, New York, NY 10001"
 *           line1: "123 Main St"
 *           line2: "Apartment 4B"
 *           latitude: 40.7128
 *           longitude: -74.0060
 *           landmark: "Near Central Park"
 *           label: "Home"
 *     responses:
 *       200:
 *         description: Cart checkout details retrieved successfully
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
 *                   description: Complete checkout data from Blinkit API
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-23T11:56:03.630Z"
 *       404:
 *         description: Cart not found
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
 *                   example: "Cart not found"
 *       500:
 *         description: Internal server error
 */
router.post('/checkout/:userId/:cartId', CartController.getCartCheckoutDetails);


export { router as cartRoutes };
