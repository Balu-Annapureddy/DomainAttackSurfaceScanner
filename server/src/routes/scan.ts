import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { validateDomain } from '../services/domainValidation';
import { createScanRecord, getScanRecord, markScanFinished, setScanIntelligence, setScanScore, updateCategoryStatus } from '../services/scanStore';
import { runWhois } from '../services/whois';
import { runDns } from '../services/dns';
import { runSubdomains } from '../services/subdomains';
import { runTls } from '../services/tls';
import { runHttpFingerprint } from '../services/httpFingerprint';
import { runExposureChecks } from '../services/exposureChecks';
import { computeExposureScore } from '../services/scoring';
import { runIpIntelligence, type IpIntelligence } from '../services/ipIntelligence';
import { buildNormalizedAssets } from '../services/normalization';
import { buildFindings } from '../services/findings';
import { logError, logEvent } from '../utils/logger';
import type { ScanCategory } from '../../../shared/types';

const router = Router();
let activeScans = 0;
const lastScanByDomain = new Map<string, number>();

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

  logEvent('scan_started', { scanId, domain: scan.domain });
  const runCategory = async (category: Exclude<ScanCategory, 'scoring'>): Promise<void> => {
    updateCategoryStatus(scanId, category, 'running');
    logEvent('scan_category_started', { scanId, category });
    try {
      const result = await Promise.race([
        categoryRunners[category](scan.domain),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Category timeout')), config.scanTimeoutMs)),
      ]);
      updateCategoryStatus(scanId, category, 'completed', result);
      logEvent('scan_category_completed', { scanId, category });
    } catch (error) {
      updateCategoryStatus(scanId, category, 'failed', undefined, error instanceof Error ? error.message : 'Request failed');
      logError('scan_category_failed', error, { scanId, category });
    }
  };
  await Promise.all((Object.keys(categoryRunners) as Array<Exclude<ScanCategory, 'scoring'>>).map(runCategory));

  const freshScan = getScanRecord(scanId);
  if (!freshScan) {
    return;
  }

  const addresses = ((freshScan.categories.dns.data as { addresses?: string[]; aaaa?: string[] } | undefined)?.addresses ?? [])
    .concat((freshScan.categories.dns.data as { aaaa?: string[] } | undefined)?.aaaa ?? []);
  let ipIntelligence: IpIntelligence[] = [];
  const intelligenceWarnings: string[] = [];
  try {
    ipIntelligence = await runIpIntelligence(addresses);
  } catch (error) {
    intelligenceWarnings.push('IP intelligence provider was unavailable.');
    logError('ip_intelligence_failed', error, { scanId });
  }
  const normalized = buildNormalizedAssets(freshScan, ipIntelligence);
  const findings = buildFindings(freshScan);
  const failedCategories = (Object.entries(freshScan.categories) as Array<[ScanCategory, { status: string }]>)
    .filter(([category, state]) => category !== 'scoring' && state.status === 'failed')
    .map(([category]) => `${category} data was unavailable.`);
  setScanIntelligence(scanId, { ...normalized, findings, warnings: [...normalized.warnings, ...failedCategories, ...intelligenceWarnings] });
  const score = computeExposureScore(freshScan);
  setScanScore(scanId, score);
  updateCategoryStatus(scanId, 'scoring', 'completed', { score, formula: 'Passive exposure heuristic for public security posture' });
  markScanFinished(scanId);
  logEvent('scan_completed', { scanId, domain: scan.domain, status: getScanRecord(scanId)?.status });
  activeScans -= 1;
}

router.post('/', (req, res) => {
  try {
    const domain = validateDomain(req.body?.domain);
    if (activeScans >= config.maxConcurrentScans) {
      res.status(429).json({ error: 'The scanner is busy. Please retry shortly.', code: 'SCAN_CONCURRENCY_LIMIT' });
      return;
    }
    const lastScan = lastScanByDomain.get(domain);
    if (lastScan && Date.now() - lastScan < 60_000) {
      res.status(429).json({ error: 'This domain was scanned recently. Please wait before retrying.', code: 'DOMAIN_COOLDOWN' });
      return;
    }
    const scan = createScanRecord(domain);
    activeScans += 1;
    lastScanByDomain.set(domain, Date.now());
    void runScan(scan.scanId).catch((error) => {
      activeScans -= 1;
      logError('scan_failed', error, { scanId: scan.scanId, domain });
    });

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
