import net from 'node:net';
import type { ScanRequestBudget } from './scanBudget';
import { resolvePublicAddresses } from './publicResolution';

export type WhoisRecord = {
  available: boolean;
  registrar?: string;
  creationDate?: string | null;
  expiryDate?: string | null;
  nameservers: string[];
  registrantOrg?: string | null;
  privacyStatus: 'public' | 'redacted' | 'unknown';
  reason?: string;
  rawText?: string;
};

export interface WhoisOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

const PRIVACY_PATTERNS = [
  /redacted/i,
  /privacy/i,
  /withheld/i,
  /whoisguard/i,
  /proxy/i,
  /contact privacy/i,
  /private person/i,
  /data protected/i,
  /not disclosed/i,
];

export function parseWhoisText(raw: string): Partial<WhoisRecord> {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: Partial<WhoisRecord> = {
    nameservers: [],
    privacyStatus: 'unknown',
  };

  const nsSet = new Set<string>();

  for (const line of lines) {
    // 1. Registrant Organization
    if (/^(?:Registrant Organization|organisation|org|Registrant):\s*(.+)$/i.test(line)) {
      const match = line.match(/^(?:Registrant Organization|organisation|org|Registrant):\s*(.+)$/i);
      const val = match?.[1]?.trim();
      if (val && !result.registrantOrg) {
        result.registrantOrg = val;
      }
    }

    // 2. Registrar Name
    if (/^(?:Registrar|Sponsoring Registrar|registrar|Registrar Name):\s*(.+)$/i.test(line)) {
      const match = line.match(/^(?:Registrar|Sponsoring Registrar|registrar|Registrar Name):\s*(.+)$/i);
      const val = match?.[1]?.trim();
      if (val && !result.registrar) {
        result.registrar = val;
      }
    }

    // 3. Creation Date
    if (/^(?:Creation Date|Created On|Registration Time|created|Created):\s*(.+)$/i.test(line)) {
      const match = line.match(/^(?:Creation Date|Created On|Registration Time|created|Created):\s*(.+)$/i);
      const val = match?.[1]?.trim();
      if (val && !result.creationDate) {
        result.creationDate = val;
      }
    }

    // 4. Expiration Date
    if (/^(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|expires|Expiry Date):\s*(.+)$/i.test(line)) {
      const match = line.match(/^(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|expires|Expiry Date):\s*(.+)$/i);
      const val = match?.[1]?.trim();
      if (val && !result.expiryDate) {
        result.expiryDate = val;
      }
    }

    // 5. Nameservers
    if (/^(?:Name Server|nserver):\s*([a-zA-Z0-9.-]+)/i.test(line)) {
      const match = line.match(/^(?:Name Server|nserver):\s*([a-zA-Z0-9.-]+)/i);
      const val = match?.[1]?.trim().toLowerCase().replace(/\.$/, '');
      if (val && val.includes('.')) {
        nsSet.add(val);
      }
    }
  }

  result.nameservers = Array.from(nsSet);

  // Assess privacy status
  if (result.registrantOrg) {
    const isRedacted = PRIVACY_PATTERNS.some((pat) => pat.test(result.registrantOrg!));
    if (isRedacted) {
      result.privacyStatus = 'redacted';
      result.registrantOrg = null;
    } else {
      result.privacyStatus = 'public';
    }
  } else {
    const rawLower = raw.toLowerCase();
    const hasRedactionText = PRIVACY_PATTERNS.some((pat) => pat.test(rawLower));
    if (hasRedactionText) {
      result.privacyStatus = 'redacted';
    }
  }

  return result;
}

export function extractReferralServer(raw: string): string | null {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines) {
    const match = line.match(/^(?:refer|whois|Registrar WHOIS Server|Whois Server):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?::\d+)?$/i);
    if (match && match[1]) {
      const server = match[1].trim().toLowerCase();
      // Ignore referrals back to root or self
      if (server !== 'whois.iana.org' && !server.includes('@')) {
        return server;
      }
    }
  }
  return null;
}

