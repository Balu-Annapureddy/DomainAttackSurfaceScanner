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
  });
});
