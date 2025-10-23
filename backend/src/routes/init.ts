import { Router } from 'express';
import LoginController from '../controllers/loginController';

const initRouter: Router = Router();
/**
 * @swagger
 * /api/init/initialize:
 *   get:
 *     summary: Initialize user session
 *     description: Initialize user session by logging in to Blinkit. Uses a default address (Delhi Airport) for initialization.
 *     tags:
 *       - Init
 *     responses:
 *       200:
 *         description: Session initialized successfully
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
 *                     message:
 *                       type: string
 *                       example: "User session initialized successfully"
 *                     sessionActive:
 *                       type: boolean
 *                       example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
initRouter.get('/initialize', LoginController.initializeUser);

export { initRouter };
