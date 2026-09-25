import express from 'express';
import request from 'supertest';
import scanRouter from '../routes/scan';

const app = express();
app.use(express.json());
app.use('/api/scan', scanRouter);

describe('Real-domain end-to-end passive scan', () => {
  test(
    'scans example.com end-to-end through normalized assets and scoring',
    async () => {
      // 1. Submit scan job
      const createRes = await request(app)
        .post('/api/scan')
        .send({ domain: 'example.com' });

      expect(createRes.status).toBe(202);
      expect(createRes.body.scanId).toBeDefined();
      expect(createRes.body.domain).toBe('example.com');
      expect(createRes.body.status).toBe('running');

      const scanId = createRes.body.scanId as string;

      // 2. Poll until terminal state
      let terminalScan: any = null;
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await request(app).get(`/api/scan/${scanId}`);
        expect(pollRes.status).toBe(200);

        if (pollRes.body.status === 'completed' || pollRes.body.status === 'completed_with_warnings') {
          terminalScan = pollRes.body;
          break;
        }
      }

      expect(terminalScan).not.toBeNull();
      expect(['completed', 'completed_with_warnings']).toContain(terminalScan.status);

      // 3. Verify normalized intelligence assets & relationships
      expect(Array.isArray(terminalScan.assets)).toBe(true);
      expect(terminalScan.assets.length).toBeGreaterThan(0);
      expect(terminalScan.assets.some((a: any) => a.type === 'DOMAIN' && a.value === 'example.com')).toBe(true);

      expect(Array.isArray(terminalScan.relationships)).toBe(true);
      expect(Array.isArray(terminalScan.findings)).toBe(true);
      expect(typeof terminalScan.score).toBe('number');
      expect(terminalScan.score).toBeGreaterThanOrEqual(0);
      expect(terminalScan.score).toBeLessThanOrEqual(100);

      // 4. Verify categories completed
      expect(terminalScan.categories.dns.status).toBe('completed');
      expect(terminalScan.categories.scoring.status).toBe('completed');
    },
    45000,
  );
});
