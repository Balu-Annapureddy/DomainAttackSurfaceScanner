import net from 'node:net';

export function validateDomain(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('A public domain name is required.');
  }

  const domain = input.trim().toLowerCase().replace(/\.$/, '');

  if (!domain) {
    throw new Error('A public domain name is required.');
  }

  if (domain.length > 253) {
    throw new Error('Domain name is too long.');
  }

  if (domain.includes(' ') || domain.includes('/')) {
    throw new Error('Domain format is invalid.');
  }

  if (net.isIP(domain)) {
    throw new Error('IP addresses are not allowed. Provide a public domain name.');
  }

  if (domain === 'localhost' || domain.endsWith('.localhost')) {
    throw new Error('Internal hostnames are not allowed.');
  }

  if (domain.includes('..') || /^(?:\d+\.)+\d+$/.test(domain)) {
    throw new Error('Malformed domain name.');
  }

  // Reject obviously private or internal names that are common in local-only networks.
  const labels = domain.split('.');
  if (labels.some(label => ['local', 'internal', 'lan', 'corp', 'home', 'private'].includes(label))) {
    throw new Error('Private or internal hostnames are not allowed.');
  }

  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(domain)) {
    throw new Error('Malformed domain name.');
  }

  return domain;
}
