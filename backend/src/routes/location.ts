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

/**
 * @swagger
 * /api/location/reverse-geocode:
 *   post:
 *     summary: Get location details from coordinates
 *     description: Reverse geocoding to get state, postal_code, and city from coordinates
 *     tags: [Location]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *               - address_details_info
 *             properties:
 *               lat:
 *                 type: number
 *                 format: float
 *                 example: 28.7041
 *                 description: Latitude coordinate
 *               lng:
 *                 type: number
 *                 format: float
 *                 example: 77.1025
 *                 description: Longitude coordinate
 *               address_details_info:
 *                 type: object
 *                 properties:
 *                   tower:
 *                     type: string
 *                     example: "A"
 *                   house:
 *                     type: string
 *                     example: "12"
 *                   floor:
 *                     type: string
 *                     example: "4"
 *                   phone:
 *                     type: string
 *                     example: "+1234567890"
 *                   landmark:
 *                     type: string
 *                     example: "Near Central Park"
 *                   tags:
 *                     type: string
 *                     example: "home"
 *                   template_id:
 *                     type: number
 *                     example: 1
 *                   alias_id:
 *                     type: number
 *                     example: 0
 *                   name:
 *                     type: string
 *                     example: "Home"
 *     responses:
 *       200:
 *         description: Location details retrieved successfully
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
 *                     location_info:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           example: "Delhi"
 *                         postal_code:
 *                           type: string
 *                           example: "110001"
 *                         city:
 *                           type: string
 *                           example: "New Delhi"
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
 *                     address_details_info:
 *                       type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid coordinates
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
router.post('/reverse-geocode', LocationController.reverseGeocode);

export { router as locationRoutes };
