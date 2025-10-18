import { Router } from 'express';
import { FeedController } from '../controllers/feedController';
import { validateFeedRequest } from '../middleware/validation';

/**
 * Feed routes
 * @description Routes for home page product feed based on location (Blinkit India)
 */
const router: Router = Router();

/**
 * @swagger
 * /api/feed:
 *   get:
 *     summary: Get home page product feed
 *     description: Get curated product feed based on user's location for Blinkit India
 *     tags: [Feed]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           example: 12.9716
 *         description: Latitude coordinate
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           example: 77.5946
 *         description: Longitude coordinate
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
 *         description: Feed data retrieved successfully
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
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: "Feed sections (categories, products, banners)"
 *                     location:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
 *                         city:
 *                           type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         offset:
 *                           type: number
 *                         limit:
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
router.get('/', validateFeedRequest, (req, res, next) =>
  FeedController.getFeed(req as any, res, next)
);

export { router as feedRoutes };
