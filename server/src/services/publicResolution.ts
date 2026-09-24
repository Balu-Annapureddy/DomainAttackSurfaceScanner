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
    ] as const;
    return !blocked.some(([start, prefix]) => inRange(value, start, prefix, 32));
  }

  if (net.isIPv6(normalized)) {
    const value = ipv6ToBigInt(normalized);
    const blocked = [
      [0n, 128], [0n, 8], [ipv6ToBigInt('::ffff:0:0'), 96],
      [ipv6ToBigInt('fc00::'), 7], [ipv6ToBigInt('fe80::'), 10],
      [ipv6ToBigInt('ff00::'), 8], [ipv6ToBigInt('2001:db8::'), 32],
    ] as const;
    return !blocked.some(([start, prefix]) => inRange(value, start, prefix, 128));
  }

  return false;
}

export async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  const addresses = [...new Set(answers.map((answer) => answer.address))];
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
    throw new Error('Target resolves to a private, reserved, or otherwise non-public address');
  }
  return addresses;
}
