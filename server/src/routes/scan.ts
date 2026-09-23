import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { validateDomain } from '../services/domainValidation';
import { createScanRecord, getScanRecord, markScanFinished, setScanScore, updateCategoryStatus } from '../services/scanStore';
import { runWhois } from '../services/whois';
import { runDns } from '../services/dns';
import { runSubdomains } from '../services/subdomains';
import { runTls } from '../services/tls';
import { runHttpFingerprint } from '../services/httpFingerprint';
import { runExposureChecks } from '../services/exposureChecks';
import { computeExposureScore } from '../services/scoring';
import type { ScanCategory } from '../../../shared/types';

const router = Router();

router.use(rateLimit({
  windowMs: config.scanRateLimitWindowMs,
  max: config.scanRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans. Please wait an hour before starting another one.', code: 'SCAN_RATE_LIMIT' },
}));

const categoryRunners: Record<Exclude<ScanCategory, 'scoring'>, (domain: string) => Promise<unknown>> = {
  whois: runWhois,
  dns: runDns,
  subdomains: runSubdomains,
  tls: runTls,
  http: runHttpFingerprint,
  exposure: runExposureChecks,
};

async function runScan(scanId: string): Promise<void> {
  const scan = getScanRecord(scanId);
  if (!scan) {
    return;
  }

  for (const category of Object.keys(categoryRunners) as ScanCategory[]) {
    if (category === 'scoring') {
      continue;
    }

    updateCategoryStatus(scanId, category, 'running');

    try {
      const result = await categoryRunners[category](scan.domain);
      updateCategoryStatus(scanId, category, 'completed', result);
    } catch (error) {
      updateCategoryStatus(scanId, category, 'failed', undefined, error instanceof Error ? error.message : 'Request failed');
    }
  }

  const freshScan = getScanRecord(scanId);
  if (!freshScan) {
    return;
  }

  const score = computeExposureScore(freshScan);
  setScanScore(scanId, score);
  updateCategoryStatus(scanId, 'scoring', 'completed', { score, formula: 'Passive exposure heuristic for public security posture' });
  markScanFinished(scanId);
}

router.post('/', (req, res) => {
  try {
    const domain = validateDomain(req.body?.domain);
    const scan = createScanRecord(domain);
    void runScan(scan.scanId);

    res.status(202).json({
      scanId: scan.scanId,
      domain: scan.domain,
      status: scan.status,
      createdAt: scan.createdAt,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid domain',
      code: 'INVALID_DOMAIN',
    });
  }
});

router.get('/:scanId', (req, res) => {
  const scan = getScanRecord(req.params.scanId);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found or expired', code: 'SCAN_NOT_FOUND' });
    return;
  }

  res.json(scan);
});

export default router;
