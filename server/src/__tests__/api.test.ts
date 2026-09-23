// API integration tests — deferred, updated to compile against new routes
// Run with: npm test (when ready)

import request from 'supertest';
import express from 'express';
import { clearAllSessions, createSession, getSession, terminateSession } from '../services/sessionStore';
import adminRouter from '../routes/admin';
import visitorRouter from '../routes/visitor';
import path from 'path';
import fs from 'fs';

const defaultParams = {
  mediaType: 'image' as const,
  durationHours: 1,
  theme: 'test',
  themeLabel: 'Test',
  themeCaption: 'Test caption',
  themeLinkText: 'Open',
  themeEmoji: '🔗',
};

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api/r', visitorRouter);

beforeEach(() => {
  clearAllSessions();
});

describe('Admin API', () => {
  test('GET /api/admin/urls — empty list', async () => {
    const res = await request(app).get('/api/admin/urls');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /api/admin/stats', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.activeUrls).toBe(0);
  });

  test('POST /api/admin/urls — image with URL', async () => {
    const res = await request(app)
      .post('/api/admin/urls')
      .field('mediaType', 'image')
      .field('durationHours', '1')
      .field('contentUrl', 'https://example.com/image.jpg')
      .field('theme', 'test')
      .field('themeLabel', 'Test')
      .field('themeCaption', 'Test caption')
      .field('themeLinkText', 'Open')
      .field('themeEmoji', '🔗');

    expect(res.status).toBe(201);
    expect(res.body.demoId).toBeDefined();
    expect(res.body.visitorUrl).toContain('/r/');
  });

  test('POST /api/admin/urls — reject image without URL', async () => {
    const res = await request(app)
      .post('/api/admin/urls')
      .field('mediaType', 'image')
      .field('durationHours', '1')
      .field('theme', 'test')
      .field('themeLabel', 'Test')
      .field('themeCaption', '')
      .field('themeLinkText', 'Open')
      .field('themeEmoji', '🔗');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_CONTENT_URL');
  });

  test('POST /api/admin/urls/:id/terminate', async () => {
    const session = createSession(defaultParams);
    const res = await request(app).post(`/api/admin/urls/${session.demoId}/terminate`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('terminated');
  });

  test('GET /api/admin/urls/:id — not found', async () => {
    const res = await request(app).get('/api/admin/urls/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('Visitor API', () => {
  test('GET /api/r/:token — valid token', async () => {
    const session = createSession(defaultParams);
    const res = await request(app).get(`/api/r/${session.demoId}`);
    expect(res.status).toBe(200);
    expect(res.body.demoId).toBe(session.demoId);
  });

  test('GET /api/r/:token — invalid token returns 404', async () => {
    const res = await request(app).get('/api/r/nonexistent');
    expect(res.status).toBe(404);
  });

  test('GET /api/r/:token — terminated returns 410', async () => {
    const session = createSession(defaultParams);
    terminateSession(session.demoId);
    const res = await request(app).get(`/api/r/${session.demoId}`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('TERMINATED');
  });

  test('POST /api/r/:token/start — records visit', async () => {
    const session = createSession(defaultParams);
    const res = await request(app)
      .post(`/api/r/${session.demoId}/start`)
      .send({ screenWidth: 1920, screenHeight: 1080 });
    expect(res.status).toBe(200);
    const s = getSession(session.demoId)!;
    expect(s.visitCount).toBe(1);
    expect(s.status).toBe('visited');
  });

  test('POST /api/r/:token/location', async () => {
    const session = createSession(defaultParams);
    const res = await request(app)
      .post(`/api/r/${session.demoId}/location`)
      .send({ latitude: 40.7128, longitude: -74.006, accuracy: 10 });
    expect(res.status).toBe(200);
    expect(res.body.locationPermission).toBe('granted');
  });

  test('POST /api/r/:token/permission', async () => {
    const session = createSession(defaultParams);
    const res = await request(app)
      .post(`/api/r/${session.demoId}/permission`)
      .send({ permission: 'camera', status: 'denied' });
    expect(res.status).toBe(200);
    const s = getSession(session.demoId)!;
    expect(s.cameraPermission).toBe('denied');
  });
});

afterAll(() => {
  const uploadsDir = path.resolve('./uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach(f => {
      try { fs.unlinkSync(path.join(uploadsDir, f)); } catch { /* ignore cleanup error */ }
    });
  }
});
