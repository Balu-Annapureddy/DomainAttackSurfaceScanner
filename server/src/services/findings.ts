import { randomUUID } from 'node:crypto';
import type { DomainScan, Evidence, Finding } from '../../../shared/types';

function evidence(source: string, description: string, confidence: Evidence['confidence'] = 'high'): Evidence {
  return { source, description, confidence, observedAt: new Date().toISOString() };
}

export function buildFindings(scan: DomainScan): Finding[] {
  const findings: Finding[] = [];
  const http = scan.categories.http.data as { https?: { missingSecurityHeaders?: string[] }; httpsEnforced?: boolean } | undefined;
  const dns = scan.categories.dns.data as { dmarc?: { present?: boolean; policy?: string }; spf?: { present?: boolean } } | undefined;
  const tls = scan.categories.tls.data as { available?: boolean; validTo?: string } | undefined;

  if (http?.httpsEnforced === false) {
    findings.push({
      id: randomUUID(), title: 'HTTPS enforcement was not observed', severity: 'medium', kind: 'configuration_weakness',
      category: 'http', description: 'The HTTP response did not demonstrate a redirect to HTTPS.', recommendation: 'Redirect HTTP requests to HTTPS and review canonical URL handling.',
      evidence: [evidence('HTTP response', 'Plain HTTP did not redirect to an HTTPS URL')], confidence: 'high',
    });
  }

  for (const header of http?.https?.missingSecurityHeaders ?? []) {
    findings.push({
      id: randomUUID(), title: `Missing ${header} response header`, severity: 'low', kind: 'configuration_weakness',
      category: 'http', description: `The HTTPS response did not include ${header}. This is a configuration observation, not proof of a vulnerability.`,
      recommendation: `Review whether ${header} is appropriate for the application and configure it deliberately.`,
      evidence: [evidence('HTTPS response headers', `Header ${header} was not observed`)], confidence: 'high',
    });
  }

  if (tls?.available === false) {
    findings.push({
      id: randomUUID(), title: 'No usable TLS service was observed', severity: 'medium', kind: 'configuration_weakness',
      category: 'tls', description: 'A TLS handshake could not be completed on the standard HTTPS endpoint.',
      recommendation: 'Provide HTTPS for public web services where appropriate.', evidence: [evidence('TLS handshake', 'No usable TLS service was observed')], confidence: 'medium',
    });
  }

  if (!dns?.spf?.present) {
    findings.push({
      id: randomUUID(), title: 'SPF record was not observed', severity: 'low', kind: 'recommendation',
      category: 'dns', description: 'No SPF TXT record was found at the scanned domain.', recommendation: 'Review mail-sending domains and publish an accurate SPF policy if email is used.',
      evidence: [evidence('DNS TXT lookup', 'No SPF record was observed')], confidence: 'medium',
    });
  }

  if (!dns?.dmarc?.present) {
    findings.push({
      id: randomUUID(), title: 'DMARC record was not observed', severity: 'low', kind: 'recommendation',
      category: 'dns', description: 'No DMARC policy was found at the standard DNS location.', recommendation: 'Consider publishing and gradually enforcing a DMARC policy for organizational domains.',
      evidence: [evidence('DNS TXT lookup', 'No DMARC record was observed')], confidence: 'medium',
    });
  }

  if (tls?.validTo) {
    const days = Math.ceil((new Date(tls.validTo).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 30) {
      findings.push({
        id: randomUUID(), title: 'Certificate expires soon', severity: days <= 7 ? 'medium' : 'low', kind: 'configuration_weakness',
        category: 'tls', description: `The observed certificate expires in approximately ${days} days.`,
        recommendation: 'Renew the certificate before its validity window ends.', evidence: [evidence('TLS certificate', `Observed valid-to date ${tls.validTo}`)], confidence: 'high',
      });
    }
  }

  return findings;
}
