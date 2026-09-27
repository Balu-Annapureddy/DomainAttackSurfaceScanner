import request from 'supertest';
import { app, server } from '../index';
import { db } from '../db';

function extractSessionCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  if (!header) return '';
  const cookies = Array.isArray(header) ? header : [header];
  const found = cookies.find((c: string) => c.startsWith('dass_session='));
  return found ? (found.split(';')[0] || '') : '';
}

describe('Authentication, Authorization & Quotas', () => {
  afterAll(async () => {
    await db.close();
    if (server) {
      server.close();
    }
  });

  const testEmail = `analyst-${Date.now()}@security.test`;
  const testPassword = 'StrongPassword123!';
  let authCookie: string;

  describe('Registration & Password Validation', () => {
    it('rejects registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it('rejects registration with short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('registers a user cleanly, hashes password, and sets HttpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.quota).toBeDefined();
      expect(res.body.quota.isRegistered).toBe(true);

      authCookie = extractSessionCookie(res);
      expect(authCookie).toContain('dass_session=');
    });

    it('rejects duplicate email registration with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_IN_USE');
    });
  });

  describe('Login, Session & Logout', () => {
    it('rejects invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('logs in successfully and returns updated quota', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.quota.limit).toBeGreaterThan(0);
    });

    it('returns authenticated user profile via GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.quota.isRegistered).toBe(true);
    });

    it('returns null user for unauthenticated GET /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
      expect(res.body.quota.isRegistered).toBe(false);
    });
  });

  describe('Email Verification Flow & Quota Gating', () => {
    it('gates unverified user quota to anonymous limit (5) and marks emailVerified false', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.user.emailVerified).toBe(false);
      expect(res.body.quota.limit).toBe(5); // Gated behind verification
    });

    it('rejects GET /api/auth/verify with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify?token=invalid_token_123')
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('redirects to login error page when browser visits invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify?token=invalid_token_123');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('verified=false');
    });

    it('resends verification email and updates token via POST /api/auth/resend-verification', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .set('Cookie', authCookie)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const record = await db.findUserByEmail(testEmail);
      expect(record?.verificationToken).toBeDefined();
    });

    it('verifies user email and unlocks 50 scans/hr allocation via GET /api/auth/verify', async () => {
      const record = await db.findUserByEmail(testEmail);
      expect(record?.verificationToken).toBeDefined();

      const verifyRes = await request(app)
        .get(`/api/auth/verify?token=${record!.verificationToken}`)
        .set('Accept', 'application/json');

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Check /me now reports emailVerified = true and 50 scans/hr quota
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.emailVerified).toBe(true);
      expect(meRes.body.quota.limit).toBe(50);
    });
  });

  describe('Password Reset Flow & Session Invalidation', () => {
    it('always returns 200 for POST /api/auth/forgot-password (anti-enumeration)', async () => {
      // 1. Non-existent email returns 200
      const ghostRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost-user@nonexistent.domain' });

      expect(ghostRes.status).toBe(200);
      expect(ghostRes.body.success).toBe(true);

      // 2. Existing email returns 200
      const existingRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(existingRes.status).toBe(200);
      expect(existingRes.body.success).toBe(true);

      const record = await db.findUserByEmail(testEmail);
      expect(record?.resetToken).toBeDefined();
      expect(record?.resetTokenExpiresAt).toBeDefined();
    });

    it('rejects POST /api/auth/reset-password with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'nonexistent-reset-token', password: 'NewValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_RESET_TOKEN');
    });

    it('rejects POST /api/auth/reset-password with weak password', async () => {
      const record = await db.findUserByEmail(testEmail);
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: record!.resetToken, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('successfully resets password and invalidates all previous sessions', async () => {
      const newPassword = 'BrandNewPassword456!';
      const record = await db.findUserByEmail(testEmail);

      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: record!.resetToken, password: newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Previous session cookie must now be invalid
      const checkPrevSession = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);
      expect(checkPrevSession.body.user).toBeNull();

      // Old password must fail login
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      expect(oldLogin.status).toBe(401);

      // New password must succeed
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: newPassword });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.user.email).toBe(testEmail.toLowerCase());

      // Update authCookie for any subsequent tests
      authCookie = extractSessionCookie(newLogin);
    });
  });

  describe('Authorization & Resource Ownership', () => {
    it('prevents User B from accessing User A private scan', async () => {
      // 1. User A creates a scan
      const scanRes = await request(app)
        .post('/api/scan')
        .set('Cookie', authCookie)
        .send({ domain: 'example.com' });

      expect(scanRes.status).toBe(202);
      const scanId = scanRes.body.scanId;

      // 2. User A can access their own scan
      const userAAccess = await request(app)
        .get(`/api/scan/${scanId}`)
        .set('Cookie', authCookie);
      expect(userAAccess.status).toBe(200);

      // 3. User B registers
      const userBRes = await request(app)
        .post('/api/auth/register')
        .send({ email: `user-b-${Date.now()}@security.test`, password: 'StrongPassword123!' });
      const userBCookie = extractSessionCookie(userBRes);

      // 4. User B attempts to access User A's scan -> 403 Forbidden!
      const userBAccess = await request(app)
        .get(`/api/scan/${scanId}`)
        .set('Cookie', userBCookie);

      expect(userBAccess.status).toBe(403);
      expect(userBAccess.body.code).toBe('FORBIDDEN');

      // 5. Unauthenticated user attempts to access User A's private scan -> 403 Forbidden!
      const anonAccess = await request(app).get(`/api/scan/${scanId}`);
      expect(anonAccess.status).toBe(403);
      expect(anonAccess.body.code).toBe('FORBIDDEN');
    });

    it('prevents User B from deleting User A private scan', async () => {
      // User A creates a scan
      const scanRes = await request(app)
        .post('/api/scan')
        .set('Cookie', authCookie)
        .send({ domain: 'subdomain.example.com' });
      const scanId = scanRes.body.scanId;

      // Register User C
      const userCRes = await request(app)
        .post('/api/auth/register')
        .send({ email: `user-c-${Date.now()}@security.test`, password: 'StrongPassword123!' });
      const userCCookie = extractSessionCookie(userCRes);

      // User C attempts to delete User A's scan -> 404 or 403
      const deleteRes = await request(app)
        .delete(`/api/scan/${scanId}`)
        .set('Cookie', userCCookie);

      expect([403, 404]).toContain(deleteRes.status);
    });

    it('rejects account deletion without authentication with 401', async () => {
      const res = await request(app).delete('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('executes complete account deletion and cascades removal of all user data', async () => {
      const delEmail = `delete-me-${Date.now()}@security.test`;
      const delPass = 'StrongPassword123!';

      // 1. Register temporary user
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: delEmail, password: delPass });
      expect(regRes.status).toBe(201);
      const tempCookie = extractSessionCookie(regRes);
      const userId = regRes.body.user.id;

      // 2. Attach a saved scan record directly to this user
      const mockScanId = `mock-scan-${Date.now()}`;
      await db.saveScan(
        {
          scanId: mockScanId,
          domain: 'account-deletion-check.org',
          status: 'completed',
          score: 85,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          categories: {} as any,
          assets: [],
          relationships: [],
          findings: [],
          warnings: [],
        },
        userId,
        true,
      );

      const scansBefore = await db.getUserScans(userId);
      expect(scansBefore.length).toBe(1);

      // 3. Delete account
      const delRes = await request(app)
        .delete('/api/auth/me')
        .set('Cookie', tempCookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // 4. Verify user scans are wiped
      const scansAfter = await db.getUserScans(userId);
      expect(scansAfter.length).toBe(0);

      // 5. Verify login fails with 401 for deleted user
      const reLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: delEmail, password: delPass });
      expect(reLogin.status).toBe(401);

      // 6. Verify the old session cookie is now invalid
      const checkMe = await request(app)
        .get('/api/auth/me')
        .set('Cookie', tempCookie);
      expect(checkMe.body.user).toBeNull();
    });
  });

  describe('Operational Health & Readiness Probes', () => {
    it('GET /api/health returns 200 with process liveness info without leaking secrets', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.sessionSecret).toBeUndefined();
      expect(res.body.databaseUrl).toBeUndefined();
    });

    it('GET /api/health/ready returns 200 when database persistence is ready', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(typeof res.body.activeScans).toBe('number');
      expect(res.body.persistence).toBeDefined();
    });

    it('GET /api/health/ready returns 503 if database probe fails, without leaking credentials', async () => {
      const originalFind = db.findUserById;
      db.findUserById = jest.fn().mockRejectedValue(new Error('Simulated DB connection failure: postgres://secret_user:secret_pass@10.0.0.1:5432/dass'));
      try {
        const res = await request(app).get('/api/health/ready');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('unready');
        expect(res.body.error).toBe('Database persistence unavailable');
        // Ensure sensitive error details/connection strings are sanitized
        expect(JSON.stringify(res.body)).not.toContain('secret_pass');
        expect(JSON.stringify(res.body)).not.toContain('postgres://');
      } finally {
        db.findUserById = originalFind;
      }
    });
  });
});
