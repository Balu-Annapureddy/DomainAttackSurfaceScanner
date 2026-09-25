import net from 'node:net';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { validateDomain } from '../services/domainValidation';
import {
  createScanRecord,
  getScanRecord,
  markScanFinished,
  setScanIntelligence,
  setScanScore,
  updateCategoryStatus,
} from '../services/scanStore';
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
import { compareScans } from '../services/diff';
import { ScanRequestBudget } from '../services/scanBudget';
import { createSampleScan } from '../services/sampleScan';
import { logError, logEvent } from '../utils/logger';
import { db } from '../db';
import { consumeScanQuota } from '../services/quotaService';
import type { DomainScan, ScanCategory } from '../../../shared/types';

const router = Router();

// NOTE: activeScans and lastScanByDomain are single-process protections.
// In a distributed/multi-instance deployment, these concurrency and rate controls,
// along with scanStore persistence, must be backed by shared infrastructure (e.g. Redis / PostgreSQL).
let activeScans = 0;
const lastScanByDomain = new Map<string, number>();

router.use(
  rateLimit({
    windowMs: config.scanRateLimitWindowMs,
    max: config.scanRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many scans. Please wait an hour before starting another one.', code: 'SCAN_RATE_LIMIT' },
  }),
);

interface RunnerOptions {
  signal: AbortSignal;
  budget: ScanRequestBudget;
}

const categoryRunners: Record<
  Exclude<ScanCategory, 'scoring'>,
  (domain: string, options: RunnerOptions) => Promise<unknown>
> = {
  whois: runWhois,
  dns: runDns,
  subdomains: runSubdomains,
  tls: runTls,
  http: runHttpFingerprint,
  exposure: runExposureChecks,
};

export function getActiveScansCount(): number {
  return activeScans;
}

