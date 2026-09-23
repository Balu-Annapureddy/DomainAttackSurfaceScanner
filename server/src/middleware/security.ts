import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { Express } from 'express';
import { adminAuth } from './auth';

export function applySecurity(app: Express): void {
  // Secure headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
  }));

  // Rate limiting — general
  app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  }));

  // Stricter rate limit on demo media uploads
  app.use('/api/d/', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  }));

  // Authentication attempts get their own stricter limiter.
  app.use('/api/admin/auth', rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts', code: 'AUTH_RATE_LIMIT' },
  }));

  // Admin APIs are protected in production; development remains intentionally direct for classroom setup.
  app.use('/api/admin', adminAuth);

  // Remove X-Powered-By
  app.disable('x-powered-by');
}
