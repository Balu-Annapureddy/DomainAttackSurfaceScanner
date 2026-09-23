import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    crypto.timingSafeEqual(leftBuffer, Buffer.alloc(leftBuffer.length));
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return safeEqual(username, config.adminUsername) && safeEqual(password, config.adminPassword);
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  // Development keeps the classroom dashboard frictionless; production requires Basic Auth.
  if (!config.isDev && !verifyAdminCredentials(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ReconLab Admin"');
    res.status(401).json({ error: 'Admin authentication required', code: 'AUTH_REQUIRED' });
    return;
  }
  next();
}
