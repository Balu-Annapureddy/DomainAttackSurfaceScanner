import dns from 'node:dns/promises';

export async function runDns(domain: string): Promise<{ addresses: string[]; mx: string[]; ns: string[]; txt: string[]; cname: string[]; aaaa: string[]; }> {
  const [a, aaaa, mx, ns, txt, cname] = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain),
    dns.resolveMx(domain),
    dns.resolveNs(domain),
    dns.resolveTxt(domain),
    dns.resolveCname(domain),
  ]);

  return {
    addresses: a.status === 'fulfilled' ? a.value : [],
    aaaa: aaaa.status === 'fulfilled' ? aaaa.value : [],
    mx: mx.status === 'fulfilled' ? mx.value.map((entry) => `${entry.exchange} (${entry.priority})`) : [],
    ns: ns.status === 'fulfilled' ? ns.value : [],
    txt: txt.status === 'fulfilled' ? txt.value.flat() : [],
    cname: cname.status === 'fulfilled' ? cname.value : [],
  };
}
