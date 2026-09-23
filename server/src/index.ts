import express from 'express';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { applySecurity } from './middleware/security';
import { startCleanupJob } from './services/sessionStore';
import adminRouter from './routes/admin';
import visitorRouter from './routes/visitor';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
applySecurity(app);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Ensure upload dir exists ─────────────────────────────────────────────────
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/admin', adminRouter);
app.use('/api/r', visitorRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve client in production ───────────────────────────────────────────────
if (!config.isDev) {
  const clientDist = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: `File too large (max ${config.maxFileSizeMb}MB)`, code: 'FILE_TOO_LARGE' });
    return;
  }
  if (err.message?.includes('Unsupported file type')) {
    res.status(400).json({ error: err.message, code: 'UNSUPPORTED_FILE' });
    return;
  }
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`\n🔬 ReconLab server running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Short durations: ${config.enableShortDurations ? 'enabled' : 'disabled'}`);
  console.log(`   Geo lookup: ${config.geoEnabled ? 'enabled' : 'disabled'}`);
  console.log(`   Upload dir: ${uploadDir}\n`);
});

startCleanupJob(config.cleanupIntervalMs);

export { app, server };
