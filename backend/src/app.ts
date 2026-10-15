import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

import authRoutes from './routes/auth.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import reviewsRoutes, { documentReviewRouter } from './routes/reviews.routes.js';
import chatRoutes from './routes/chat.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import exportRoutes from './routes/export.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

export const createApp = () => {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration supporting local dev and Vercel production domains
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === config.FRONTEND_URL ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Logging
  app.use(morgan('dev'));

  // Body Parsing
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Routes
  app.use('/api', authRoutes);
  app.use('/api/documents', documentReviewRouter);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/exports', exportRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
