import { Router, Request, Response } from 'express';
import {
  getSession,
  isSessionUsable,
  recordVisit,
  updateBrowserInfo,
  updateGeoInfo,
  updateLocation,
  updatePermission,
  setPhotoRef,
  setVideoRef,
  setAudioRef,
} from '../services/sessionStore';
import { lookupGeo } from '../services/geoService';
import { mediaStorage } from '../services/mediaStore';
import { parseRequest } from '../utils/parseRequest';
import { BrowserInfo, LocationRequest, PermissionStatus } from '../types';
import multer from 'multer';

const router = Router();

// Capture upload: photo/video/audio from visitor (memory, 10MB limit)
const captureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// ─── Helper: validate token and get usable session ────────────────────────────
function getUsableSession(req: Request, res: Response) {
  const token = req.params.token || '';
  const session = getSession(token);

  if (!session) {
    res.status(404).json({ error: 'Link not found', code: 'NOT_FOUND' });
    return null;
  }

  if (session.status === 'terminated') {
    res.status(410).json({ error: 'This link is no longer active.', code: 'TERMINATED' });
    return null;
  }

  if (!isSessionUsable(session)) {
    res.status(410).json({ error: 'This link has expired.', code: 'EXPIRED' });
    return null;
  }

  return session;
}

// ─── GET /api/r/:token — Get session info for visitor page ────────────────────
router.get('/:token', (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  const mediaUrl = session.mediaId ? `/api/r/${session.demoId}/media` : null;

  res.json({
    demoId: session.demoId,
    expiresAt: session.expiresAt,
    status: session.status,
    mediaType: session.mediaType,
    contentUrl: session.contentUrl,  // for image/video URLs
    mediaUrl,                         // for PDF files
    themeLabel: session.themeLabel,
    themeCaption: session.themeCaption,
    themeLinkText: session.themeLinkText,
    themeEmoji: session.themeEmoji,
    practice: session.practice,
  });
});

// ─── GET /api/r/:token/media — Serve uploaded PDF ────────────────────────────
router.get('/:token/media', async (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  if (!session.mediaId) {
    res.status(404).json({ error: 'No media', code: 'NO_MEDIA' });
    return;
  }

  const filePath = mediaStorage.getPath(session.mediaId);
  if (!filePath) {
    res.status(404).json({ error: 'Media file not found', code: 'MEDIA_NOT_FOUND' });
    return;
  }

  const mimeMap: Record<string, string> = {
    image: 'image/jpeg',
    pdf: 'application/pdf',
    video: 'video/mp4',
  };
  res.setHeader('Content-Type', mimeMap[session.mediaType] || 'application/octet-stream');
  res.sendFile(filePath);
});

// ─── POST /api/r/:token/start — Record visit ─────────────────────────────────
// Called immediately when the visitor page loads. Increments visit count.
router.post('/:token/start', async (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  const networkInfo = parseRequest(req);
  recordVisit(session.demoId, networkInfo);

  // Accept extended browser info if provided
  const browserInfo: Partial<BrowserInfo> = req.body || {};
  if (browserInfo.screenWidth !== undefined) {
    updateBrowserInfo(session.demoId, browserInfo as BrowserInfo);
  }

  // Kick off geo lookup asynchronously — don't block the response
  if (networkInfo.ipAddress) {
    lookupGeo(networkInfo.ipAddress).then(geo => {
      if (geo) updateGeoInfo(session.demoId, geo);
    }).catch(() => {});
  }

  res.json({ message: 'Visit recorded', visitCount: session.visitCount + 1 });
});

// ─── POST /api/r/:token/location — Submit GPS location ───────────────────────
router.post('/:token/location', (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  const { latitude, longitude, accuracy } = req.body as LocationRequest;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'Invalid location data', code: 'INVALID_LOCATION' });
    return;
  }

  updateLocation(session.demoId, {
    latitude,
    longitude,
    accuracy: accuracy || 0,
    timestamp: new Date().toISOString(),
  });

  res.json({ message: 'Location recorded', locationPermission: 'granted' });
});

// ─── POST /api/r/:token/permission — Update permission status ─────────────────
router.post('/:token/permission', (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  const { permission, status } = req.body as { permission: string; status: PermissionStatus };

  if (!['camera', 'microphone', 'location'].includes(permission)) {
    res.status(400).json({ error: 'Invalid permission type', code: 'INVALID_PERMISSION' });
    return;
  }

  if (!['not_requested', 'granted', 'denied', 'unavailable'].includes(status)) {
    res.status(400).json({ error: 'Invalid permission status', code: 'INVALID_STATUS' });
    return;
  }

  updatePermission(session.demoId, permission as 'camera' | 'microphone' | 'location', status);
  res.json({ message: 'Permission updated' });
});

// ─── POST /api/r/:token/photo — Upload captured photo ─────────────────────────
router.post('/:token/photo', captureUpload.single('photo'), async (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  if (!req.file) {
    res.status(400).json({ error: 'No photo data', code: 'NO_FILE' });
    return;
  }

  const ref = await mediaStorage.save(`photo_${session.demoId}.jpg`, req.file.buffer);
  setPhotoRef(session.demoId, ref, {
    mimeType: req.file.mimetype || 'image/jpeg',
    fileSize: req.file.size,
  });

  res.json({ message: 'Photo captured', cameraPermission: 'granted' });
});

// ─── POST /api/r/:token/video — Upload captured video ─────────────────────────
router.post('/:token/video', captureUpload.single('video'), async (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  if (!req.file) {
    res.status(400).json({ error: 'No video data', code: 'NO_FILE' });
    return;
  }

  const ref = await mediaStorage.save(`video_${session.demoId}.webm`, req.file.buffer);
  setVideoRef(session.demoId, ref, {
    mimeType: req.file.mimetype || 'video/webm',
    fileSize: req.file.size,
    durationSeconds: 0,
  });

  res.json({ message: 'Video captured', cameraPermission: 'granted' });
});

// ─── POST /api/r/:token/audio — Upload captured audio ─────────────────────────
router.post('/:token/audio', captureUpload.single('audio'), async (req: Request, res: Response) => {
  const session = getUsableSession(req, res);
  if (!session) return;

  if (!req.file) {
    res.status(400).json({ error: 'No audio data', code: 'NO_FILE' });
    return;
  }

  const ref = await mediaStorage.save(`audio_${session.demoId}.webm`, req.file.buffer);
  setAudioRef(session.demoId, ref, {
    mimeType: req.file.mimetype || 'audio/webm',
    fileSize: req.file.size,
    durationSeconds: 0,
  });

  res.json({ message: 'Audio captured', microphonePermission: 'granted' });
});

export default router;
