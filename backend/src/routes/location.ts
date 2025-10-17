import { Router } from 'express';
import { LocationController } from '@/controllers/locationController';
import { validateSearchLocation } from '@/middleware/validation';

/**
 * Location routes
 * @description Routes for location search operations
 */
const router: Router = Router();

/**
 * @swagger
 * /api/search-location:
 *   post:
 *     summary: Search for location suggestions
 *     description: Search for address suggestions using Blinkit API based on coordinates and query
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchLocationRequest'
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
router.post('/search-location', validateSearchLocation, LocationController.searchLocation);

export { router as locationRoutes };
