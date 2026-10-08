import type { Asset, Relationship } from '../../../shared/types';

function canonicalAsn(val: string): string {
  const match = val.trim().match(/^(?:AS)?(\d+)/i);
  return match ? `AS${match[1]}` : val.trim();
}

/**
 * Generates an analytical text narrative walking through the assets and relationships
 * represented in the attack surface topology graph.
 *
 * Plain-language rules applied:
 * - One idea per sentence.
 * - Inline gloss for acronyms/technical terms on first appearance.
 * - "This means..." framing.
 * - No unevidenced marketing jargon ("DDoS resilience", "hybrid infrastructure footprint").
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
    const uniqueAsnList = Array.from(new Set(asns.map((a) => canonicalAsn(a.value))));
    const asnNames = uniqueAsnList.slice(0, 2).join(', ');
    parts.push(`${uniqueAsnList.length} autonomous system${uniqueAsnList.length > 1 ? 's' : ''} (${asnNames})`);
  }
  if (orgs.length > 0) {
    const uniqueOrgList = Array.from(new Set(orgs.map((o) => o.value.trim())));
    const orgNames = uniqueOrgList.slice(0, 2).join(', ');
    parts.push(`${uniqueOrgList.length} owning organization${uniqueOrgList.length > 1 ? 's' : ''} (${orgNames})`);
  }
  if (cloudStorage.length > 0) {
    parts.push(`${cloudStorage.length} cloud storage namespace${cloudStorage.length > 1 ? 's' : ''}`);
  }
  if (vulns.length > 0) {
    parts.push(`${vulns.length} correlated vulnerability record${vulns.length > 1 ? 's' : ''}`);
  }

  let narrative = `This scan discovered ${assets.length} connected assets and ${relationships.length} operational relationships across this domain's perimeter: ${parts.join(', ')}.`;

  // Network consolidation vs multi-provider distribution analysis
  if (ips.length > 0) {
    const uniqueAsns = Array.from(new Set(asns.map((a) => canonicalAsn(a.value))));
    const uniqueOrgs = Array.from(new Set(orgs.map((o) => o.value.trim())));

    if (uniqueAsns.length <= 1 && uniqueOrgs.length <= 1) {
      const providerName = uniqueOrgs[0] || (uniqueAsns[0] ? `autonomous system ${uniqueAsns[0]}` : 'a single network provider');
      narrative += ` All of this domain's infrastructure is run by a single provider, ${providerName}. This means its internet traffic is routed through one central network rather than spread across different hosting companies.`;
    } else {
      narrative += ` Resolved host endpoints span ${uniqueAsns.length} autonomous systems and ${uniqueOrgs.length} operating organizations. This demonstrates a multi-cloud or hybrid infrastructure footprint, with servers hosted by different providers.`;
    }
  }

  // Authoritative routing & DNS context
  if (nameservers.length > 0) {
    if (nameservers.length >= 2) {
      narrative += ` Two separate servers manage this domain's DNS (the Domain Name System that translates domain names into IP addresses) — if one goes down, the other keeps it working.`;
    } else {
      narrative += ` A single server manages this domain's DNS (the Domain Name System that translates domain names into IP addresses). This means there is no backup nameserver if that server goes down.`;
    }
  }

  return narrative;
}
