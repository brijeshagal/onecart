import { Router } from 'express';
import { SearchItemsController } from '../controllers/searchItemsController';
import { validateSearchItemsRequest } from '../middleware/validation';

/**
 * Search Items routes
 * @description Routes for product search functionality
 */
const router: Router = Router();

/**
 * @swagger
 * /api/search-items:
 *   post:
 *     summary: Search for products
 *     description: Search for products based on query and location (receiver, coordinates, preset address, or new address)
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 1
 *                 example: "milk"
 *                 description: Search query string
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: User ID (optional, used with presetAddressId)
 *               receiverUsername:
 *                 type: string
 *                 example: "john_doe"
 *                 description: Username of the receiver
 *               presetAddressId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *                 description: ID of a preset address
 *               newAddress:
 *                 type: object
 *                 description: Complete address data object
 *               offset:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 example: 0
 *                 description: Pagination offset
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *                 example: 20
 *                 description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                           image:
 *                             type: string
 *                           category:
 *                             type: string
 *                           brand:
 *                             type: string
 *                           inStock:
 *                             type: boolean
 *                           rating:
 *                             type: number
 *                           discount:
 *                             type: number
 *                     searchQuery:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [receiver, coordinates, preset_address, new_address]
 *                         receiverUsername:
 *                           type: string
 *                         coordinates:
 *                           type: object
 *                           properties:
 *                             lat:
 *                               type: number
 *                             lng:
 *                               type: number
 *                             city:
 *                               type: string
 *                         address:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             formatted:
 *                               type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         offset:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request parameters
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
router.post('/', validateSearchItemsRequest, (req, res, next) => SearchItemsController.searchItems(req as any, res, next));

export { router as searchItemsRoutes };
