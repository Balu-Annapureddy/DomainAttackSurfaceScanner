// Tests deferred — updated to compile against new API
// Run with: npm test (when ready)

import {
  createSession,
  getSession,
  getAllSessions,
  terminateSession,
  isSessionUsable,
  recordVisit,
  updateLocation,
  updatePermission,
  setPhotoRef,
  runExpiredCleanup,
  clearAllSessions,
} from '../services/sessionStore';
import { NetworkInfo } from '../types';

beforeEach(() => {
  clearAllSessions();
});

const defaultParams = {
  mediaType: 'image' as const,
  durationHours: 1,
  theme: 'test',
  themeLabel: 'Test',
  themeCaption: 'Test caption',
  themeLinkText: 'Open',
  themeEmoji: '🔗',
};

const mockNetworkInfo: NetworkInfo = {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 Test',
  browser: 'Chrome',
  browserVersion: '120.0',
  os: 'Windows',
  osVersion: '11',
  platform: 'Windows 11',
  deviceCategory: 'desktop',
  referrer: null,
  timestamp: new Date().toISOString(),
  accept: null,
  acceptLanguage: 'en-US',
  acceptEncoding: 'gzip, deflate, br',
  origin: null,
  secFetchSite: null,
  secFetchMode: null,
  secFetchDest: null,
  uaClientHint: null,
};

describe('Session Lifecycle', () => {
  test('create session with theme', () => {
    const session = createSession(defaultParams);
    expect(session.demoId).toBeDefined();
    expect(session.demoId.length).toBe(16);
    expect(session.status).toBe('active');
    expect(session.theme).toBe('test');
    expect(session.visitCount).toBe(0);
  });

  test('valid token returns session', () => {
    const session = createSession(defaultParams);
    const retrieved = getSession(session.demoId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.demoId).toBe(session.demoId);
  });

  test('invalid token returns undefined', () => {
    expect(getSession('nonexistent-token')).toBeUndefined();
  });

  test('expired token is not usable', () => {
    const session = createSession(defaultParams);
    const s = getSession(session.demoId)!;
    (s as any).expiresAt = new Date(Date.now() - 1000).toISOString();
    expect(isSessionUsable(s)).toBe(false);
  });

  test('terminated token is not usable', () => {
    const session = createSession(defaultParams);
    terminateSession(session.demoId);
    const s = getSession(session.demoId)!;
    expect(s.status).toBe('terminated');
    expect(isSessionUsable(s)).toBe(false);
  });

  test('list all sessions', () => {
    createSession(defaultParams);
    createSession({ ...defaultParams, mediaType: 'pdf' });
    createSession({ ...defaultParams, mediaType: 'video' });
    expect(getAllSessions().length).toBe(3);
  });
});

describe('Visit Tracking', () => {
  test('record visit increments count', () => {
    const session = createSession(defaultParams);
    recordVisit(session.demoId, mockNetworkInfo);
    const s = getSession(session.demoId)!;
    expect(s.status).toBe('visited');
    expect(s.visitCount).toBe(1);
    expect(s.visitedAt).toBeDefined();
    expect(s.networkInfo?.ipAddress).toBe('192.168.1.1');
  });

  test('multiple visits increment count', () => {
    const session = createSession(defaultParams);
    recordVisit(session.demoId, mockNetworkInfo);
    recordVisit(session.demoId, mockNetworkInfo);
    recordVisit(session.demoId, mockNetworkInfo);
    const s = getSession(session.demoId)!;
    expect(s.visitCount).toBe(3);
  });

  test('update location', () => {
    const session = createSession(defaultParams);
    updateLocation(session.demoId, { latitude: 40.7128, longitude: -74.006, accuracy: 10, timestamp: new Date().toISOString() });
    const s = getSession(session.demoId)!;
    expect(s.location?.latitude).toBe(40.7128);
    expect(s.locationPermission).toBe('granted');
  });

  test('update permissions', () => {
    const session = createSession(defaultParams);
    updatePermission(session.demoId, 'camera', 'denied');
    updatePermission(session.demoId, 'microphone', 'granted');
    const s = getSession(session.demoId)!;
    expect(s.cameraPermission).toBe('denied');
    expect(s.microphonePermission).toBe('granted');
  });

  test('set photo ref', () => {
    const session = createSession(defaultParams);
    setPhotoRef(session.demoId, 'photo_123.jpg');
    const s = getSession(session.demoId)!;
    expect(s.capturedPhotoRef).toBe('photo_123.jpg');
    expect(s.cameraPermission).toBe('granted');
  });

  test('expiry cleanup', () => {
    const session = createSession(defaultParams);
    recordVisit(session.demoId, mockNetworkInfo);
    const s = getSession(session.demoId)!;
    (s as any).expiresAt = new Date(Date.now() - 1000).toISOString();
    const cleaned = runExpiredCleanup();
    expect(cleaned).toBeGreaterThanOrEqual(1);
    const expired = getSession(session.demoId)!;
    expect(expired.status).toBe('expired');
    expect(expired.networkInfo).toBeNull();
  });

  test('termination clears data', () => {
    const session = createSession(defaultParams);
    recordVisit(session.demoId, mockNetworkInfo);
    terminateSession(session.demoId);
    const s = getSession(session.demoId)!;
    expect(s.status).toBe('terminated');
    expect(s.networkInfo).toBeNull();
  });
});