async function querySingleWhoisServer(
  server: string,
  domain: string,
  signal?: AbortSignal,
  timeoutMs = 6000,
): Promise<string> {
  const addresses = await resolvePublicAddresses(server);
  const targetIp = addresses.find((a) => net.isIPv4(a)) ?? addresses[0];
  if (!targetIp) {
    throw new Error(`Unable to resolve public address for WHOIS server ${server}`);
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('WHOIS query aborted before connection'));
      return;
    }

    const socket = net.createConnection({
      host: targetIp,
      port: 43,
      timeout: timeoutMs,
    });

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const maxBytes = 65536; // 64KB cap for WHOIS output

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`WHOIS server ${server} timed out`));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error('WHOIS query cancelled by signal'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    socket.on('connect', () => {
      socket.write(`${domain}\r\n`);
    });

    socket.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        socket.destroy();
        resolve(Buffer.concat(chunks).toString('utf8'));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });

    socket.on('timeout', () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error(`WHOIS server ${server} timed out`));
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      reject(err);
    });

    socket.on('close', () => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

export async function runWhois(domain: string, options: WhoisOptions = {}): Promise<WhoisRecord> {
  if (options.signal?.aborted) {
    return {
      available: false,
      nameservers: [],
      privacyStatus: 'unknown',
      reason: 'WHOIS scan aborted before starting',
    };
  }

  if (options.budget) {
    options.budget.consume(1, `WHOIS: ${domain}`);
  }

  const visitedServers = new Set<string>();
  let currentServer = 'whois.iana.org';
  const bestRecord: Partial<WhoisRecord> = { nameservers: [], privacyStatus: 'unknown' };
  const rawOutputs: string[] = [];

  const maxHops = 3; // IANA -> TLD Registry -> Registrar

  for (let hop = 0; hop < maxHops; hop++) {
    if (visitedServers.has(currentServer)) break;
    visitedServers.add(currentServer);

    try {
      const raw = await querySingleWhoisServer(currentServer, domain, options.signal, 5000);
      rawOutputs.push(raw);
      const parsed = parseWhoisText(raw);

      // Merge newly discovered fields
      if (parsed.registrar && !bestRecord.registrar) bestRecord.registrar = parsed.registrar;
      if (parsed.creationDate && !bestRecord.creationDate) bestRecord.creationDate = parsed.creationDate;
      if (parsed.expiryDate && !bestRecord.expiryDate) bestRecord.expiryDate = parsed.expiryDate;
      if (parsed.registrantOrg && !bestRecord.registrantOrg) bestRecord.registrantOrg = parsed.registrantOrg;
      if (parsed.nameservers && parsed.nameservers.length > 0) {
        bestRecord.nameservers = Array.from(new Set([...(bestRecord.nameservers ?? []), ...parsed.nameservers]));
      }
      if (parsed.privacyStatus && parsed.privacyStatus !== 'unknown') {
        bestRecord.privacyStatus = parsed.privacyStatus;
      }

      // Check for next referral server
      const nextReferral = extractReferralServer(raw);
      if (nextReferral && !visitedServers.has(nextReferral)) {
        currentServer = nextReferral;
      } else {
        // No further referral, we reached authoritative response
        break;
      }
    } catch {
      // If a referral hop fails, we still retain whatever info earlier hops gathered
      break;
    }
  }

  const combinedRaw = rawOutputs.join('\n');
  const isRegistered =
    Boolean(bestRecord.registrar) ||
    Boolean(bestRecord.creationDate) ||
    Boolean(bestRecord.expiryDate) ||
    (bestRecord.nameservers?.length ?? 0) > 0 ||
    /domain\s*name:\s*/i.test(combinedRaw) ||
    /domain:\s*/i.test(combinedRaw);

  if (!isRegistered && !combinedRaw.trim()) {
    return {
      available: false,
      nameservers: [],
      privacyStatus: 'unknown',
      reason: 'WHOIS data unavailable',
    };
  }

  return {
    available: isRegistered,
    registrar: bestRecord.registrar,
    creationDate: bestRecord.creationDate ?? null,
    expiryDate: bestRecord.expiryDate ?? null,
    nameservers: bestRecord.nameservers ?? [],
    registrantOrg: bestRecord.registrantOrg ?? null,
    privacyStatus: bestRecord.privacyStatus ?? 'unknown',
    rawText: combinedRaw ? combinedRaw.slice(0, 16384) : undefined,
  };
}
