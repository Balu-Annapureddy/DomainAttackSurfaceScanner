import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/crypto';
import { SESSION_COOKIE_NAME, requireAuth } from '../middleware/auth';
import { getQuotaStatus } from '../services/quotaService';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { config } from '../config';

const router = Router();

// Conservative rate limiting for authentication endpoints to protect against brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.', code: 'AUTH_RATE_LIMIT' },
});

// Dedicated rate limiter for verification resends
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification email requests. Please wait a few minutes before retrying.', code: 'RESEND_RATE_LIMIT' },
});

// Dedicated rate limiter for forgot password requests to prevent abuse
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please wait before attempting again.', code: 'RESET_RATE_LIMIT' },
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

function checkAccountsEnabled(res: import('express').Response): boolean {
  if (!config.accountsEnabled) {
    res.status(503).json({
      error: 'Accounts are temporarily paused while we finish setting up email delivery — check back soon',
      code: 'ACCOUNTS_PAUSED',
    });
    return false;
  }
  return true;
}

/**
 * Register a new user account
 */
router.post('/register', authLimiter, async (req, res) => {
  if (!checkAccountsEnabled(res)) return;

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

    // Generate random 24-hour verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const user = await db.createUser(normalizedEmail, passwordHash, verificationToken, verificationExpiresAt);

    // Dispatch verification email in background (fail-safe)
    sendVerificationEmail(normalizedEmail, verificationToken).catch((err) => {
      console.error('[auth] Background verification email dispatch failed:', err);
    });

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const session = await db.createSession(user.id, ip, userAgent);

    setSessionCookie(res, session.id);

    const quota = await getQuotaStatus(req, user);

    res.status(201).json({
      user,
      quota,
      message: 'Account created successfully. Please verify your email to unlock 50 scans/hr.',
    });
  } catch (error) {
    console.error('[auth] Registration error:', error);
    res.status(500).json({ error: 'Unable to complete registration', code: 'SERVER_ERROR' });
  }
});

/**
 * Verify user email via token link
 * Supports both JSON API clients and browser redirection to confirmation page
 */
router.get('/verify', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const wantsJson = req.headers.accept?.includes('application/json');

  if (!config.accountsEnabled) {
    if (wantsJson) {
      res.status(503).json({
        error: 'Accounts are temporarily paused while we finish setting up email delivery — check back soon',
        code: 'ACCOUNTS_PAUSED',
      });
      return;
    }
    res.redirect(`${config.clientOrigin}/verify`);
    return;
  }

  if (!token) {
    if (wantsJson) {
      res.status(400).json({ error: 'Verification token is required', code: 'MISSING_TOKEN' });
      return;
    }
    res.redirect(`${config.clientOrigin}/login?verified=false&error=missing_token`);
    return;
  }

  try {
    const userRecord = await db.findUserByVerificationToken(token);

    if (!userRecord || !userRecord.verificationTokenExpiresAt || Date.now() > Date.parse(userRecord.verificationTokenExpiresAt)) {
      if (wantsJson) {
        res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
        return;
      }
      res.redirect(`${config.clientOrigin}/login?verified=false&error=invalid_or_expired_token`);
      return;
    }

    await db.verifyUserEmail(userRecord.id);

    if (wantsJson) {
      res.json({ success: true, message: 'Email verified successfully. 50 scans/hr unlocked.' });
      return;
    }

    res.redirect(`${config.clientOrigin}/login?verified=true`);
  } catch (error) {
    console.error('[auth] Verification error:', error);
    if (wantsJson) {
      res.status(500).json({ error: 'Unable to process verification', code: 'SERVER_ERROR' });
      return;
    }
    res.redirect(`${config.clientOrigin}/login?verified=false&error=server_error`);
  }
});

/**
 * Resend email verification link (rate-limited)
 */
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  if (!checkAccountsEnabled(res)) return;

  try {
    const requestedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null;
    const targetEmail = req.user?.email || requestedEmail;

    if (targetEmail && EMAIL_REGEX.test(targetEmail)) {
      const userRecord = await db.findUserByEmail(targetEmail);
      if (userRecord && !userRecord.emailVerified) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await db.setVerificationToken(userRecord.id, verificationToken, verificationExpiresAt);
        await sendVerificationEmail(userRecord.email, verificationToken);
      }
    }

    // Always return 200 to prevent email enumeration
    res.json({
      success: true,
      message: 'If an unverified account exists with this email, a fresh verification link has been sent.',
    });
  } catch (error) {
    console.error('[auth] Resend verification error:', error);
    res.status(500).json({ error: 'Unable to process verification request', code: 'SERVER_ERROR' });
  }
});

/**
 * Initiate password reset (rate-limited, returns 200 regardless of existence to prevent user enumeration)
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  if (!checkAccountsEnabled(res)) return;

  try {
    const { email } = req.body || {};

    if (email && typeof email === 'string' && EMAIL_REGEX.test(email.trim())) {
      const normalizedEmail = email.trim().toLowerCase();
      const userRecord = await db.findUserByEmail(normalizedEmail);
      if (userRecord) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        await db.setResetToken(userRecord.id, resetToken, resetTokenExpiresAt);
        await sendPasswordResetEmail(userRecord.email, resetToken);
      }
    }

    // Never leak whether email was found or not
    res.json({
      success: true,
      message: 'If an account is associated with this email address, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('[auth] Forgot password error:', error);
    res.status(500).json({ error: 'Unable to process password reset request', code: 'SERVER_ERROR' });
  }
});

/**
 * Complete password reset: update password and invalidate ALL existing sessions for this user
 */
router.post('/reset-password', authLimiter, async (req, res) => {
  if (!checkAccountsEnabled(res)) return;

  try {
    const { token, password } = req.body || {};

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Reset token is required', code: 'MISSING_TOKEN' });
      return;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.reason, code: 'WEAK_PASSWORD' });
      return;
    }

    const userRecord = await db.findUserByResetToken(token.trim());
    if (!userRecord || !userRecord.resetTokenExpiresAt || Date.now() > Date.parse(userRecord.resetTokenExpiresAt)) {
      res.status(400).json({ error: 'Invalid or expired password reset token', code: 'INVALID_RESET_TOKEN' });
      return;
    }

    const newPasswordHash = await hashPassword(password);
    await db.resetPassword(userRecord.id, newPasswordHash);

    // Security invariant: Invalidate all existing sessions for this user on reset
    await db.deleteAllUserSessions(userRecord.id);
    clearSessionCookie(res);

    res.json({
      success: true,
      message: 'Password reset successfully. All active sessions have been terminated. Please log in with your new password.',
    });
  } catch (error) {
    console.error('[auth] Reset password error:', error);
    res.status(500).json({ error: 'Unable to complete password reset', code: 'SERVER_ERROR' });
  }
});

/**
 * Log in to an existing account
 */
router.post('/login', authLimiter, async (req, res) => {
  if (!checkAccountsEnabled(res)) return;

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
      emailVerified: Boolean(userRecord.emailVerified),
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
