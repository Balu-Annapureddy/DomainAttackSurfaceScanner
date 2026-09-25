import tls from 'node:tls';
import net from 'node:net';
import crypto from 'node:crypto';
import { resolvePublicAddresses } from './publicResolution';
import type { ScanRequestBudget } from './scanBudget';

export interface TlsResult {
  available: boolean;
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
}

export interface TlsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export async function runTls(domain: string, options: TlsOptions = {}): Promise<TlsResult> {
  if (options.signal?.aborted) {
    return { available: false, reason: 'TLS scan aborted before starting' };
  }

  if (options.budget) {
    options.budget.consume(1, `TLS handshake: ${domain}`);
  }

  let address: string;
  try {
    const addresses = await resolvePublicAddresses(domain);
    address = addresses.find((a) => net.isIPv4(a)) ?? addresses[0] ?? '';
    if (!address) {
      throw new Error('No public address resolved');
    }
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'Target resolution failed' };
  }

  return new Promise((resolve) => {
    if (options.signal?.aborted) {
      resolve({ available: false, reason: 'TLS handshake aborted' });
      return;
    }

    // Intentional passive scanner design: rejectUnauthorized is false to permit TLS
    // handshake completion even if the target has an invalid or self-signed certificate.
    // This allows inspecting peer certificate details (SANs, expiry, issuer) while recording
    // socket.authorized and socket.authorizationError as security findings.
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
      resolve({ available: false, reason: 'TLS handshake timed out' });
    }, 8000);

    const onAbort = () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ available: false, reason: 'TLS operation aborted' });
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

      resolve({
        available: true,
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
      });
      socket.end();
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      resolve({ available: false, reason: `No HTTPS listener on port 443 (${err.message})` });
    });
  });
}
