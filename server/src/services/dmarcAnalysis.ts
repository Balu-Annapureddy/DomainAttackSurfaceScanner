/**
 * DMARC (Domain-based Message Authentication, Reporting & Conformance) record analyzer.
 * Parses the raw DMARC TXT record from _dmarc.<domain> and classifies its
 * policy strength, enforcement level, and reporting configuration.
 *
 * Implements RFC 7489: https://www.rfc-editor.org/rfc/rfc7489
 */

export type DmarcPolicyStrength =
  | 'reject'      // p=reject: strongest — unlisted messages are rejected outright
  | 'quarantine'  // p=quarantine: messages go to spam/junk
  | 'none'        // p=none: monitoring mode only — no enforcement action
  | 'missing';    // no DMARC record found at all

export interface DmarcAnalysis {
  /** True if a v=DMARC1 record was observed in DNS. */
  present: boolean;
  /** The raw DMARC record string, if present. */
  raw?: string;
  /** Effective policy classification. */
  policyStrength: DmarcPolicyStrength;
  /** Value of the p= tag (e.g. "none", "quarantine", "reject"). */
  policy?: string;
  /** Value of the sp= tag (subdomain policy), if present. */
  subdomainPolicy?: string;
  /** Percentage of messages subject to filtering (pct= tag, default 100). */
  percentage: number;
  /** Aggregate report recipients from rua= tag. */
  ruaAddresses: string[];
  /** Forensic report recipients from ruf= tag. */
  rufAddresses: string[];
  /** DKIM alignment mode: 'r' (relaxed, default) or 's' (strict). */
  alignmentDkim: 'r' | 's';
  /** SPF alignment mode: 'r' (relaxed, default) or 's' (strict). */
  alignmentSpf: 'r' | 's';
  /** Human-readable warnings about detected misconfigurations. */
  warnings: string[];
}

function parseAddressList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^mailto:/i, ''))
    .filter(Boolean);
}

/**
 * Analyze a DMARC record string.
 * Pass the raw value from the _dmarc.<domain> TXT lookup
 * (e.g. "v=DMARC1; p=quarantine; rua=mailto:reports@example.com; pct=100").
 */
export function analyzeDmarc(record?: string): DmarcAnalysis {
  const base: DmarcAnalysis = {
    present: false,
    policyStrength: 'missing',
    percentage: 100,
    ruaAddresses: [],
    rufAddresses: [],
    alignmentDkim: 'r',
    alignmentSpf: 'r',
    warnings: [],
  };

  if (!record || !record.trim().toLowerCase().startsWith('v=dmarc1')) {
    return base;
  }

  base.present = true;
  base.raw = record;

  const tags = record.split(';').map((t) => t.trim()).filter(Boolean);
  for (const tag of tags) {
    const eqIdx = tag.indexOf('=');
    if (eqIdx < 0) continue;
    const k = tag.slice(0, eqIdx).trim().toLowerCase();
    const v = tag.slice(eqIdx + 1).trim();

    switch (k) {
      case 'p':
        base.policy = v.toLowerCase();
        if (base.policy === 'reject') base.policyStrength = 'reject';
        else if (base.policy === 'quarantine') base.policyStrength = 'quarantine';
        else base.policyStrength = 'none';
        break;
      case 'sp':
        base.subdomainPolicy = v.toLowerCase();
        break;
      case 'pct': {
        const pct = parseInt(v, 10);
        if (!isNaN(pct) && pct >= 0 && pct <= 100) base.percentage = pct;
        break;
      }
      case 'rua':
        base.ruaAddresses = parseAddressList(v);
        break;
      case 'ruf':
        base.rufAddresses = parseAddressList(v);
        break;
      case 'adkim':
        base.alignmentDkim = v.toLowerCase() === 's' ? 's' : 'r';
        break;
      case 'aspf':
        base.alignmentSpf = v.toLowerCase() === 's' ? 's' : 'r';
        break;
      default:
        break;
    }
  }

  // Generate warnings based on the parsed configuration
  if (base.policyStrength === 'none') {
    if (base.ruaAddresses.length === 0) {
      base.warnings.push(
        'DMARC policy is p=none with no rua= reporting address. ' +
        'Unauthenticated emails are neither blocked nor monitored — this record provides no protection.',
      );
    } else {
      base.warnings.push(
        'DMARC policy is p=none (monitoring mode). ' +
        'Unauthenticated emails are delivered normally. Only aggregate reports are collected.',
      );
    }
  }

  if (base.percentage < 100 && base.policyStrength !== 'none') {
    base.warnings.push(
      `DMARC pct=${base.percentage} means the policy only applies to ${base.percentage}% of failing messages. ` +
      'Raise pct to 100 for full enforcement.',
    );
  }

  return base;
}
