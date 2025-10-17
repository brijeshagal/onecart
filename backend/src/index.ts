import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from '@/config/env';
import { database } from '@/config/database';
import { swaggerSpec } from '@/config/swagger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { apiRoutes } from '@/routes/api';
import { healthRoutes } from '@/routes/health';
import { locationRoutes } from '@/routes/location';
import { userRoutes } from '@/routes/user';
import * as swaggerUi from 'swagger-ui-express';

const app: Application = express();
const PORT = env.PORT;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);
app.use('/api', locationRoutes);
app.use('/api', userRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OneCart API Documentation',
}));

// Serve swagger.json
app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'OneCart Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database connection (don't exit on failure for development)
database.connect().then(() => {
  console.log('✅ MongoDB connected successfully');
}).catch((error) => {
  console.warn('⚠️ MongoDB connection failed, running in fallback mode:', error.message);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 MongoDB: ${database.getConnectionStatus() ? 'Connected' : 'Disconnected'}`);
});

export default app;
