import type { Asset, Relationship } from '../../../shared/types';
import { explainAsset } from '../../../shared/assetExplanation';

/**
 * Generates an analytical text narrative walking through the assets and relationships
 * represented in the attack surface topology graph.
 */
export function generateGraphNarrative(assets: Asset[], relationships: Relationship[]): string {
  if (!assets || assets.length === 0) {
    return 'No connected infrastructure assets were discovered during this scan.';
  }

  const domain = assets.find((a) => a.type === 'DOMAIN');
  const subdomains = assets.filter((a) => a.type === 'SUBDOMAIN');
  const ips = assets.filter((a) => a.type === 'IP');
  const nameservers = assets.filter((a) => a.type === 'NAMESERVER');
  const mailServers = assets.filter((a) => a.type === 'MAIL_SERVER');
  const asns = assets.filter((a) => a.type === 'ASN');
  const orgs = assets.filter((a) => a.type === 'ORGANIZATION');
  const vulns = assets.filter((a) => a.type === 'VULNERABILITY');
  const cloudStorage = assets.filter((a) => a.type === 'CLOUD_STORAGE');

  // Breakdown of IPs (IPv4 vs IPv6)
  const ipv4Count = ips.filter((ip) => ip.value.includes('.')).length;
  const ipv6Count = ips.filter((ip) => ip.value.includes(':')).length;

  const parts: string[] = [];
  if (domain) parts.push('1 apex domain');
  if (subdomains.length > 0) parts.push(`${subdomains.length} subdomain${subdomains.length > 1 ? 's' : ''}`);
  if (ips.length > 0) {
    const ipDetail =
      ipv4Count > 0 && ipv6Count > 0
        ? ` (${ipv4Count} IPv4, ${ipv6Count} IPv6)`
        : ipv4Count > 0
        ? ` (IPv4)`
        : ` (IPv6)`;
    parts.push(`${ips.length} IP address${ips.length > 1 ? 'es' : ''}${ipDetail}`);
  }
  if (nameservers.length > 0) {
    const nsNames = nameservers.slice(0, 2).map((n) => n.value).join(', ');
    const moreNs = nameservers.length > 2 ? ` and ${nameservers.length - 2} more` : '';
    parts.push(`${nameservers.length} nameserver${nameservers.length > 1 ? 's' : ''} (${nsNames}${moreNs})`);
  }
  if (mailServers.length > 0) {
    parts.push(`${mailServers.length} mail exchanger${mailServers.length > 1 ? 's' : ''}`);
  }
  if (asns.length > 0) {
    const asnNames = asns.slice(0, 2).map((a) => a.value).join(', ');
    parts.push(`${asns.length} autonomous system${asns.length > 1 ? 's' : ''} (${asnNames})`);
  }
  if (orgs.length > 0) {
    const orgNames = orgs.slice(0, 2).map((o) => o.value).join(', ');
    parts.push(`${orgs.length} owning organization${orgs.length > 1 ? 's' : ''} (${orgNames})`);
  }
  if (cloudStorage.length > 0) {
    parts.push(`${cloudStorage.length} cloud storage namespace${cloudStorage.length > 1 ? 's' : ''}`);
  }
  if (vulns.length > 0) {
    parts.push(`${vulns.length} correlated vulnerability record${vulns.length > 1 ? 's' : ''}`);
  }

  let narrative = `This scan identified ${assets.length} connected assets and ${relationships.length} operational relationships across the public perimeter: ${parts.join(', ')}.`;

  // Network consolidation vs multi-provider distribution analysis
  if (ips.length > 0) {
    const uniqueAsns = Array.from(new Set(asns.map((a) => a.value)));
    const uniqueOrgs = Array.from(new Set(orgs.map((o) => o.value)));

    if (uniqueAsns.length <= 1 && uniqueOrgs.length <= 1) {
      const providerName = uniqueOrgs[0] || uniqueAsns[0] || 'a single network provider';
      narrative += ` All resolved IP addresses route to the same Autonomous System (${uniqueAsns[0] || 'AS'}), indicating this domain's perimeter is consolidated under ${providerName} rather than fragmented across multiple independent hosting facilities.`;
    } else {
      narrative += ` Resolved host endpoints span ${uniqueAsns.length} autonomous systems and ${uniqueOrgs.length} operating organizations, demonstrating a distributed multi-cloud or hybrid infrastructure footprint.`;
    }
  }

  // Authoritative routing & DNS context
  if (nameservers.length > 0) {
    const primaryNs = nameservers[0];
    const nsExplanation = primaryNs ? explainAsset(primaryNs) : null;
    if (nsExplanation && nameservers.length >= 2) {
      narrative += ` Authoritative zone control is split across ${nameservers.length} redundant nameservers for continuous availability and DDoS resilience.`;
    }
  }

  return narrative;
}
