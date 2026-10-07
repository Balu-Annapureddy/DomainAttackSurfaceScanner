import { config } from '../config';
import type { ScanRequestBudget } from './scanBudget';
import { resolvePublicAddresses } from './publicResolution';

export interface SubdomainsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export interface SubdomainsResult {
  available: boolean;
  total: number;
  subdomains: string[];
  subdomainSources?: Record<string, string[]>;
  reason?: string;
}

async function fetchJsonWithTimeout(url: string, externalSignal?: AbortSignal): Promise<unknown> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('CT log requests must strictly use HTTPS');
  }
  await resolvePublicAddresses(parsedUrl.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const onAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeout);
      throw new Error('CT log request aborted before starting');
    }
    externalSignal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DomainAttackSurfaceScanner-SubdomainClient/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`CT log lookup returned ${response.status}`);
    }

    const body = await response.text();
    if (body.length > config.maxResponseBytes) {
      throw new Error('Certificate Transparency response exceeded the configured size limit');
    }
    return JSON.parse(body) as unknown;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onAbort);
    }
  }
}

async function queryCrtSh(domain: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await fetchJsonWithTimeout(
    `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
    signal,
  )) as Array<Record<string, unknown>>;

  const names = new Set<string>();
  if (Array.isArray(data)) {
    for (const entry of data) {
      const rawNames = typeof entry?.name_value === 'string' ? entry.name_value : '';
      for (const value of rawNames.split(/\r?\n/)) {
        const cleaned = value.trim().toLowerCase().replace(/^\*\./, '');
        if (!cleaned) continue;
        if (cleaned === domain || cleaned.endsWith(`.${domain}`)) {
          names.add(cleaned);
        }
      }
    }
  }
  return [...names];
}

async function queryCertspotter(domain: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await fetchJsonWithTimeout(
    `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
    signal,
  )) as Array<{ dns_names?: string[] }>;

  const names = new Set<string>();
  if (Array.isArray(data)) {
    for (const entry of data) {
      const dnsNames = Array.isArray(entry.dns_names) ? entry.dns_names : [];
      for (const value of dnsNames) {
        if (typeof value !== 'string') continue;
        const cleaned = value.trim().toLowerCase().replace(/^\*\./, '');
        if (!cleaned) continue;
        if (cleaned === domain || cleaned.endsWith(`.${domain}`)) {
          names.add(cleaned);
        }
      }
    }
  }
  return [...names];
}

export async function runSubdomains(
  domain: string,
  options: SubdomainsOptions = {},
): Promise<SubdomainsResult> {
  if (options.signal?.aborted) {
    return {
      available: false,
      total: 0,
      subdomains: [],
      reason: 'Subdomains scan aborted',
    };
  }

  // Consume scan budget for outbound CT lookups
  if (options.budget) {
    options.budget.consume(1, 'Certificate Transparency lookups');
  }

  // Query both sources in parallel
  const [crtResult, certspotterResult] = await Promise.allSettled([
    queryCrtSh(domain, options.signal),
    queryCertspotter(domain, options.signal),
  ]);

  const sourceMap = new Map<string, Set<string>>();

  let crtSucceeded = false;
  let certspotterSucceeded = false;
  const failureReasons: string[] = [];

  if (crtResult.status === 'fulfilled') {
    crtSucceeded = true;
    for (const name of crtResult.value) {
      if (!sourceMap.has(name)) sourceMap.set(name, new Set());
      sourceMap.get(name)!.add('crt.sh');
    }
  } else {
    failureReasons.push(`crt.sh: ${crtResult.reason instanceof Error ? crtResult.reason.message : 'failed'}`);
  }

  if (certspotterResult.status === 'fulfilled') {
    certspotterSucceeded = true;
    for (const name of certspotterResult.value) {
      if (!sourceMap.has(name)) sourceMap.set(name, new Set());
      sourceMap.get(name)!.add('Certspotter');
    }
  } else {
    failureReasons.push(`Certspotter: ${certspotterResult.reason instanceof Error ? certspotterResult.reason.message : 'failed'}`);
  }

  // If both sources failed, return unavailable
  if (!crtSucceeded && !certspotterSucceeded) {
    const isTimeout = failureReasons.some((r) => r.toLowerCase().includes('abort') || r.toLowerCase().includes('timeout'));
    const reason = options.signal?.aborted
      ? 'Certificate Transparency query cancelled'
      : isTimeout
      ? 'Certificate Transparency log providers timed out'
      : failureReasons.join('; ');

    return {
      available: false,
      total: 0,
      subdomains: [],
      reason,
    };
  }

  // Merge and de-duplicate
  const sortedNames = [...sourceMap.keys()].sort().slice(0, config.maxSubdomains);
  const subdomainSources: Record<string, string[]> = {};
  for (const name of sortedNames) {
    subdomainSources[name] = [...sourceMap.get(name)!];
  }

  return {
    available: true,
    total: sortedNames.length,
    subdomains: sortedNames,
    subdomainSources,
  };
}
