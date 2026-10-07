import type { DomainScan } from '../../../shared/types';

/**
 * Generates an executive narrative summary paragraph describing the scan findings,
 * asset footprint, and security posture in natural, human-written prose.
 */
export function generateNarrativeSummary(scan: DomainScan): string {
  const domain = scan.domain;
  const assets = scan.assets ?? [];
  const findings = scan.findings ?? [];
  const score = scan.score ?? null;

  const subdomains = assets.filter((a) => a.type === 'SUBDOMAIN');
  const ips = assets.filter((a) => a.type === 'IP');
  const nameservers = assets.filter((a) => a.type === 'NAMESERVER');
  const orgAsset = assets.find((a) => a.type === 'ORGANIZATION');

  const highFindings = findings.filter((f) => f.severity === 'high');
  const medFindings = findings.filter((f) => f.severity === 'medium');

  // Sentence 1: Asset footprint and scope
  let intro = `A passive external security evaluation of ${domain} mapped ${assets.length} connected attack surface assets`;
  if (subdomains.length > 0) {
    intro += `, including ${subdomains.length} public child subdomain${subdomains.length > 1 ? 's' : ''}`;
  }
  if (ips.length > 0) {
    intro += ` routing across ${ips.length} distinct IP endpoint${ips.length > 1 ? 's' : ''}`;
  }
  if (orgAsset?.value) {
    intro += ` hosted primarily via ${orgAsset.value}`;
  }
  if (nameservers.length > 0) {
    intro += ` with authoritative DNS managed by ${nameservers.slice(0, 2).map((n) => n.value).join(', ')}`;
  }
  intro += '.';

  // Sentence 2: Posture and score evaluation
  let postureSentence = '';
  if (score !== null) {
    if (score >= 85) {
      postureSentence = ` The domain demonstrates a hardened configuration posture with an external hygiene score of ${score}/100, reflecting robust TLS transport and disciplined public perimeter controls.`;
    } else if (score >= 65) {
      postureSentence = ` The perimeter received an external hygiene score of ${score}/100, reflecting foundational encryption with opportunities to reinforce defensive headers and email authentication policies.`;
    } else if (score >= 45) {
      postureSentence = ` The external surface yielded an hygiene score of ${score}/100, indicating measurable defense-in-depth gaps that increase attack surface discoverability.`;
    } else {
      postureSentence = ` The domain received a hygiene score of ${score}/100, pointing to multiple exposed services or missing baseline transport protections that warrant prioritized review.`;
    }
  }

  // Sentence 3: Key findings and observations
  let findingsSentence = '';
  if (highFindings.length > 0) {
    const highTitles = highFindings.slice(0, 2).map((f) => `“${f.title}”`).join(' and ');
    findingsSentence = ` Automated analysis highlighted ${highFindings.length} high-severity condition${highFindings.length > 1 ? 's' : ''} requiring immediate verification: ${highTitles}.`;
  } else if (medFindings.length > 0) {
    const medTitles = medFindings.slice(0, 2).map((f) => `“${f.title}”`).join(' and ');
    findingsSentence = ` While no critical perimeter vulnerabilities were observed, ${medFindings.length} moderate hygiene gap${medFindings.length > 1 ? 's' : ''} were noted, including ${medTitles}.`;
  } else if (findings.length > 0) {
    findingsSentence = ` No high or medium severity weaknesses were identified; recorded observations represent informational telemetry and defensive hardening recommendations.`;
  } else {
    findingsSentence = ` All inspected DNS delegations, TLS certificates, and HTTP response parameters aligned with contemporary public security best practices with no anomalies observed.`;
  }

  return `${intro}${postureSentence}${findingsSentence}`;
}
