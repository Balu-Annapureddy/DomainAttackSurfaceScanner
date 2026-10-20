import dns from 'node:dns/promises';
import net from 'node:net';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';
import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface DnsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export type DnssecStatus = 'signed' | 'unsigned' | 'bogus' | 'inconclusive';

export interface DnssecResult {
  observed: boolean;
  status: DnssecStatus;
  note: string;
  record?: string;
  inconclusive?: boolean;
}

export async function checkDnssec(domain: string, options: DnsOptions = {}): Promise<DnssecResult> {
  const encoded = encodeURIComponent(domain);

  // Helper to query DoH
  const queryDoH = async (baseUrl: string, type: 'DNSKEY' | 'DS', headers?: Record<string, string>, extraQuery = '') => {
    return fetchProviderJson<{
      Status?: number;
      AD?: boolean;
      TC?: boolean;
      Answer?: Array<{ type: number; data?: string }>;
      Authority?: Array<{ type: number; data?: string }>;
      Comment?: string;
    }>(`${baseUrl}?name=${encoded}&type=${type}${extraQuery}`, {
      signal: options.signal,
      timeoutMs: 4000,
      headers,
    });
  };

  const hasDnssecValidationComment = (res?: { Comment?: string }) => {
    const comment = res?.Comment?.toLowerCase() || '';
    return /dnssec|bogus|rrsig|validation failure/i.test(comment);
  };

  const verifyBogusWithCdQuery = async (
    baseUrl: string,
    type: 'DNSKEY' | 'DS',
    headers?: Record<string, string>,
  ): Promise<boolean> => {
    const expectedType = type === 'DNSKEY' ? 48 : 43;
    try {
      const cdRes = await queryDoH(baseUrl, type, headers, '&cd=1');
      if (cdRes?.Status !== 0 || !Array.isArray(cdRes.Answer) || cdRes.Answer.length === 0) {
        return false;
      }
      // Require comparable records matching the requested record type (DNSKEY: 48, DS: 43)
      return cdRes.Answer.some(
        (a) => a.type === expectedType && typeof a.data === 'string' && a.data.trim().length > 0,
      );
    } catch {
      return false;
    }
  };

  // Primary attempt: Google DoH (dns.google)
  try {
    const [gDnskey, gDs] = await Promise.all([
      queryDoH('https://dns.google/resolve', 'DNSKEY'),
      queryDoH('https://dns.google/resolve', 'DS'),
    ]);

    // RCODE 2 (SERVFAIL): require reliable DNSSEC-validation-specific evidence before classifying as bogus
    if (gDnskey?.Status === 2 || gDs?.Status === 2) {
      let isBogus = false;

      if (hasDnssecValidationComment(gDnskey) || hasDnssecValidationComment(gDs)) {
        isBogus = true;
      }

      if (!isBogus && gDnskey?.Status === 2) {
        isBogus = await verifyBogusWithCdQuery('https://dns.google/resolve', 'DNSKEY');
      }

      if (!isBogus && gDs?.Status === 2) {
        isBogus = await verifyBogusWithCdQuery('https://dns.google/resolve', 'DS');
      }

      if (isBogus) {
        return {
          observed: false,
          status: 'bogus',
          inconclusive: false,
          note: 'DNSSEC validation failure observed (resolver rejected records during authenticated lookup but returned valid records with validation disabled).',
        };
      }
      return {
        observed: false,
        status: 'inconclusive',
        inconclusive: true,
        note: 'DNSSEC status check was inconclusive (resolver returned generic SERVFAIL without DNSSEC-validation evidence).',
      };
    }

    const dnskeyRecord = gDnskey?.Answer?.find((a) => a.type === 48);
    const dsRecord = gDs?.Answer?.find((a) => a.type === 43);

    // If either DNSKEY or DS is confirmed present, or AD (Authenticated Data) is set
    if (dnskeyRecord || dsRecord || gDnskey?.AD === true || gDs?.AD === true) {
      return {
        observed: true,
        status: 'signed',
        note: 'DNSSEC records (DNSKEY/DS) observed; domain DNSSEC chain is signed and validated.',
        record: dsRecord?.data || dnskeyRecord?.data,
      };
    }

    // Only conclude unsigned if BOTH queries returned NOERROR (Status 0) with definitive negative answers
    if (gDnskey?.Status === 0 && gDs?.Status === 0) {
      return {
        observed: false,
        status: 'unsigned',
        note: 'No DNSKEY or DS records observed in public authoritative resolvers (confirmed unsigned).',
      };
    }
  } catch {
    // If primary query failed or timed out, attempt secondary fallback (Cloudflare DoH)
  }

  // Fallback attempt: Cloudflare DoH (cloudflare-dns.com)
  try {
    const cfHeaders = { Accept: 'application/dns-json' };
    const [cfDnskey, cfDs] = await Promise.all([
      queryDoH('https://cloudflare-dns.com/dns-query', 'DNSKEY', cfHeaders),
      queryDoH('https://cloudflare-dns.com/dns-query', 'DS', cfHeaders),
    ]);

    if (cfDnskey?.Status === 2 || cfDs?.Status === 2) {
      let isBogus = false;

      if (hasDnssecValidationComment(cfDnskey) || hasDnssecValidationComment(cfDs)) {
        isBogus = true;
      }

      if (!isBogus && cfDnskey?.Status === 2) {
        isBogus = await verifyBogusWithCdQuery('https://cloudflare-dns.com/dns-query', 'DNSKEY', cfHeaders);
      }

      if (!isBogus && cfDs?.Status === 2) {
        isBogus = await verifyBogusWithCdQuery('https://cloudflare-dns.com/dns-query', 'DS', cfHeaders);
      }

      if (isBogus) {
        return {
          observed: false,
          status: 'bogus',
          inconclusive: false,
          note: 'DNSSEC validation failure observed (resolver rejected records during authenticated lookup but returned valid records with validation disabled).',
        };
      }
      return {
        observed: false,
        status: 'inconclusive',
        inconclusive: true,
        note: 'DNSSEC status check was inconclusive (resolver returned generic SERVFAIL without DNSSEC-validation evidence).',
      };
    }

    const dnskeyRecord = cfDnskey?.Answer?.find((a) => a.type === 48);
    const dsRecord = cfDs?.Answer?.find((a) => a.type === 43);

    if (dnskeyRecord || dsRecord || cfDnskey?.AD === true || cfDs?.AD === true) {
      return {
        observed: true,
        status: 'signed',
        note: 'DNSSEC records (DNSKEY/DS) observed; domain DNSSEC chain is signed and validated.',
        record: dsRecord?.data || dnskeyRecord?.data,
      };
    }

    if (cfDnskey?.Status === 0 && cfDs?.Status === 0) {
      return {
        observed: false,
        status: 'unsigned',
        note: 'No DNSKEY or DS records observed in public authoritative resolvers (confirmed unsigned).',
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      observed: false,
      status: 'inconclusive',
      inconclusive: true,
      note: `DNSSEC lookup was inconclusive: ${msg}`,
    };
  }

  return {
    observed: false,
    status: 'inconclusive',
    inconclusive: true,
    note: 'DNSSEC verification was inconclusive (resolvers returned incomplete or ambiguous status).',
  };
}

export async function runDns(
  domain: string,
  options: DnsOptions = {},
): Promise<{
  addresses: string[];
  mx: string[];
  ns: string[];
  txt: string[];
  cname: string[];
  aaaa: string[];
  spf: { present: boolean; policy?: string; record?: string };
  dmarc: { present: boolean; policy?: string; record?: string };
  dnssec: DnssecResult;
}> {
  if (options.signal?.aborted) {
    return {
      addresses: [],
      aaaa: [],
      mx: [],
      ns: [],
      txt: [],
      cname: [],
      spf: { present: false },
      dmarc: { present: false },
      dnssec: { observed: false, status: 'inconclusive', inconclusive: true, note: 'DNS scan aborted' },
    };
  }

  if (options.budget) {
    options.budget.consume(1, `DNS query: ${domain}`);
  }

  const [addresses, aaaa, mx, ns, txt, cname, dmarcTxt, dnssecResult] = await Promise.allSettled([
    resolvePublicAddresses(domain),
    dns.resolve6(domain).then((values) => values.filter(isPublicAddress)),
    dns.resolveMx(domain),
    dns.resolveNs(domain),
    dns.resolveTxt(domain),
    dns.resolveCname(domain),
    dns.resolveTxt(`_dmarc.${domain}`),
    checkDnssec(domain, options),
  ]);

  if (options.signal?.aborted) {
    return {
      addresses: [],
      aaaa: [],
      mx: [],
      ns: [],
      txt: [],
      cname: [],
      spf: { present: false },
      dmarc: { present: false },
      dnssec: { observed: false, status: 'inconclusive', inconclusive: true, note: 'DNS scan aborted' },
    };
  }

  const validAddresses = (addresses.status === 'fulfilled' ? addresses.value : []).filter(
    (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
  );
  const validAaaa = (aaaa.status === 'fulfilled' ? aaaa.value : []).filter(
    (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
  );

  return {
    addresses: validAddresses,
    aaaa: validAaaa,
    mx: mx.status === 'fulfilled' ? mx.value.map((entry) => `${entry.exchange} (${entry.priority})`) : [],
    ns: ns.status === 'fulfilled' ? ns.value : [],
    txt: txt.status === 'fulfilled' ? txt.value.flat() : [],
    cname: cname.status === 'fulfilled' ? cname.value : [],
    spf: (() => {
      const values = txt.status === 'fulfilled' ? txt.value.flat() : [];
      const record = values.find((value) => value.toLowerCase().startsWith('v=spf1'));
      return { present: Boolean(record), policy: record, record };
    })(),
    dmarc: (() => {
      const values = dmarcTxt.status === 'fulfilled' ? dmarcTxt.value.flat() : [];
      const record = values.find((value) => value.toLowerCase().startsWith('v=dmarc1'));
      const policy = record?.match(/(?:^|;)\s*p=([^;]+)/i)?.[1]?.trim();
      return { present: Boolean(record), policy, record };
    })(),
    dnssec: dnssecResult.status === 'fulfilled'
      ? dnssecResult.value
      : { observed: false, status: 'inconclusive', inconclusive: true, note: 'DNSSEC status check was inconclusive' },
  };
}