async function runScan(scanId: string): Promise<void> {
  const scan = getScanRecord(scanId);
  if (!scan) {
    activeScans = Math.max(0, activeScans - 1);
    return;
  }

  const budget = new ScanRequestBudget(config.maxExternalRequests);
  logEvent('scan_started', { scanId, domain: scan.domain, maxBudget: config.maxExternalRequests });

  try {
    const runCategory = async (category: Exclude<ScanCategory, 'scoring'>): Promise<void> => {
      updateCategoryStatus(scanId, category, 'running');
      logEvent('scan_category_started', { scanId, category });

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => {
        controller.abort(new Error(`Category ${category} timed out after ${config.scanTimeoutMs}ms`));
      }, config.scanTimeoutMs);

      try {
        const result = await categoryRunners[category](scan.domain, {
          signal: controller.signal,
          budget,
        });
        clearTimeout(timeoutHandle);
        updateCategoryStatus(scanId, category, 'completed', result);
        logEvent('scan_category_completed', { scanId, category });
      } catch (error) {
        clearTimeout(timeoutHandle);
        controller.abort();
        const message = error instanceof Error ? error.message : 'Request failed';
        updateCategoryStatus(scanId, category, 'failed', undefined, message);
        logError('scan_category_failed', error, { scanId, category });
      }
    };

    await Promise.all(
      (Object.keys(categoryRunners) as Array<Exclude<ScanCategory, 'scoring'>>).map(runCategory),
    );

    const freshScan = getScanRecord(scanId);
    if (!freshScan) {
      return;
    }

    const rawAddresses = (
      ((freshScan.categories.dns.data as { addresses?: string[]; aaaa?: string[] } | undefined)?.addresses ?? [])
    ).concat((freshScan.categories.dns.data as { aaaa?: string[] } | undefined)?.aaaa ?? []);

    const addresses = [
      ...new Set(
        rawAddresses.filter(
          (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
        ),
      ),
    ];

    let ipIntelligence: IpIntelligence[] = [];
    const intelligenceWarnings: string[] = [];

    try {
      ipIntelligence = await runIpIntelligence(addresses, { budget });
    } catch (error) {
      intelligenceWarnings.push('IP intelligence provider was unavailable.');
      logError('ip_intelligence_failed', error, { scanId });
    }

    if (budget.isExhausted()) {
      intelligenceWarnings.push(`Outbound request budget limit (${config.maxExternalRequests}) was reached.`);
    }

    const normalized = buildNormalizedAssets(freshScan, ipIntelligence);
    const findings = buildFindings(freshScan);
    const failedCategories = (Object.entries(freshScan.categories) as Array<[ScanCategory, { status: string }]>)
      .filter(([category, state]) => category !== 'scoring' && state.status === 'failed')
      .map(([category]) => `${category} data was unavailable.`);

    const nonScoringCategories = (Object.entries(freshScan.categories) as Array<[ScanCategory, { status: string }]>)
      .filter(([category]) => category !== 'scoring');
    const failedCategoryKeys = nonScoringCategories
      .filter(([, state]) => state.status === 'failed')
      .map(([category]) => category);
    const completedCount = nonScoringCategories.filter(([, state]) => state.status === 'completed').length;

    let completeness: 'complete' | 'partially_completed' | 'checks_failed' = 'complete';
    if (failedCategoryKeys.length === 0) {
      completeness = 'complete';
    } else if (failedCategoryKeys.includes('dns') && failedCategoryKeys.includes('http')) {
      completeness = 'checks_failed';
    } else {
      completeness = 'partially_completed';
    }

    setScanIntelligence(scanId, {
      ...normalized,
      findings,
      warnings: [...normalized.warnings, ...failedCategories, ...intelligenceWarnings],
      completeness,
      completenessDetails: {
        completed: completedCount,
        total: nonScoringCategories.length,
        failed: failedCategoryKeys,
      },
    });

    const score = computeExposureScore(freshScan);
    setScanScore(scanId, score);
    updateCategoryStatus(scanId, 'scoring', 'completed', {
      score,
      formula: 'Observable configuration posture (TLS, HTTPS enforcement, certificates, security headers, and email authentication)',
    });

    markScanFinished(scanId);
    const finishedScan = getScanRecord(scanId);
    if (finishedScan && finishedScan.userId) {
      try {
        await db.saveScan(finishedScan, finishedScan.userId, true);
      } catch (dbErr) {
        logError('scan_db_persist_failed', dbErr, { scanId, userId: finishedScan.userId });
      }
    }

    logEvent('scan_completed', {
      scanId,
      domain: scan.domain,
      status: getScanRecord(scanId)?.status,
      requestsConsumed: budget.consumed(),
    });
  } catch (error) {
    logError('scan_failed', error, { scanId, domain: scan.domain });
    const currentScan = getScanRecord(scanId);
    if (currentScan && currentScan.status === 'running') {
      currentScan.status = 'failed';
      currentScan.warnings.push(
        `Scan failed unexpectedly: ${error instanceof Error ? error.message : 'Internal error'}`,
      );
    }
  } finally {
    activeScans = Math.max(0, activeScans - 1);
  }
}

router.post('/', async (req, res) => {
  try {
    const domain = validateDomain(req.body?.domain);

    // 1. Quota Enforcement (Anonymous vs Registered)
    const quotaResult = await consumeScanQuota(req, req.user);
    if (!quotaResult.allowed) {
      res.status(429).json({
        error: `Scan quota exceeded (${quotaResult.quota.used}/${quotaResult.quota.limit}). Registered accounts receive higher allowances. Resets in ${Math.ceil(quotaResult.quota.resetsInSeconds / 60)} minutes.`,
        code: 'SCAN_QUOTA_EXCEEDED',
        quota: quotaResult.quota,
      });
      return;
    }

    if (activeScans >= config.maxConcurrentScans) {
      res.status(429).json({ error: 'The scanner is busy. Please retry shortly.', code: 'SCAN_CONCURRENCY_LIMIT' });
      return;
    }
    const lastScan = lastScanByDomain.get(domain);
    if (lastScan && Date.now() - lastScan < 60_000) {
      res.status(429).json({ error: 'This domain was scanned recently. Please wait before retrying.', code: 'DOMAIN_COOLDOWN' });
      return;
    }

    const userId = req.user?.id ?? null;
    const isSaved = Boolean(userId);
    const scan = createScanRecord(domain, userId, isSaved);
    activeScans += 1;
    lastScanByDomain.set(domain, Date.now());
    void runScan(scan.scanId);

    res.status(202).json({
      scanId: scan.scanId,
      domain: scan.domain,
      status: scan.status,
      createdAt: scan.createdAt,
      quota: quotaResult.quota,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid domain',
      code: 'INVALID_DOMAIN',
    });
  }
});

