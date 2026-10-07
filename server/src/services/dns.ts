import dns from 'node:dns/promises';
import net from 'node:net';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';
import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface DnsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export interface DnssecResult {
  observed: boolean;
  note: string;
  record?: string;
}

async function checkDnssec(domain: string, options: DnsOptions): Promise<DnssecResult> {
  const encoded = encodeURIComponent(domain);
  // Try Google DoH first
  try {
    const gRes = await fetchProviderJson<{
      Status?: number;
      AD?: boolean;
      Answer?: Array<{ type: number; data?: string }>;
    }>(`https://dns.google/resolve?name=${encoded}&type=DNSKEY`, {
      signal: options.signal,
      timeoutMs: 4000,
    });
    const dnskeyRecord = gRes.Answer?.find((a) => a.type === 48);
    if (dnskeyRecord || gRes.AD === true) {
      return {
        observed: true,
        note: 'DNSSEC records (DNSKEY/DS) observed; domain DNSSEC chain is signed.',
        record: dnskeyRecord?.data,
      };
    }
    if (gRes.Status === 0) {
      return { observed: false, note: 'No DNSKEY or DS records observed.' };
    }
  } catch {
    // If Google DoH fails, try Cloudflare DoH fallback
    try {
      const cfRes = await fetchProviderJson<{
        Status?: number;
        AD?: boolean;
        Answer?: Array<{ type: number; data?: string }>;
      }>(`https://cloudflare-dns.com/dns-query?name=${encoded}&type=DNSKEY`, {
        signal: options.signal,
        timeoutMs: 4000,
        headers: { Accept: 'application/dns-json' },
      });
      const dnskeyRecord = cfRes.Answer?.find((a) => a.type === 48);
      if (dnskeyRecord || cfRes.AD === true) {
        return {
          observed: true,
          note: 'DNSSEC records (DNSKEY/DS) observed; domain DNSSEC chain is signed.',
          record: dnskeyRecord?.data,
        };
      }
      if (cfRes.Status === 0) {
        return { observed: false, note: 'No DNSKEY or DS records observed.' };
      }
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return { observed: false, note: `DNSSEC lookup was inconclusive: ${msg}` };
    }
  }
  return { observed: false, note: 'No DNSKEY or DS records observed.' };
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
  spf: { present: boolean; policy?: string };
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
      dnssec: { observed: false, note: 'DNS scan aborted' },
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
      dnssec: { observed: false, note: 'DNS scan aborted' },
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
      return { present: Boolean(record), policy: record };
    })(),
    dmarc: (() => {
      const values = dmarcTxt.status === 'fulfilled' ? dmarcTxt.value.flat() : [];
      const record = values.find((value) => value.toLowerCase().startsWith('v=dmarc1'));
      const policy = record?.match(/(?:^|;)\s*p=([^;]+)/i)?.[1]?.trim();
      return { present: Boolean(record), policy, record };
    })(),
    dnssec: dnssecResult.status === 'fulfilled'
      ? dnssecResult.value
      : { observed: false, note: 'DNSSEC status check was inconclusive' },
  };
}
