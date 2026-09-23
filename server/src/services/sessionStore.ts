import {
  DemoSession,
  DemoStatus,
  MediaType,
  NetworkInfo,
  BrowserInfo,
  LocationInfo,
  GeoInfo,
  PermissionStatus,
  TimelineEvent,
  MediaItemMetadata,
  StructuredSessionDetail,
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

function addTimelineEvent(session: DemoSession, type: TimelineEvent['type'], metadata?: Record<string, any>): void {
  session.timeline.push({
    id: nanoid(8),
    type,
    timestamp: now(),
    metadata,
  });
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
    mediaMetadata: {
      photo: null,
      video: null,
      audio: null,
    },
    timeline: [],
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
      mediaMetadata: { photo: null, video: null, audio: null },
      lastActivityAt: now(),
    };
    addTimelineEvent(expired, 'session_terminated', { reason: 'expired' });
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
  const visitedAt = session.visitedAt || now();
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

  addTimelineEvent(session, 'visit_received', {
    ip: networkInfo.ipAddress,
    browser: networkInfo.browser,
    os: networkInfo.os,
    visitNumber: visitCount,
  });

  return updateSession(demoId, { visitCount, visitedAt, lastVisitAt, networkInfo: effectiveNetwork, status });
}

export function updateBrowserInfo(
  demoId: string,
  browserInfo: BrowserInfo
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const merged = { ...(session.browserInfo || {}), ...browserInfo };
  addTimelineEvent(session, 'telemetry_received', {
    screen: `${browserInfo.screenWidth}x${browserInfo.screenHeight}`,
    language: browserInfo.language,
  });
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
  const session = sessions.get(demoId);
  if (!session) return null;
  addTimelineEvent(session, 'gps_received', {
    lat: location.latitude,
    lon: location.longitude,
    accuracy: location.accuracy,
  });
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
  const session = sessions.get(demoId);
  if (!session) return null;
  const patch: Partial<DemoSession> = {};
  if (type === 'camera') patch.cameraPermission = status;
  if (type === 'microphone') patch.microphonePermission = status;
  if (type === 'location') patch.locationPermission = status;

  if (status === 'denied') {
    addTimelineEvent(session, 'permission_denied', { permission: type });
  } else if (status === 'unavailable') {
    addTimelineEvent(session, 'permission_unavailable', { permission: type });
  }

  return updateSession(demoId, patch);
}

export function setPhotoRef(
  demoId: string,
  ref: string,
  meta: Partial<{ mimeType: string; fileSize: number }> = {}
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const mimeType = meta.mimeType ?? 'image/jpeg';
  const fileSize = meta.fileSize ?? 0;
  const item: MediaItemMetadata = {
    ref,
    timestamp: now(),
    mimeType,
    fileSize,
  };
  addTimelineEvent(session, 'photo_captured', { ref, size: fileSize });
  return updateSession(demoId, {
    capturedPhotoRef: ref,
    cameraPermission: 'granted',
    mediaMetadata: {
      ...session.mediaMetadata,
      photo: item,
    },
  });
}

export function setVideoRef(
  demoId: string,
  ref: string,
  meta: Partial<{ mimeType: string; fileSize: number; durationSeconds: number }> = {}
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const mimeType = meta.mimeType ?? 'video/webm';
  const fileSize = meta.fileSize ?? 0;
  const durationSeconds = meta.durationSeconds ?? 0;
  const item: MediaItemMetadata = {
    ref,
    timestamp: now(),
    mimeType,
    fileSize,
    durationSeconds,
  };
  addTimelineEvent(session, 'video_completed', { ref, size: fileSize, duration: durationSeconds });
  return updateSession(demoId, {
    capturedVideoRef: ref,
    cameraPermission: 'granted',
    mediaMetadata: {
      ...session.mediaMetadata,
      video: item,
    },
  });
}

export function setAudioRef(
  demoId: string,
  ref: string,
  meta: Partial<{ mimeType: string; fileSize: number; durationSeconds: number }> = {}
): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  const mimeType = meta.mimeType ?? 'audio/webm';
  const fileSize = meta.fileSize ?? 0;
  const durationSeconds = meta.durationSeconds ?? 0;
  const item: MediaItemMetadata = {
    ref,
    timestamp: now(),
    mimeType,
    fileSize,
    durationSeconds,
  };
  addTimelineEvent(session, 'audio_completed', { ref, size: fileSize, duration: durationSeconds });
  return updateSession(demoId, {
    capturedAudioRef: ref,
    microphonePermission: 'granted',
    mediaMetadata: {
      ...session.mediaMetadata,
      audio: item,
    },
  });
}

