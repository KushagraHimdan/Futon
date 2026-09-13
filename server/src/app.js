// @ts-check
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// JSON body parser (except for stripe webhooks which require raw buffer)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Request ID & Logging middleware
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
    customProps: (req) => ({
      companyId: req.headers['x-company-id'] || null,
      userId: req.user?.id || null,
    }),
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.env,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  req.log ? req.log.error(err) : logger.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(config.env !== 'production' ? { stack: err.stack } : {}),
  });
});
