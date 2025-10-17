import { Router } from 'express';
import { env } from '@/config/env';

/**
 * API routes
 * @description Main API information and status endpoints
 */
const router: Router = Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Get API information
 *     description: Retrieve general information about the OneCart API
 *     tags: [API]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'OneCart API'
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: '/health'
 *                     api:
 *                       type: string
 *                       example: '/api'
 *                     location:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                           example: 'POST /api/search-location'
 *                     user:
 *                       type: object
 *                       properties:
 *                         register:
 *                           type: string
 *                           example: 'POST /api/register'
 *                         profile:
 *                           type: string
 *                           example: 'GET /api/user/:id'
 *                 documentation:
 *                   type: string
 *                   example: 'API documentation available at /api-docs'
 */
router.get('/', (_req, res) => {
  res.json({
    message: 'OneCart API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      location: {
        search: 'POST /api/search-location',
      },
      user: {
        register: 'POST /api/register',
        profile: 'GET /api/user/:id',
      },
    },
    documentation: 'API documentation available at /api/docs',
  });
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get API status
 *     description: Check if the API is running and get environment information
 *     tags: [API]
 *     responses:
 *       200:
 *         description: API status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'active'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-01T00:00:00.000Z'
 *                 environment:
 *                   type: string
 *                   example: 'development'
 */
// Example API routes
router.get('/status', (_req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

export { router as apiRoutes };
