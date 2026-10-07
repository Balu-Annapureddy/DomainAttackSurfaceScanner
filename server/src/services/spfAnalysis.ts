/**
 * SPF (Sender Policy Framework) record analyzer.
 * Parses the raw SPF TXT record and classifies its policy strength,
 * DNS lookup count, and common misconfigurations.
 *
 * Implements RFC 7208: https://www.rfc-editor.org/rfc/rfc7208
 */

/** Qualifiers for the 'all' SPF mechanism, which defines the catch-all policy. */
export type SpfAllQualifier =
  | 'hardfail'   // -all: reject messages from unlisted senders
  | 'softfail'   // ~all: accept but mark messages from unlisted senders
  | 'neutral'    // ?all: no policy assertion
  | 'allow_all'  // +all (or bare 'all'): any host is permitted — dangerous
  | 'none'       // no 'all' mechanism present
  | 'unknown';   // record could not be parsed

export interface SpfAnalysis {
  /** True if a v=spf1 record was observed in DNS. */
  present: boolean;
  /** The raw SPF record string, if present. */
  raw?: string;
  /** Classification of the catch-all ('all') policy. */
  allQualifier: SpfAllQualifier;
  /** Number of mechanisms requiring DNS lookups (RFC 7208 limit: 10). */
  dnsLookupCount: number;
  /** All parsed mechanism tokens from the record. */
  mechanisms: string[];
  /** Human-readable warnings about detected misconfigurations. */
  warnings: string[];
}

// Mechanisms that each require at least one DNS lookup (RFC 7208 §4.6.4)
const DNS_LOOKUP_MECHANISMS = new Set([
  'include', 'a', 'mx', 'ptr', 'exists', 'redirect',
]);

/**
 * Analyze an SPF record string.
 * Pass the raw value from the DNS TXT record (e.g. "v=spf1 include:_spf.google.com -all").
 */
export function analyzeSpf(record?: string): SpfAnalysis {
  if (!record || !record.trim().toLowerCase().startsWith('v=spf1')) {
    return {
      present: false,
      allQualifier: 'unknown',
      dnsLookupCount: 0,
      mechanisms: [],
      warnings: [],
    };
  }

  const parts = record.trim().split(/\s+/);
  const mechanisms: string[] = [];
  let allQualifier: SpfAllQualifier = 'none';
  let dnsLookupCount = 0;
  const warnings: string[] = [];

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    mechanisms.push(part);

    // Detect the 'all' catch-all mechanism and its qualifier
    if (lower === 'all' || lower === '+all') {
      allQualifier = 'allow_all';
      warnings.push(
        'SPF uses +all (or bare "all"), which authorises any host on the internet to send email claiming to be from this domain.',
      );
    } else if (lower === '-all') {
      allQualifier = 'hardfail';
    } else if (lower === '~all') {
      allQualifier = 'softfail';
    } else if (lower === '?all') {
      allQualifier = 'neutral';
      warnings.push(
        'SPF uses ?all (neutral), which makes no assertion about unlisted senders. This does not protect against spoofing.',
      );
    } else {
      // Count DNS-lookup mechanisms
      const baseMechanism = lower.replace(/^[+\-~?]/, '');
      const colonPart = baseMechanism.split(':')[0] ?? '';
      const mechanismName = colonPart.split('=')[0] ?? '';
      if (DNS_LOOKUP_MECHANISMS.has(mechanismName)) {
        dnsLookupCount += 1;
      }
    }
  }

  if (dnsLookupCount > 10) {
    warnings.push(
      `SPF record triggers ${dnsLookupCount} DNS lookups, exceeding the RFC 7208 limit of 10. ` +
      'Receivers that enforce the limit will return "permerror" and may reject legitimate mail.',
    );
  }

  return {
    present: true,
    raw: record,
    allQualifier,
    dnsLookupCount,
    mechanisms,
    warnings,
  };
}
