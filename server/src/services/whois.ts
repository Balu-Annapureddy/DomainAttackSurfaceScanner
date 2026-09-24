import net from 'node:net';
import type { ScanRequestBudget } from './scanBudget';

export type WhoisRecord = {
  available: boolean;
  registrar?: string;
  creationDate?: string | null;
  expiryDate?: string | null;
  nameservers: string[];
  registrantOrg?: string | null;
  privacyStatus: 'public' | 'redacted' | 'unknown';
  reason?: string;
};

export interface WhoisOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

function parseWhoisText(raw: string): Partial<WhoisRecord> {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: Partial<WhoisRecord> = {
    nameservers: [],
    privacyStatus: 'unknown',
  };

  for (const line of lines) {
    if (line.startsWith('organisation:') || line.startsWith('org:')) {
      result.registrantOrg = line.slice(line.indexOf(':') + 1).trim() || null;
    }

    if (line.startsWith('registrar:')) {
      result.registrar = line.slice(line.indexOf(':') + 1).trim() || undefined;
    }

    if (line.startsWith('created:')) {
      result.creationDate = line.slice(line.indexOf(':') + 1).trim() || null;
    }

    if (line.startsWith('expires:')) {
      result.expiryDate = line.slice(line.indexOf(':') + 1).trim() || null;
    }

    if (line.startsWith('nserver:')) {
      const value = line.slice(line.indexOf(':') + 1).trim();
      if (value) {
        result.nameservers = [...(result.nameservers ?? []), value];
      }
    }
  }

  if (result.registrantOrg) {
    result.privacyStatus = 'public';
  } else if (!result.registrantOrg && lines.some((line) => line.toLowerCase().includes('redacted'))) {
    result.privacyStatus = 'redacted';
  }

  return result;
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

  return new Promise((resolve) => {
    if (options.signal?.aborted) {
      resolve({
        available: false,
        nameservers: [],
        privacyStatus: 'unknown',
        reason: 'WHOIS aborted',
      });
      return;
    }

    const socket = net.createConnection(43, 'whois.iana.org');
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        available: false,
        nameservers: [],
        privacyStatus: 'unknown',
        reason: 'WHOIS server timed out',
      });
    }, 8000);

    const onAbort = () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({
        available: false,
        nameservers: [],
        privacyStatus: 'unknown',
        reason: 'WHOIS cancelled by signal',
      });
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    socket.on('connect', () => {
      socket.write(`${domain}\r\n`);
    });

    socket.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      resolve({
        available: false,
        nameservers: [],
        privacyStatus: 'unknown',
        reason: `WHOIS lookup unavailable: ${err.message}`,
      });
    });

    socket.on('close', () => {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      const parsed = parseWhoisText(raw);

      if (!raw || !raw.includes('domain:')) {
        resolve({
          available: false,
          nameservers: [],
          privacyStatus: 'unknown',
          reason: 'WHOIS data unavailable',
        });
        return;
      }

      resolve({
        available: true,
        registrar: parsed.registrar ?? undefined,
        creationDate: parsed.creationDate ?? null,
        expiryDate: parsed.expiryDate ?? null,
        nameservers: parsed.nameservers ?? [],
        registrantOrg: parsed.registrantOrg ?? null,
        privacyStatus: parsed.privacyStatus ?? 'unknown',
      });
    });
  });
}
