export type ScanCategory = 'whois' | 'dns' | 'subdomains' | 'tls' | 'http' | 'exposure' | 'scoring';
export type ScanStatus = 'running' | 'completed' | 'completed_with_warnings' | 'failed';
export type CategoryStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AssetType = 'DOMAIN' | 'SUBDOMAIN' | 'IP' | 'ASN' | 'ORGANIZATION' | 'NAMESERVER' | 'MAIL_SERVER' | 'CERTIFICATE' | 'TECHNOLOGY' | 'URL' | 'GEOLOCATION';
export type FindingSeverity = 'informational' | 'low' | 'medium' | 'high';
export type FindingKind = 'observation' | 'configuration_weakness' | 'recommendation' | 'potential_risk';

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
  type: 'resolves_to' | 'uses_nameserver' | 'delivers_mail_to' | 'issued_for' | 'belongs_to_asn' | 'operated_by' | 'observed_at';
  evidence: Evidence;
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
  assets: Asset[];
  relationships: Relationship[];
  findings: Finding[];
  warnings: string[];
}
