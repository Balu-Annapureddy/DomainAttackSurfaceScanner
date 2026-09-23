import {
  DemoSession,
  DemoStatus,
  MediaType,
  NetworkInfo,
  BrowserInfo,
  LocationInfo,
  GeoInfo,
  PermissionStatus,
} from '../types';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// ─── In-memory store ──────────────────────────────────────────────────────────
const sessions = new Map<string, DemoSession>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString();
}

function expiresAt(durationHours: number): string {
  return new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
}

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateSessionParams {
  mediaType: MediaType;
  durationHours: number;
  contentUrl?: string | null;
  theme: string;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
}

export function createSession(params: CreateSessionParams): DemoSession {
  const demoId = nanoid(16);
  const session: DemoSession = {
    demoId,
    createdAt: now(),
    expiresAt: expiresAt(params.durationHours),
    status: 'active',
    mediaType: params.mediaType,
    contentUrl: params.contentUrl || null,
    mediaId: null,
    mediaFilename: null,
    theme: params.theme,
    themeLabel: params.themeLabel,
    themeCaption: params.themeCaption,
    themeLinkText: params.themeLinkText,
    themeEmoji: params.themeEmoji,
    visitCount: 0,
    visitedAt: null,
    lastVisitAt: null,
    networkInfo: null,
    browserInfo: null,
    geoInfo: null,
    location: null,
    locationPermission: 'not_requested',
    cameraPermission: 'not_requested',
    microphonePermission: 'not_requested',
    capturedPhotoRef: null,
    capturedVideoRef: null,
    capturedAudioRef: null,
    lastActivityAt: now(),
    durationHours: params.durationHours,
  };
  sessions.set(demoId, session);
  return session;
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export function getSession(demoId: string): DemoSession | undefined {
  const session = sessions.get(demoId);
  if (!session) return undefined;
  if ((session.status === 'active' || session.status === 'visited') && new Date(session.expiresAt) < new Date()) {
    cleanupSessionFiles(session);
    const expired: DemoSession = {
      ...session,
      status: 'expired',
      networkInfo: null,
      browserInfo: null,
      geoInfo: null,
      location: null,
      capturedPhotoRef: null,
      capturedVideoRef: null,
      capturedAudioRef: null,
      lastActivityAt: now(),
    };
    sessions.set(demoId, expired);
    return expired;
  }
  return session;
}

export function getAllSessions(): DemoSession[] {
  runExpiredCleanup();
  return Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function updateSession(
  demoId: string,
  patch: Partial<DemoSession>
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const updated = { ...session, ...patch, lastActivityAt: now() };
  sessions.set(demoId, updated);
  return updated;
}

export function setMedia(
  demoId: string,
  mediaId: string,
  mediaFilename: string
): DemoSession | null {
  return updateSession(demoId, { mediaId, mediaFilename });
}

// ─── Visit tracking ───────────────────────────────────────────────────────────
export function recordVisit(
  demoId: string,
  networkInfo: NetworkInfo
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;

  const visitCount = session.visitCount + 1;
  const visitedAt = session.visitedAt || now(); // keep first visit time
  const lastVisitAt = now();
  const status: DemoStatus = session.status === 'active' ? 'visited' : session.status;

  // Preserve previous browser/OS details if current request has generic/empty UA
  let effectiveNetwork = networkInfo;
  if (session.networkInfo && networkInfo.browser === 'Unknown' && session.networkInfo.browser !== 'Unknown') {
    effectiveNetwork = {
      ...networkInfo,
      browser: session.networkInfo.browser,
      browserVersion: session.networkInfo.browserVersion,
      os: session.networkInfo.os,
      osVersion: session.networkInfo.osVersion,
      platform: session.networkInfo.platform,
      deviceCategory: session.networkInfo.deviceCategory,
    };
  }

  return updateSession(demoId, { visitCount, visitedAt, lastVisitAt, networkInfo: effectiveNetwork, status });
}

export function updateBrowserInfo(
  demoId: string,
  browserInfo: BrowserInfo
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const merged = { ...(session.browserInfo || {}), ...browserInfo };
  return updateSession(demoId, { browserInfo: merged as BrowserInfo });
}

export function updateGeoInfo(
  demoId: string,
  geoInfo: GeoInfo
): DemoSession | null {
  return updateSession(demoId, { geoInfo });
}

export function updateLocation(
  demoId: string,
  location: LocationInfo
): DemoSession | null {
  return updateSession(demoId, {
    location,
    locationPermission: 'granted',
  });
}

export function updatePermission(
  demoId: string,
  type: 'camera' | 'microphone' | 'location',
  status: PermissionStatus
): DemoSession | null {
  const patch: Partial<DemoSession> = {};
  if (type === 'camera') patch.cameraPermission = status;
  if (type === 'microphone') patch.microphonePermission = status;
  if (type === 'location') patch.locationPermission = status;
  return updateSession(demoId, patch);
}

export function setPhotoRef(demoId: string, ref: string): DemoSession | null {
  return updateSession(demoId, {
    capturedPhotoRef: ref,
    cameraPermission: 'granted',
  });
}

export function setVideoRef(demoId: string, ref: string): DemoSession | null {
  return updateSession(demoId, {
    capturedVideoRef: ref,
    cameraPermission: 'granted',
  });
}

export function setAudioRef(demoId: string, ref: string): DemoSession | null {
  return updateSession(demoId, {
    capturedAudioRef: ref,
    microphonePermission: 'granted',
  });
}

// ─── Terminate ────────────────────────────────────────────────────────────────
export function terminateSession(demoId: string): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  cleanupSessionFiles(session);
  const updated: DemoSession = {
    ...session,
    status: 'terminated',
    networkInfo: null,
    browserInfo: null,
    geoInfo: null,
    location: null,
    capturedPhotoRef: null,
    capturedVideoRef: null,
    capturedAudioRef: null,
    lastActivityAt: now(),
  };
  sessions.set(demoId, updated);
  return updated;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function isSessionUsable(session: DemoSession): boolean {
  if (session.status === 'terminated') return false;
  if (session.status === 'expired') return false;
  if (new Date(session.expiresAt) < new Date()) return false;
  return true;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function getStats() {
  runExpiredCleanup();
  const all = Array.from(sessions.values());
  const active = all.filter(s => s.status === 'active' || s.status === 'visited');
  const totalVisits = active.reduce((sum, s) => sum + s.visitCount, 0);
  const visitors = active.filter(s => s.visitCount > 0).length;
  const soonCutoff = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  const expiringSoon = active.filter(s => new Date(s.expiresAt).getTime() < soonCutoff).length;

  return {
    activeUrls: active.length,
    visitors,
    visits: totalVisits,
    expiringSoon,
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function cleanupSessionFiles(session: DemoSession): void {
  const refs = [
    session.mediaId,
    session.capturedPhotoRef,
    session.capturedVideoRef,
    session.capturedAudioRef,
  ].filter(Boolean) as string[];

  for (const ref of refs) {
    try {
      const filePath = path.join(config.uploadDir, ref);
      const resolved = path.resolve(filePath);
      const base = path.resolve(config.uploadDir);
      if (!resolved.startsWith(base)) continue;
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
    } catch (err) {
      console.error(`[cleanup] Failed to delete file ref=${ref}:`, err);
    }
  }
}

export function runExpiredCleanup(): number {
  let cleaned = 0;
  const cutoff = new Date();
  for (const [id, session] of sessions.entries()) {
    if (session.status === 'active' || session.status === 'visited') {
      if (new Date(session.expiresAt) < cutoff) {
        cleanupSessionFiles(session);
        sessions.set(id, {
          ...session,
          status: 'expired',
          networkInfo: null,
          browserInfo: null,
          geoInfo: null,
          location: null,
          capturedPhotoRef: null,
          capturedVideoRef: null,
          capturedAudioRef: null,
        });
        cleaned++;
      }
    }
  }
  return cleaned;
}

export function startCleanupJob(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    const n = runExpiredCleanup();
    if (n > 0) console.log(`[cleanup] Expired ${n} session(s)`);
  }, intervalMs);
}

// ─── Exported for testing ─────────────────────────────────────────────────────
export function clearAllSessions(): void {
  sessions.clear();
}
