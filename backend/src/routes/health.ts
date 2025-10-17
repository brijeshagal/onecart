import { Router, Request, Response } from 'express';
import { env } from '../config/env';

const router: Router = Router();

// Health check endpoint
router.get('/', (_req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env['npm_package_version'] || '1.0.0',
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
  };

  res.status(200).json(healthCheck);
});

// Detailed health check
router.get('/detailed', (_req: Request, res: Response) => {
  const detailedHealth = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env['npm_package_version'] || '1.0.0',
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    memory: {
      rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
    },
    cpu: {
      usage: process.cpuUsage(),
    },
  };

  res.status(200).json(detailedHealth);
});

export { router as healthRoutes };
