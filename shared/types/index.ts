export type ScanCategory = 'whois' | 'dns' | 'subdomains' | 'tls' | 'http' | 'exposure' | 'scoring';
export type ScanStatus = 'running' | 'completed' | 'completed_with_warnings' | 'failed';
export type CategoryStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AssetType =
  | 'DOMAIN'
  | 'SUBDOMAIN'
  | 'IP'
  | 'ASN'
  | 'ORGANIZATION'
  | 'NAMESERVER'
  | 'MAIL_SERVER'
  | 'CERTIFICATE'
  | 'TECHNOLOGY'
  | 'URL'
  | 'GEOLOCATION'
  | 'PORT'
  | 'VULNERABILITY'
  | 'DNSSEC';
export type FindingSeverity = 'informational' | 'low' | 'medium' | 'high';
export type FindingKind = 'observation' | 'configuration_weakness' | 'recommendation' | 'potential_risk';
export type ObservationStatus = 'observed' | 'not_observed' | 'check_failed' | 'not_applicable';
export type ScanCompleteness = 'complete' | 'partially_completed' | 'checks_failed';

export interface Evidence {
  source: string;
  observedAt: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface Asset {
  id: string;
  type: AssetType;
  value: string;
  discoveredAt: string;
  targetDomain: string;
  evidence: Evidence[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface Relationship {
  fromAssetId: string;
  toAssetId: string;
  type:
    | 'resolves_to'
    | 'uses_nameserver'
    | 'delivers_mail_to'
    | 'issued_for'
    | 'belongs_to_asn'
    | 'operated_by'
    | 'observed_at'
    | 'located_approximately_at'
    | 'exposes_port'
    | 'vulnerable_to'
    | 'secured_by';
  evidence: Evidence;
}

export interface IpIntelligence {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  organization?: string;
  available: boolean;
  reason?: string;
  anycastLikely?: boolean;
}

export interface ShodanHostData {
  ip: string;
  ports: number[];
  cpes: string[];
  hostnames: string[];
  vulns: string[];
  tags: string[];
  available: boolean;
  hasData: boolean;
  reason?: string;
}

// ── v2: Structured finding analysis sections ──────────────────────────────
/**
 * Structured 10-section analysis attached to each Finding in DASS v2.
 * Every field is generated deterministically from actual scan evidence — never fabricated.
 */
export interface FindingAnalysis {
  /** Plain-language explanation of the underlying technology or concept. */
  whatIsThis: string;
  /** The specific observation made for this domain during this scan. */
  whatWasObserved: string;
  /** Which passive mechanism or data source produced this observation. */
  howDiscovered: string;
  /** Technical meaning of the observation in a security context. */
  technicalExplanation: string;
  /** Why this observation is security-relevant. */
  whyItMatters: string;
  /** Realistic security impact assessment. Does not exaggerate. */
  securityImpact: string;
  /** High-level description of how an attacker could leverage this weakness. No actual exploitation detail. */
  potentialAbuse: string;
  /** Concrete, actionable defensive recommendations. */
  remediation: string;
  /** What to check after the remediation is applied to confirm it worked. */
  safeValidation: string;
  /** Links to relevant standards, RFCs, or guidance documents. */
  references: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  kind: FindingKind;
  category: ScanCategory;
  description: string;
  recommendation: string;
  evidence: Evidence[];
  confidence: 'low' | 'medium' | 'high';
  whyItMatters?: string;
  investigationSteps?: string[];
  observationStatus?: ObservationStatus;
  /** v2: Full structured analysis. Optional for backward compatibility with v1 scan records. */
  analysis?: FindingAnalysis;
}

// ── v2: Score breakdown ───────────────────────────────────────────────────

/** A single observation that contributed to a score dimension's deduction. */
export interface ScoreObservation {
  description: string;
  pointsDeducted: number;
}

/**
 * Per-dimension score component.
 * A dimension with deducted=0 means no issues were observed in that area.
 */
export interface DimensionScore {
  label: string;
  /** Maximum possible deduction from the overall score for this dimension. */
  maxDeduction: number;
  /** Actual points deducted this scan. Always <= maxDeduction. */
  deducted: number;
  /** Individual observations that drove deductions. Empty if nothing was deducted. */
  observations: ScoreObservation[];
}

/**
 * Transparent breakdown of the Scope Hygiene Score.
 * total = 100 − totalDeducted. Answers "Why is my score X?"
 */
export interface ScoreBreakdown {
  /** Overall score (0–100). Identical to DomainScan.score. */
  total: number;
  /** Sum of all deductions across all dimensions. */
  totalDeducted: number;
  dimensions: {
    tlsHygiene: DimensionScore;
    httpsEnforcement: DimensionScore;
    webSecurityHeaders: DimensionScore;
    emailSecurity: DimensionScore;
  };
}

export interface ScanCategoryResult {
  status: CategoryStatus;
  startedAt?: string;
  completedAt?: string;
  data?: unknown;
  error?: string;
}

export interface DomainScan {
  scanId: string;
  domain: string;
  createdAt: string;
  expiresAt: string;
  status: ScanStatus;
  categories: Record<ScanCategory, ScanCategoryResult>;
  score?: number;
  scoreLabel?: 'External Hygiene Score';
  /** v2: Per-dimension score breakdown with explanations. Present after scoring completes. */
  scoreBreakdown?: ScoreBreakdown;
  completeness?: ScanCompleteness;
  completenessDetails?: {
    completed: number;
    total: number;
    failed: string[];
  };
  assets: Asset[];
  relationships: Relationship[];
  findings: Finding[];
  warnings: string[];
  userId?: string | null;
  isSaved?: boolean;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  user: User;
  message?: string;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetsInSeconds: number;
  isRegistered: boolean;
}

export interface HistoryScanItem {
  scanId: string;
  domain: string;
  createdAt: string;
  status: ScanStatus;
  score?: number;
  assetCount: number;
  findingCount: number;
  isSaved?: boolean;
}

export interface CertificateDiff {
  changed: boolean;
  baselineFingerprint?: string;
  currentFingerprint?: string;
  baselineIssuer?: string;
  currentIssuer?: string;
  baselineValidTo?: string;
  currentValidTo?: string;
}

export interface DnsDiff {
  changed: boolean;
  baselineSpf?: string;
  currentSpf?: string;
  baselineDmarc?: string;
  currentDmarc?: string;
  addedNameservers: string[];
  removedNameservers: string[];
}

export interface ScanComparison {
  domain: string;
  baselineScanId: string;
  currentScanId: string;
  baselineCreatedAt: string;
  currentCreatedAt: string;
  baselineScore: number | null;
  currentScore: number | null;
  scoreDelta: number;
  addedAssets: Asset[];
  removedAssets: Asset[];
  persistedAssetsCount: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
  persistingFindingsCount: number;
  certificateDiff: CertificateDiff;
  dnsDiff: DnsDiff;
}