// ─── Terminate ────────────────────────────────────────────────────────────────
export function terminateSession(demoId: string): DemoSession | null {
  const session = sessions.get(demoId);
  if (!session) return null;
  cleanupSessionFiles(session);
  addTimelineEvent(session, 'session_terminated', { reason: 'manual' });
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
    mediaMetadata: { photo: null, video: null, audio: null },
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

// ─── Structured Detail Builder ────────────────────────────────────────────────
export function getStructuredSessionDetail(session: DemoSession): StructuredSessionDetail {
  const n = session.networkInfo;
  const b = session.browserInfo;
  const g = session.geoInfo;
  const l = session.location;

  return {
    session: {
      demoId: session.demoId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      status: session.status,
      mediaType: session.mediaType,
      contentUrl: session.contentUrl,
      mediaFilename: session.mediaFilename,
      theme: session.theme,
      themeLabel: session.themeLabel,
      themeCaption: session.themeCaption,
      themeLinkText: session.themeLinkText,
      themeEmoji: session.themeEmoji,
      visitCount: session.visitCount,
      visitedAt: session.visitedAt,
      lastVisitAt: session.lastVisitAt,
      durationHours: session.durationHours,
    },
    location: {
      ip: g,
      gps: l,
    },
    browser: {
      name: n?.browser || null,
      version: n?.browserVersion || null,
      engine: n?.engine || null,
      userAgent: n?.userAgent || null,
      language: b?.language || null,
      languages: b?.languages || null,
      cookiesEnabled: b?.cookiesEnabled ?? null,
      doNotTrack: b?.doNotTrack ?? null,
    },
    device: {
      category: n?.deviceCategory || null,
      platform: n?.platform || null,
      os: n?.os || null,
      osVersion: n?.osVersion || null,
      cores: b?.hardwareConcurrency ?? null,
      memoryGb: b?.deviceMemory ?? null,
      touchSupport: b?.touchSupport ?? null,
      maxTouchPoints: b?.maxTouchPoints ?? null,
    },
    display: {
      screenWidth: b?.screenWidth ?? null,
      screenHeight: b?.screenHeight ?? null,
      availScreenWidth: b?.availScreenWidth ?? null,
      availScreenHeight: b?.availScreenHeight ?? null,
      viewportWidth: b?.viewportWidth ?? null,
      viewportHeight: b?.viewportHeight ?? null,
      devicePixelRatio: b?.devicePixelRatio ?? null,
      colorDepth: b?.colorDepth ?? null,
      pixelDepth: b?.pixelDepth ?? null,
    },
    network: {
      ipAddress: n?.ipAddress || null,
      ipVersion: n?.ipVersion || null,
      isLocalhostOrPrivate: n?.isLocalhostOrPrivate ?? null,
      connectionType: b?.connectionType ?? null,
      effectiveConnectionType: b?.effectiveConnectionType ?? null,
      downlink: b?.downlink ?? null,
      rtt: b?.rtt ?? null,
      saveData: b?.saveData ?? null,
      online: b?.online ?? null,
    },
    headers: {
      accept: n?.accept || null,
      acceptLanguage: n?.acceptLanguage || null,
      acceptEncoding: n?.acceptEncoding || null,
      origin: n?.origin || null,
      referer: n?.referrer || null,
      secFetchSite: n?.secFetchSite || null,
      secFetchMode: n?.secFetchMode || null,
      secFetchDest: n?.secFetchDest || null,
      uaClientHint: n?.uaClientHint || null,
      secChUaPlatform: n?.secChUaPlatform || null,
      secChUaMobile: n?.secChUaMobile || null,
    },
    permissions: {
      camera: session.cameraPermission,
      microphone: session.microphonePermission,
      location: session.locationPermission,
    },
    media: session.mediaMetadata,
    timeline: session.timeline,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function getStats() {
  runExpiredCleanup();
  const all = Array.from(sessions.values());
  const active = all.filter(s => s.status === 'active' || s.status === 'visited');
  const totalVisits = active.reduce((sum, s) => sum + s.visitCount, 0);
  const visitors = active.filter(s => s.visitCount > 0).length;
  const soonCutoff = Date.now() + 2 * 60 * 60 * 1000;
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
          mediaMetadata: { photo: null, video: null, audio: null },
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
