import dns from 'node:dns/promises';
import net from 'node:net';

export function ipv4ToBigInt(address: string): bigint {
  return address.split('.').reduce((value, octet) => (value << 8n) + BigInt(Number(octet)), 0n);
}

export function ipv6ToBigInt(address: string): bigint {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  const parts = normalized.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  return groups.reduce((value, group) => (value << 16n) + BigInt(parseInt(group || '0', 16)), 0n);
}

function inRange(value: bigint, start: bigint, prefixLength: number, bits: number): boolean {
  const mask = ((1n << BigInt(prefixLength)) - 1n) << BigInt(bits - prefixLength);
  return (value & mask) === (start & mask);
}

export function isPublicAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (net.isIPv4(normalized)) {
    const value = ipv4ToBigInt(normalized);
    const blocked = [
      [0n, 8], [ipv4ToBigInt('10.0.0.0'), 8], [ipv4ToBigInt('100.64.0.0'), 10],
      [ipv4ToBigInt('127.0.0.0'), 8], [ipv4ToBigInt('169.254.0.0'), 16],
      [ipv4ToBigInt('172.16.0.0'), 12], [ipv4ToBigInt('192.0.0.0'), 24],
      [ipv4ToBigInt('192.0.2.0'), 24], [ipv4ToBigInt('192.168.0.0'), 16],
      [ipv4ToBigInt('198.18.0.0'), 15], [ipv4ToBigInt('198.51.100.0'), 24],
      [ipv4ToBigInt('203.0.113.0'), 24], [ipv4ToBigInt('224.0.0.0'), 4],
      [ipv4ToBigInt('240.0.0.0'), 4],
    ] as const;
    return !blocked.some(([start, prefix]) => inRange(value, start, prefix, 32));
  }

  if (net.isIPv6(normalized)) {
    const value = ipv6ToBigInt(normalized);
    const blocked = [
      // Unspecified & loopback
      [0n, 128], [0n, 8],
      // IPv4-mapped IPv6 (::ffff:0:0/96)
      [ipv6ToBigInt('::ffff:0:0'), 96],
      // NAT64 well-known prefix (64:ff9b::/96) — embeds IPv4 in low 32 bits
      [ipv6ToBigInt('64:ff9b::'), 96],
      // NAT64 local-use prefix (64:ff9b:1::/48)
      [ipv6ToBigInt('64:ff9b:1::'), 48],
      // IPv4/IPv6 translation (::ffff:0:0:0/96)
      [ipv6ToBigInt('::ffff:0:0:0'), 96],
      // Discard prefix (100::/64)
      [ipv6ToBigInt('100::'), 64],
      // Teredo (2001::/32) — tunnels IPv4 inside IPv6; can map private IPv4 space
      [ipv6ToBigInt('2001::'), 32],
      // 6to4 (2002::/16) — encodes IPv4 in bits 17-48; 2002:7f00::/24 maps to 127.x.x.x
      [ipv6ToBigInt('2002::'), 16],
      // Unique local (fc00::/7)
      [ipv6ToBigInt('fc00::'), 7],
      // Link-local (fe80::/10)
      [ipv6ToBigInt('fe80::'), 10],
      // Multicast (ff00::/8)
      [ipv6ToBigInt('ff00::'), 8],
      // Documentation (2001:db8::/32)
      [ipv6ToBigInt('2001:db8::'), 32],
    ] as const;
    return !blocked.some(([start, prefix]) => inRange(value, start, prefix, 128));
  }

  return false;
}

export async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  const addresses = [
    ...new Set(
      answers
        .map((answer) => answer.address)
        .filter((addr): addr is string => typeof addr === 'string' && addr.trim().length > 0 && net.isIP(addr.trim()) > 0),
    ),
  ];
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
    throw new Error('Target resolves to a private, reserved, or otherwise non-public address');
  }
  return addresses;
}
