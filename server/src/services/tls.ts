import tls from 'node:tls';

export async function runTls(domain: string): Promise<{ available: boolean; reason?: string; subject?: string; issuer?: string; validFrom?: string; validTo?: string; protocol?: string; subjectAltNames?: string[]; signatureAlgorithm?: string; authorized?: boolean; }> {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
    });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ available: false, reason: 'TLS handshake timed out' });
    }, 8000);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
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
      });
      socket.end();
    });

    socket.once('error', () => {
      clearTimeout(timer);
      resolve({ available: false, reason: 'No HTTPS listener on port 443' });
    });
  });
}
