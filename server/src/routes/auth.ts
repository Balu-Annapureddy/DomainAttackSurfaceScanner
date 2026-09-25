import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/crypto';
import { SESSION_COOKIE_NAME, requireAuth } from '../middleware/auth';
import { getQuotaStatus } from '../services/quotaService';
import { config } from '../config';

const router = Router();

// Conservative rate limiting for authentication endpoints to protect against brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 15, // 15 attempts per 15 minutes, relaxed during tests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.', code: 'AUTH_RATE_LIMIT' },
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSessionCookie(res: import('express').Response, sessionId: string) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearSessionCookie(res: import('express').Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    path: '/',
  });
}

/**
 * Register a new user account
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'A valid email address is required', code: 'INVALID_EMAIL' });
      return;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.reason, code: 'WEAK_PASSWORD' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists', code: 'EMAIL_IN_USE' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser(normalizedEmail, passwordHash);

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const session = await db.createSession(user.id, ip, userAgent);

    setSessionCookie(res, session.id);

    const quota = await getQuotaStatus(req, user);

    res.status(201).json({
      user,
      quota,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('[auth] Registration error:', error);
    res.status(500).json({ error: 'Unable to complete registration', code: 'SERVER_ERROR' });
  }
});

/**
 * Log in to an existing account
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required', code: 'MISSING_CREDENTIALS' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRecord = await db.findUserByEmail(normalizedEmail);
    if (!userRecord) {
      res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const isValid = await verifyPassword(password, userRecord.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const session = await db.createSession(userRecord.id, ip, userAgent);

    setSessionCookie(res, session.id);

    const user = {
      id: userRecord.id,
      email: userRecord.email,
      createdAt: userRecord.createdAt,
    };

    const quota = await getQuotaStatus(req, user);

    res.json({
      user,
      quota,
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('[auth] Login error:', error);
    res.status(500).json({ error: 'Unable to log in', code: 'SERVER_ERROR' });
  }
});

/**
 * Log out and invalidate session
 */
router.post('/logout', async (req, res) => {
  try {
    if (req.sessionId) {
      await db.deleteSession(req.sessionId);
    }
    clearSessionCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[auth] Logout error:', error);
    res.status(500).json({ error: 'Unable to log out cleanly', code: 'SERVER_ERROR' });
  }
});

/**
 * Get current authenticated user profile and quota details
 */
router.get('/me', async (req, res) => {
  try {
    const quota = await getQuotaStatus(req, req.user);
    res.json({
      user: req.user || null,
      quota,
    });
  } catch (error) {
    console.error('[auth] Check session error:', error);
    res.status(500).json({ error: 'Unable to fetch user state', code: 'SERVER_ERROR' });
  }
});

/**
 * Permanently delete authenticated user account and all associated data
 */
router.delete('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const success = await db.deleteUser(req.user.id);
    clearSessionCookie(res);

    if (!success) {
      res.status(404).json({ error: 'Account not found', code: 'USER_NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      message: 'Account, active sessions, saved scans, and quota records permanently deleted',
    });
  } catch (error) {
    console.error('[auth] Delete account error:', error);
    res.status(500).json({ error: 'Unable to delete account', code: 'SERVER_ERROR' });
  }
});

export default router;
