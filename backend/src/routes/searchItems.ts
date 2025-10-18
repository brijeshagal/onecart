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
 *   get:
 *     summary: Search for products
 *     description: Search for products based on query and location (receiver, coordinates, preset address, or new address)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           example: "milk"
 *         description: Search query string
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *           example: "664f1f77bcf86cd799439011"
 *         description: User ID to fetch context and default address
 *       - in: query
 *         name: receiverUsername
 *         required: false
 *         schema:
 *           type: string
 *           example: "john_doe"
 *         description: Username of the receiver (alternative to location coordinates)
 *       - in: query
 *         name: lat
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *           example: 28.7041
 *         description: Latitude coordinate (must be used with lng)
 *       - in: query
 *         name: lng
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *           example: 77.1025
 *         description: Longitude coordinate (must be used with lat)
 *       - in: query
 *         name: presetAddressId
 *         required: false
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of a preset address (alternative to coordinates)
 *       - in: query
 *         name: newAddress
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "Home"
 *             address:
 *               type: string
 *               example: "123 Main Street"
 *             floor:
 *               type: string
 *               example: "4th Floor"
 *             landmark:
 *               type: string
 *               example: "Near Central Park"
 *             phone:
 *               type: string
 *               example: "+1234567890"
 *             saveAs:
 *               type: string
 *               example: "home"
 *           required:
 *             - name
 *             - address
 *             - phone
 *             - saveAs
 *         description: New address object (alternative to preset address)
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *         description: Pagination offset
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *           example: 20
 *         description: Number of items per page
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
router.get('/', validateSearchItemsRequest, (req, res, next) => SearchItemsController.searchItems(req as any, res, next));

export { router as searchItemsRoutes };
