import dns from 'node:dns/promises';
import net from 'node:net';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';
import type { ScanRequestBudget } from './scanBudget';

export interface DnsOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
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
  dmarc: { present: boolean; policy?: string };
  dnssec: { observed: boolean; note: string };
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

  const [addresses, aaaa, mx, ns, txt, cname, dmarcTxt] = await Promise.allSettled([
    resolvePublicAddresses(domain),
    dns.resolve6(domain).then((values) => values.filter(isPublicAddress)),
    dns.resolveMx(domain),
    dns.resolveNs(domain),
    dns.resolveTxt(domain),
    dns.resolveCname(domain),
    dns.resolveTxt(`_dmarc.${domain}`),
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
      return { present: Boolean(record), policy };
    })(),
    dnssec: { observed: false, note: 'DNSSEC status requires a validating DNS provider and was not inferred from ordinary records.' },
  };
}
