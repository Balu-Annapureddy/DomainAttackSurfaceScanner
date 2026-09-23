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

  // Keep all API traffic bounded; scan creation has a stricter route-specific limiter.
  app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  }));

  app.disable('x-powered-by');
}