/**
 * Fetch persistent scan history for authenticated user
 */
router.get('/user/history', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required for persistent scan history', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const scans = await db.getUserScans(req.user.id);
    res.json({ scans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve scan history', code: 'SERVER_ERROR' });
  }
});

/**
 * Delete a saved scan record (Authenticated & Authorized Owner Only)
 */
router.delete('/:scanId', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const deleted = await db.deleteScan(req.params.scanId, req.user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Scan not found or access denied', code: 'NOT_FOUND_OR_FORBIDDEN' });
      return;
    }
    res.json({ success: true, message: 'Scan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete scan', code: 'SERVER_ERROR' });
  }
});

router.get('/compare/:baselineId/:targetId', async (req, res) => {
  const { baselineId, targetId } = req.params;
  let baseline = getScanRecord(baselineId);
  if (!baseline) {
    const bRecord = await db.getScan(baselineId);
    if (bRecord) baseline = bRecord.scan;
  }

  let target = getScanRecord(targetId);
  if (!target) {
    const tRecord = await db.getScan(targetId);
    if (tRecord) target = tRecord.scan;
  }

  if (!baseline) {
    res.status(404).json({ error: `Baseline scan ${baselineId} not found or expired`, code: 'BASELINE_NOT_FOUND' });
    return;
  }
  if (!target) {
    res.status(404).json({ error: `Target scan ${targetId} not found or expired`, code: 'TARGET_NOT_FOUND' });
    return;
  }

  // Authorization check: User A cannot compare User B's scans
  if (baseline.userId && (!req.user || req.user.id !== baseline.userId)) {
    res.status(403).json({ error: 'Access forbidden to baseline scan', code: 'FORBIDDEN' });
    return;
  }
  if (target.userId && (!req.user || req.user.id !== target.userId)) {
    res.status(403).json({ error: 'Access forbidden to target scan', code: 'FORBIDDEN' });
    return;
  }

  try {
    const comparison = compareScans(baseline, target);
    res.json(comparison);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Comparison failed',
      code: 'COMPARISON_FAILED',
    });
  }
});

router.get('/sample', (_req, res) => {
  res.json(createSampleScan());
});

router.get('/demo', (_req, res) => {
  res.json(createSampleScan());
});

router.get('/:scanId', async (req, res) => {
  const { scanId } = req.params;
  if (scanId === 'sample' || scanId === 'demo' || scanId === 'sample-scan-demo-id') {
    res.json(createSampleScan());
    return;
  }

  // Check in-memory store first
  let scan: DomainScan | undefined = getScanRecord(scanId);
  let scanUserId: string | null | undefined = scan?.userId;

  // Check persistent database if not in memory
  if (!scan) {
    const dbRecord = await db.getScan(scanId);
    if (dbRecord) {
      scan = dbRecord.scan;
      scanUserId = dbRecord.userId;
    }
  }

  if (!scan) {
    res.status(404).json({ error: 'Scan not found or expired', code: 'SCAN_NOT_FOUND' });
    return;
  }

  // Authorization check: If scan belongs to a user, requester must be that user
  if (scanUserId && (!req.user || req.user.id !== scanUserId)) {
    res.status(403).json({ error: 'Access forbidden: You do not own this scan record', code: 'FORBIDDEN' });
    return;
  }

  res.json(scan);
});

export default router;
