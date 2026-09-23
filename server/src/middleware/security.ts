import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { Express } from 'express';

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

  // Remove X-Powered-By
  app.disable('x-powered-by');
}
