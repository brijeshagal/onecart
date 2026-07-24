import { Router } from 'express';
import { UserController } from '../controllers/userController';

/**
 * User routes
 * @description Routes for user registration and profile management
 */
const router: Router = Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Register a new user with social logins, addresses, and wallet information.
 *       
 *       Each user can maintain multiple active carts (activeCartIds) to manage orders with different receivers
 *       without interference. This enables users to send requests to multiple receivers while waiting for
 *       each receiver to confirm the receipt.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     message:
 *                       type: string
 *                       example: 'User registered successfully'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', UserController.registerUser);

/**
 * @swagger
 * /api/user/farcaster/{fid}:
 *   get:
 *     summary: Check if user exists by Farcaster FID
 *     description: |
 *       Check if a user already exists in the database by their Farcaster FID.
 *       This is used during login to determine if the user should be signed in or registered.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: fid
 *         required: true
 *         schema:
 *           type: string
 *         description: Farcaster FID
 *         example: "1234567"
 *     responses:
 *       200:
 *         description: Check completed successfully
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
 *                     exists:
 *                       type: boolean
 *                       description: Whether user exists or not
 *                     user:
 *                       description: User data (only if exists is true)
 *                       $ref: '#/components/schemas/User'
 *                     activeCart:
 *                       description: Active cart data (only if exists is true)
 *                       type: object
 *                     message:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/farcaster/:fid', UserController.getUserByFarcasterFid);

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Get user profile
 *     description: |
 *       Retrieve user profile information by ID, including all active carts, previous orders, and received orders.
 *       
 *       **activeCartIds**: Array of cart IDs that are currently active (pending receiver confirmation). 
 *       Users can have multiple active carts with different receivers simultaneously.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', UserController.getUserProfile);

/**
 * @swagger
 * /api/user/{id}/wallet-address:
 *   post:
 *     summary: Add or verify wallet address for user
 *     description: |
 *       Add a new wallet address to the user's account or verify that it already exists.
 *       This is used before crypto payments to ensure the connected wallet is registered.
 *       All addresses are stored in lowercase for consistent comparison.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address (will be normalized to lowercase)
 *                 example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *     responses:
 *       200:
 *         description: Wallet address added or verified successfully
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
 *                   example: "Wallet address added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     walletAddress:
 *                       type: string
 *                       description: The normalized wallet address
 *                     isNew:
 *                       type: boolean
 *                       description: Whether this is a new address or already existed
 *                     walletAddresses:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: All wallet addresses for the user
 *                     primaryWalletIndex:
 *                       type: number
 *                       description: Index of the primary wallet
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid wallet address
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/wallet-address', UserController.addWalletAddress);

export { router as userRoutes };
