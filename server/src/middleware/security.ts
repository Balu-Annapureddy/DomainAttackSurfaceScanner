import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { Express } from 'express';

export function applySecurity(app: Express): void {
  // Secure headers with tailored CSP
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'", config.clientOrigin],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
  }));

  // Restrict sensitive browser APIs
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

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
