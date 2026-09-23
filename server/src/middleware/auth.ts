import { Request, Response, NextFunction } from 'express';

// ─── Basic Auth Middleware ────────────────────────────────────────────────────
// For V1 development. Production should use a stronger auth system.

export function adminAuth(_req: Request, _res: Response, next: NextFunction): void {
  // No login or authentication required — direct access mode
  next();
}
