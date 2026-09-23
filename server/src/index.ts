import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config';
import { applySecurity } from './middleware/security';
import scanRouter from './routes/scan';

const app = express();

applySecurity(app);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/scan', scanRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

const server = app.listen(config.port, () => {
  console.log(`\n🔎 Domain Attack Surface Scanner running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export { app, server };
