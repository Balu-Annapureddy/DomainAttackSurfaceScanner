import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config';
import { applySecurity } from './middleware/security';
import { authMiddleware } from './middleware/auth';
import scanRouter, { getActiveScansCount } from './routes/scan';
import authRouter from './routes/auth';

import { db } from './db';

const app = express();

if (config.trustProxy !== false) {
  app.set('trust proxy', config.trustProxy);
}

applySecurity(app);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/scan', scanRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
  });
});

app.get('/api/health/ready', async (_req, res) => {
  try {
    const isReady = typeof config.port === 'number' && typeof config.scanTimeoutMs === 'number';
    if (!isReady) {
      res.status(503).json({ status: 'unready', error: 'Service configuration not ready' });
      return;
    }

    let dbReady = true;
    try {
      await db.findUserById('health-check-probe');
    } catch {
      dbReady = false;
    }

    if (!dbReady) {
      res.status(503).json({ status: 'unready', error: 'Database persistence unavailable' });
      return;
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      activeScans: getActiveScansCount(),
      persistence: config.databaseUrl ? 'postgresql' : 'local-json',
    });
  } catch {
    res.status(503).json({ status: 'unready', error: 'Readiness probe failed' });
  }
});

if (!config.isDev) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('[server] Unhandled error:', message);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

let server: import('node:http').Server | undefined;
if (config.nodeEnv !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`\n🔎 Domain Attack Surface Scanner running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export { app, server };

