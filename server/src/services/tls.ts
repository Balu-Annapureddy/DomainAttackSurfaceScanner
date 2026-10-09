import tls from 'node:tls';
import net from 'node:net';
import crypto from 'node:crypto';
import { resolvePublicAddresses } from './publicResolution';
import type { ScanRequestBudget } from './scanBudget';

export interface TlsResult {
  available: boolean;
  outcome?: 'confirmed_absent' | 'connection_failed' | 'available';
  reason?: string;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  protocol?: string;
  subjectAltNames?: string[];
  signatureAlgorithm?: string;
  authorized?: boolean;
  authorizationError?: string;
  fingerprint256?: string;
  serialNumber?: string;
  chainLength?: number;
  chainComplete?: boolean;
  hasIntermediateCertificate?: boolean;
  hostnameMismatch?: boolean;
}

export interface TlsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

interface HandshakeAttemptOutcome {
  success: boolean;
  result?: TlsResult;
  isRefused?: boolean;
  reason?: string;
}

function attemptHandshakeOnAddress(
  domain: string,
  address: string,
  options: TlsOptions,
): Promise<HandshakeAttemptOutcome> {
  return new Promise((resolve) => {
    if (options.signal?.aborted) {
      resolve({ success: false, isRefused: false, reason: 'TLS operation aborted' });
      return;
    }

    const socket = tls.connect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
      lookup: (_hostname, _opts, callback) => {
        if (options.signal?.aborted) {
          callback(new Error('TLS lookup aborted'), '', 4);
          return;
        }
        callback(null, address, net.isIPv6(address) ? 6 : 4);
      },
    });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, isRefused: false, reason: 'TLS handshake timed out' });
    }, 8000);

    const onAbort = () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: false, isRefused: false, reason: 'TLS operation aborted' });
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }

      const cert = socket.getPeerCertificate(true);
      const subjectAltNames = (() => {
        if (!cert || !cert.subjectaltname) {
          return [];
        }

        return cert.subjectaltname
          .split(',')
          .map((entry: string) => entry.trim())
          .filter((entry: string) => entry.toLowerCase().startsWith('dns:'))
          .map((entry: string) => entry.replace(/^dns:/i, '').trim());
      })();

      const certData = cert as unknown as Record<string, unknown>;

      let fingerprint256 = cert.fingerprint256;
      if (!fingerprint256 && cert.raw) {
        fingerprint256 = crypto.createHash('sha256').update(cert.raw).digest('hex');
      }

      const authErr = socket.authorizationError
        ? (socket.authorizationError instanceof Error ? socket.authorizationError.message : String(socket.authorizationError))
        : undefined;

      // Certificate chain traversal
      let chainLength = 0;
      let curr: any = cert;
      while (curr) {
        chainLength += 1;
        if (!curr.issuerCertificate || curr.issuerCertificate === curr) {
          break;
        }
        curr = curr.issuerCertificate;
      }

      const isSelfSigned = Boolean(
        cert &&
        cert.subject &&
        cert.issuer &&
        JSON.stringify(cert.subject) === JSON.stringify(cert.issuer),
      );
      const hasIntermediateCertificate = chainLength > 1;
      const chainComplete = isSelfSigned ? true : hasIntermediateCertificate;

      // Hostname verification against SANs and CN
      const targetDomain = domain.toLowerCase().replace(/\.$/, '');
      const certCn = typeof cert?.subject?.CN === 'string'
        ? cert.subject.CN.toLowerCase().replace(/\.$/, '')
        : undefined;
      const candidateNames = [...subjectAltNames];
      if (certCn && !candidateNames.includes(certCn)) {
        candidateNames.push(certCn);
      }

      const hostnameMatch = candidateNames.length > 0
        ? candidateNames.some((san) => {
            const norm = san.toLowerCase().replace(/\.$/, '');
            if (norm === targetDomain) return true;
            if (norm.startsWith('*.') && targetDomain.endsWith(`.${norm.slice(2)}`)) {
              const base = norm.slice(2);
              const prefix = targetDomain.slice(0, targetDomain.length - base.length - 1);
              return !prefix.includes('.');
            }
            return false;
          })
        : undefined;

      const hostnameMismatch = hostnameMatch === undefined ? undefined : !hostnameMatch;

      const result: TlsResult = {
        available: true,
        outcome: 'available',
        subject: cert.subject ? JSON.stringify(cert.subject) : undefined,
        issuer: cert.issuer ? JSON.stringify(cert.issuer) : undefined,
        validFrom: cert.valid_from || undefined,
        validTo: cert.valid_to || undefined,
        protocol: socket.getProtocol() || undefined,
        subjectAltNames,
        signatureAlgorithm: typeof certData.signatureAlgorithm === 'string' ? certData.signatureAlgorithm : typeof certData.sigalg === 'string' ? certData.sigalg : undefined,
        authorized: socket.authorized,
        authorizationError: authErr,
        fingerprint256: fingerprint256 || undefined,
        serialNumber: cert.serialNumber || undefined,
        chainLength,
        chainComplete,
        hasIntermediateCertificate,
        hostnameMismatch,
      };

      socket.end();
      resolve({ success: true, result });
    });

    socket.once('error', (err: any) => {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      const isRefused = err?.code === 'ECONNREFUSED' || String(err?.message).includes('ECONNREFUSED');
      resolve({
        success: false,
        isRefused,
        reason: isRefused
          ? `Connection refused on port 443 (${address})`
          : `TLS connection failed on ${address} (${err.message})`,
      });
    });
  });
}

export async function runTls(domain: string, options: TlsOptions = {}): Promise<TlsResult> {
  if (options.signal?.aborted) {
    return {
      available: false,
      outcome: 'connection_failed',
      reason: 'TLS scan aborted before starting',
    };
  }

  if (options.budget) {
    options.budget.consume(1, `TLS handshake: ${domain}`);
  }

  let addresses: string[];
  try {
    const resolved = await resolvePublicAddresses(domain);
    // Prioritize IPv4 addresses first, then IPv6
    addresses = [
      ...resolved.filter((a) => net.isIPv4(a)),
      ...resolved.filter((a) => net.isIPv6(a)),
    ];
    if (addresses.length === 0) {
      throw new Error('No public address resolved');
    }
  } catch (error) {
    return {
      available: false,
      outcome: 'connection_failed',
      reason: error instanceof Error ? error.message : 'Target resolution failed',
    };
  }

  // Attempt up to 2 resolved addresses before giving up
  const candidates = addresses.slice(0, 2);
  const failureReasons: string[] = [];
  let allRefused = true;

  for (const address of candidates) {
    if (options.signal?.aborted) break;

    const attempt = await attemptHandshakeOnAddress(domain, address, options);
    if (attempt.success && attempt.result) {
      return attempt.result;
    }

    if (!attempt.isRefused) {
      allRefused = false;
    }
    if (attempt.reason) {
      failureReasons.push(attempt.reason);
    }
  }

  const combinedReason = failureReasons.join('; ') || 'Connection failed';
  const outcome: 'confirmed_absent' | 'connection_failed' =
    allRefused && failureReasons.length > 0 ? 'confirmed_absent' : 'connection_failed';

  return {
    available: false,
    outcome,
    reason: outcome === 'confirmed_absent'
      ? `No HTTPS listener on port 443 (connection refused across ${candidates.length} address${candidates.length > 1 ? 'es' : ''})`
      : `TLS verification inconclusive: ${combinedReason}`,
  };
}
