import type { DomainScan, ScanComparison, Asset, Finding } from '../../../shared/types';

export function compareScans(baseline: DomainScan, current: DomainScan): ScanComparison {
  if (baseline.domain.toLowerCase() !== current.domain.toLowerCase()) {
    throw new Error(`Cannot compare scans for different domains ("${baseline.domain}" vs "${current.domain}")`);
  }

  // 1. Asset Differencing (keyed by type:value)
  const baselineAssetMap = new Map<string, Asset>();
  for (const asset of baseline.assets) {
    baselineAssetMap.set(`${asset.type}:${asset.value}`, asset);
  }

  const currentAssetMap = new Map<string, Asset>();
  for (const asset of current.assets) {
    currentAssetMap.set(`${asset.type}:${asset.value}`, asset);
  }

  const addedAssets: Asset[] = [];
  const removedAssets: Asset[] = [];
  let persistedAssetsCount = 0;

  for (const [key, asset] of currentAssetMap.entries()) {
    if (!baselineAssetMap.has(key)) {
      addedAssets.push(asset);
    } else {
      persistedAssetsCount += 1;
    }
  }

  for (const [key, asset] of baselineAssetMap.entries()) {
    if (!currentAssetMap.has(key)) {
      removedAssets.push(asset);
    }
  }

  // 2. Finding Differencing (keyed by category:title)
  const baselineFindingMap = new Map<string, Finding>();
  for (const finding of baseline.findings) {
    baselineFindingMap.set(`${finding.category}:${finding.title}`, finding);
  }

  const currentFindingMap = new Map<string, Finding>();
  for (const finding of current.findings) {
    currentFindingMap.set(`${finding.category}:${finding.title}`, finding);
  }

  const newFindings: Finding[] = [];
  const resolvedFindings: Finding[] = [];
  let persistingFindingsCount = 0;

  for (const [key, finding] of currentFindingMap.entries()) {
    if (!baselineFindingMap.has(key)) {
      newFindings.push(finding);
    } else {
      persistingFindingsCount += 1;
    }
  }

  for (const [key, finding] of baselineFindingMap.entries()) {
    if (!currentFindingMap.has(key)) {
      resolvedFindings.push(finding);
    }
  }

  // 3. Posture Score Delta
  const baselineScore = typeof baseline.score === 'number' ? baseline.score : null;
  const currentScore = typeof current.score === 'number' ? current.score : null;
  const scoreDelta = (currentScore ?? 0) - (baselineScore ?? 0);

  // 4. Certificate Drift
  const baselineTls = baseline.categories.tls?.data as {
    fingerprint256?: string;
    issuer?: string;
    validTo?: string;
  } | undefined;

  const currentTls = current.categories.tls?.data as {
    fingerprint256?: string;
    issuer?: string;
    validTo?: string;
  } | undefined;

  const certFingerprintChanged =
    Boolean(baselineTls?.fingerprint256 && currentTls?.fingerprint256) &&
    baselineTls?.fingerprint256 !== currentTls?.fingerprint256;

  const certValidityChanged =
    Boolean(baselineTls?.validTo && currentTls?.validTo) &&
    baselineTls?.validTo !== currentTls?.validTo;

  const certificateDiff = {
    changed: certFingerprintChanged || certValidityChanged,
    baselineFingerprint: baselineTls?.fingerprint256,
    currentFingerprint: currentTls?.fingerprint256,
    baselineIssuer: baselineTls?.issuer,
    currentIssuer: currentTls?.issuer,
    baselineValidTo: baselineTls?.validTo,
    currentValidTo: currentTls?.validTo,
  };

  // 5. DNS / Email Hygiene Drift
  const baselineDns = baseline.categories.dns?.data as {
    spf?: { policy?: string; present?: boolean };
    dmarc?: { policy?: string; present?: boolean };
    ns?: string[];
  } | undefined;

  const currentDns = current.categories.dns?.data as {
    spf?: { policy?: string; present?: boolean };
    dmarc?: { policy?: string; present?: boolean };
    ns?: string[];
  } | undefined;

  const baselineNs = new Set(baselineDns?.ns ?? []);
  const currentNs = new Set(currentDns?.ns ?? []);

  const addedNameservers = [...currentNs].filter((ns) => !baselineNs.has(ns));
  const removedNameservers = [...baselineNs].filter((ns) => !currentNs.has(ns));

  const spfChanged =
    baselineDns?.spf?.policy !== currentDns?.spf?.policy ||
    Boolean(baselineDns?.spf?.present) !== Boolean(currentDns?.spf?.present);

  const dmarcChanged =
    baselineDns?.dmarc?.policy !== currentDns?.dmarc?.policy ||
    Boolean(baselineDns?.dmarc?.present) !== Boolean(currentDns?.dmarc?.present);

  const dnsDiff = {
    changed: spfChanged || dmarcChanged || addedNameservers.length > 0 || removedNameservers.length > 0,
    baselineSpf: baselineDns?.spf?.policy,
    currentSpf: currentDns?.spf?.policy,
    baselineDmarc: baselineDns?.dmarc?.policy,
    currentDmarc: currentDns?.dmarc?.policy,
    addedNameservers,
    removedNameservers,
  };

  return {
    domain: current.domain,
    baselineScanId: baseline.scanId,
    currentScanId: current.scanId,
    baselineCreatedAt: baseline.createdAt,
    currentCreatedAt: current.createdAt,
    baselineScore,
    currentScore,
    scoreDelta,
    addedAssets,
    removedAssets,
    persistedAssetsCount,
    newFindings,
    resolvedFindings,
    persistingFindingsCount,
    certificateDiff,
    dnsDiff,
  };
}
