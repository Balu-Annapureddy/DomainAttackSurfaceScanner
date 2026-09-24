import dns from 'node:dns/promises';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';

export async function runDns(domain: string): Promise<{ addresses: string[]; mx: string[]; ns: string[]; txt: string[]; cname: string[]; aaaa: string[]; spf: { present: boolean; policy?: string; }; dmarc: { present: boolean; policy?: string; }; dnssec: { observed: boolean; note: string; }; }> {
  const [addresses, aaaa, mx, ns, txt, cname, dmarcTxt] = await Promise.allSettled([
    resolvePublicAddresses(domain),
    dns.resolve6(domain).then((values) => values.filter(isPublicAddress)),
    dns.resolveMx(domain),
    dns.resolveNs(domain),
    dns.resolveTxt(domain),
    dns.resolveCname(domain),
    dns.resolveTxt(`_dmarc.${domain}`),
  ]);

  return {
    addresses: addresses.status === 'fulfilled' ? addresses.value : [],
    aaaa: aaaa.status === 'fulfilled' ? aaaa.value : [],
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
