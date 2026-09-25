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

  if ([...domain].some((character) => character.charCodeAt(0) > 127)) {
    try {
      const ascii = new URL(`https://${domain}`).hostname.replace(/\.$/, '');
      if (ascii !== domain) return validateDomain(ascii);
    } catch {
      throw new Error('Domain format is invalid.');
    }
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

  // Reject obviously private or internal names that are common in local-only networks or reserved TLDs.
  const labels = domain.split('.');
  const reservedInternalLabels = new Set([
    'local', 'internal', 'lan', 'corp', 'home', 'private', 'localdomain',
  ]);
  const tld = labels[labels.length - 1];
  const reservedTlds = new Set(['onion', 'invalid', 'test', 'example', 'arpa', 'localhost', 'local']);

  if (labels.some((label) => reservedInternalLabels.has(label)) || (tld && reservedTlds.has(tld))) {
    throw new Error('Private or internal hostnames are not allowed.');
  }

  // Reject all-numeric TLDs (e.g. raw IP fragments or invalid TLDs)
  if (!tld || /^\d+$/.test(tld)) {
    throw new Error('Malformed domain name.');
  }

  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(domain)) {
    throw new Error('Malformed domain name.');
  }

  return domain;
}
