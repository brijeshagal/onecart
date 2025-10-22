import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { validateSearchLocation } from '../middleware/validation';

/**
 * Location routes
 * @description Routes for location search operations
 */
const router: Router = Router();

/**
 * @swagger
 * /api/location/search:
 *   get:
 *     summary: Search for location suggestions
 *     description: Search for address suggestions using Blinkit API based on coordinates and query
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           example: 28.7041
 *         description: Latitude coordinate
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           example: 77.1025
 *         description: Longitude coordinate
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "Delhi"
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Location suggestions retrieved successfully
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
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UISuggestion'
 *                     query:
 *                       type: string
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
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
router.get('/search', validateSearchLocation, LocationController.searchLocation);

export { router as locationRoutes };
