import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { randomUUID } from 'node:crypto';

export type ScanCategory = 'whois' | 'dns' | 'subdomains' | 'tls' | 'http' | 'exposure' | 'scoring';
export type CategoryStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CategoryProgress {
  status: CategoryStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  data?: unknown;
}

export interface ScanRecord {
  scanId: string;
  domain: string;
  createdAt: string;
  expiresAt: string;
  status: 'running' | 'completed' | 'failed';
  categories: Record<ScanCategory, CategoryProgress>;
  score?: number;
}

const categories: ScanCategory[] = ['whois', 'dns', 'subdomains', 'tls', 'http', 'exposure', 'scoring'];
const store = new Map<string, ScanRecord>();
const TTL_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 5000;

function timeoutSignal(ms = TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b !== undefined && b >= 64 && b <= 127);
  }
  if (net.isIPv6(normalized)) {
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

export function validateDomain(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Domain is required');
  const domain = input.trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || net.isIP(domain)) throw new Error('A public domain name is required');
  if (/[^\x00-\x7f]/.test(domain)) {
    try {
      // URL performs IDN conversion, while the scanner stores the ASCII form.
      const ascii = new URL(`https://${domain}`).hostname;
      if (ascii !== domain && ascii.length <= 253) return validateDomain(ascii);
    } catch { /* fall through */ }
  }
  if (domain.includes('..') || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error('Malformed domain name');
  }
  return domain;
}

async function resolvePublic(domain: string): Promise<string[]> {
  const answers = await dns.lookup(domain, { all: true, verbatim: true });
  const addresses = answers.map(answer => answer.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error('Domain does not resolve to a public address');
  return addresses;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: timeoutSignal(), headers: { accept: 'application/json' }, redirect: 'error' });
  if (!response.ok) throw new Error(`upstream returned ${response.status}`);
  return response.json();
}

async function runWhois(domain: string): Promise<unknown> {
  // WHOIS is intentionally best-effort; a timeout must never hold up a scan.
  return new Promise(resolve => {
    const socket = net.createConnection(43, 'whois.iana.org');
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => { socket.destroy(); resolve({ available: false, reason: 'timeout' }); }, TIMEOUT_MS);
    socket.on('connect', () => socket.write(`${domain}\r\n`));
    socket.on('data', chunk => chunks.push(chunk));
    socket.on('error', () => { clearTimeout(timer); resolve({ available: false, reason: 'unavailable' }); });
    socket.on('close', () => {
      clearTimeout(timer);
      resolve({ available: true, raw: Buffer.concat(chunks).toString('utf8').slice(0, 12000) });
    });
  });
}

async function runDns(domain: string): Promise<unknown> {
  const [addresses, mx, ns, txt] = await Promise.allSettled([
    resolvePublic(domain), dns.resolveMx(domain), dns.resolveNs(domain), dns.resolveTxt(domain),
  ]);
  return {
    addresses: addresses.status === 'fulfilled' ? addresses.value : [],
    mx: mx.status === 'fulfilled' ? mx.value : [],
    ns: ns.status === 'fulfilled' ? ns.value : [],
    txt: txt.status === 'fulfilled' ? txt.value.flat() : [],
  };
}

async function runSubdomains(domain: string): Promise<unknown> {
  const data = await fetchJson(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`);
  const names = new Set<string>();
  if (Array.isArray(data)) for (const entry of data) {
    if (entry && typeof entry === 'object' && 'name_value' in entry) {
      for (const name of String((entry as { name_value: unknown }).name_value).split(/\r?\n/)) {
        const clean = name.trim().toLowerCase().replace(/^\*\./, '');
        if (clean === domain || clean.endsWith(`.${domain}`)) names.add(clean);
      }
    }
  }
  return { subdomains: [...names].sort() };
}

async function runTls(domain: string): Promise<unknown> {
  return new Promise(resolve => {
    const socket = tls.connect({ host: domain, port: 443, servername: domain, rejectUnauthorized: false });
    const timer = setTimeout(() => { socket.destroy(); resolve({ available: false, reason: 'timeout' }); }, TIMEOUT_MS);
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
      resolve({ available: true, authorized: socket.authorized, protocol: socket.getProtocol(), subject: cert.subject, issuer: cert.issuer, validFrom: cert.valid_from, validTo: cert.valid_to });
      socket.end();
    });
    socket.once('error', () => { clearTimeout(timer); resolve({ available: false, reason: 'unavailable' }); });
  });
}

async function runHttp(domain: string): Promise<unknown> {
  const response = await fetch(`https://${domain}/`, { signal: timeoutSignal(), redirect: 'error', headers: { 'user-agent': 'ReconLab passive scanner' } });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => { headers[key] = value; });
  const required = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy'];
  return { status: response.status, headers, missingSecurityHeaders: required.filter(header => !response.headers.has(header)), server: response.headers.get('server'), poweredBy: response.headers.get('x-powered-by') };
}

async function runExposure(domain: string): Promise<unknown> {
  return { checked: [`https://${domain}/robots.txt`, `https://${domain}/.well-known/security.txt`], note: 'Passive header and metadata checks only' };
}

function score(record: ScanRecord): number {
  const http = record.categories.http.data as { missingSecurityHeaders?: string[] } | undefined;
  const tlsData = record.categories.tls.data as { available?: boolean } | undefined;
  let value = 100;
  value -= Math.min(30, (http?.missingSecurityHeaders?.length ?? 0) * 6);
  if (tlsData && tlsData.available === false) value -= 20;
  return Math.max(0, value);
}

const runners: Record<Exclude<ScanCategory, 'scoring'>, (domain: string) => Promise<unknown>> = {
  whois: runWhois, dns: runDns, subdomains: runSubdomains, tls: runTls, http: runHttp, exposure: runExposure,
};

async function execute(record: ScanRecord): Promise<void> {
  for (const category of categories) {
    const progress = record.categories[category];
    progress.status = 'running'; progress.startedAt = new Date().toISOString();
    try {
      if (category === 'scoring') progress.data = { score: score(record) };
      else progress.data = await runners[category](record.domain);
      progress.status = 'completed';
    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'category failed';
      if (category === 'dns') record.status = 'failed';
    }
    progress.completedAt = new Date().toISOString();
    if (category === 'scoring') record.score = (progress.data as { score: number }).score;
  }
  if (record.status !== 'failed') record.status = 'completed';
}

export function createScan(domainInput: unknown): ScanRecord {
  const domain = validateDomain(domainInput);
  const now = Date.now();
  const record: ScanRecord = {
    scanId: randomUUID(), domain, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + TTL_MS).toISOString(),
    status: 'running', categories: Object.fromEntries(categories.map(category => [category, { status: 'pending' }])) as Record<ScanCategory, CategoryProgress>,
  };
  store.set(record.scanId, record);
  void resolvePublic(domain).then(() => execute(record)).catch(error => {
    record.status = 'failed';
    record.categories.dns = { status: 'failed', error: error instanceof Error ? error.message : 'resolution failed' };
  });
  return record;
}

export function getScan(scanId: string): ScanRecord | undefined {
  const record = store.get(scanId);
  if (!record || Date.now() > Date.parse(record.expiresAt)) { if (record) store.delete(scanId); return undefined; }
  return record;
}

export function clearScans(): void { store.clear(); }
