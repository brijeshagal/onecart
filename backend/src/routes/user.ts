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

export { router as userRoutes };
