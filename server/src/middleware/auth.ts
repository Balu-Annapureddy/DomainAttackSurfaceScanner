import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import type { User } from '../../../shared/types';

export const SESSION_COOKIE_NAME = 'dass_session';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
      sessionId?: string | null;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.user = null;
  req.sessionId = null;

  try {
    // 1. Check HttpOnly cookie
    let sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    // 2. Check Authorization Bearer header as API alternative
    if (!sessionId && req.headers.authorization?.startsWith('Bearer ')) {
      sessionId = req.headers.authorization.slice(7).trim();
    }

    if (sessionId && typeof sessionId === 'string') {
      const sessionData = await db.getSession(sessionId);
      if (sessionData) {
        req.user = sessionData.user;
        req.sessionId = sessionData.session.id;
      }
    }
  } catch (err) {
    console.error('[auth] Error checking session:', err);
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required. Please log in to access this resource.',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  next();
}
