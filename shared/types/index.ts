export type ScanCategory = 'whois' | 'dns' | 'subdomains' | 'tls' | 'http' | 'exposure' | 'scoring';
export type ScanStatus = 'running' | 'completed' | 'failed';
export type CategoryStatus = 'pending' | 'running' | 'completed' | 'failed';

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
}
