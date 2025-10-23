import { NextFunction, Request, Response } from 'express';
import { loginUser } from '../utils/blinkit/loginUtils';

class LoginController {
  /**
   * Initialize user session by logging in
   * @route GET /api/init/initialize
   */
  static async initializeUser(
    _req: Request<{}, {}, {}>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const address = 'Indiranagar, Bangalore, Karnataka, India';

      console.log('🔄 Initializing user session...');

      // Call loginUser to initialize session
      const { page } = await loginUser(address);

      // Close the page after initialization
      await page.close();

      console.log('✅ User session initialized successfully');

      res.status(200).json({
        success: true,
        data: {
          message: 'User session initialized successfully',
          sessionActive: true,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Initialize user error:', error);
      next(error);
    }
  }
}

export default LoginController;