import request from 'supertest';
import { app, server } from '../index';
import { db } from '../db';
import { isPublicAddress } from '../services/publicResolution';
import { validateDomain } from '../services/domainValidation';

describe('SSRF Protection & Target Boundary Hardening', () => {
  afterAll(async () => {
    await db.close();
    if (server) {
      server.close();
    }
  });

  describe('isPublicAddress IP Boundary Checks', () => {
    it('blocks IPv4 loopback addresses (127.0.0.0/8)', () => {
      expect(isPublicAddress('127.0.0.1')).toBe(false);
      expect(isPublicAddress('127.0.0.254')).toBe(false);
      expect(isPublicAddress('127.255.255.255')).toBe(false);
    });

    it('blocks IPv6 loopback (::1) and unspecified (::)', () => {
      expect(isPublicAddress('::1')).toBe(false);
      expect(isPublicAddress('::')).toBe(false);
    });

    it('blocks RFC 1918 private IPv4 intranet ranges', () => {
      expect(isPublicAddress('10.0.0.1')).toBe(false);
      expect(isPublicAddress('10.255.255.254')).toBe(false);
      expect(isPublicAddress('172.16.0.1')).toBe(false);
      expect(isPublicAddress('172.31.255.254')).toBe(false);
      expect(isPublicAddress('192.168.1.1')).toBe(false);
      expect(isPublicAddress('192.168.254.254')).toBe(false);
    });

    it('blocks cloud metadata and link-local addresses (169.254.0.0/16)', () => {
      expect(isPublicAddress('169.254.169.254')).toBe(false); // AWS / GCP metadata
      expect(isPublicAddress('169.254.0.1')).toBe(false);
    });

    it('blocks carrier-grade NAT (100.64.0.0/10)', () => {
      expect(isPublicAddress('100.64.0.1')).toBe(false);
      expect(isPublicAddress('100.127.255.254')).toBe(false);
    });

    it('blocks multicast, broadcast, and reserved networks', () => {
      expect(isPublicAddress('0.0.0.0')).toBe(false);
      expect(isPublicAddress('224.0.0.1')).toBe(false); // Multicast
      expect(isPublicAddress('240.0.0.1')).toBe(false); // Reserved
      expect(isPublicAddress('255.255.255.255')).toBe(false);
    });

    it('blocks IPv6 Unique Local Addresses (fc00::/7) and link-local (fe80::/10)', () => {
      expect(isPublicAddress('fc00::1')).toBe(false);
      expect(isPublicAddress('fd12:3456:789a::1')).toBe(false);
      expect(isPublicAddress('fe80::1')).toBe(false);
    });

    it('blocks IPv4-mapped IPv6 representations of private/metadata IPs', () => {
      expect(isPublicAddress('::ffff:127.0.0.1')).toBe(false);
      expect(isPublicAddress('::ffff:169.254.169.254')).toBe(false);
      expect(isPublicAddress('::ffff:10.0.0.1')).toBe(false);
      expect(isPublicAddress('::ffff:192.168.1.1')).toBe(false);
    });

    it('allows legitimate public internet addresses', () => {
      expect(isPublicAddress('1.1.1.1')).toBe(true);
      expect(isPublicAddress('8.8.8.8')).toBe(true);
      expect(isPublicAddress('93.184.216.34')).toBe(true);
      expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
    });
  });

  describe('validateDomain Target Sanitation', () => {
    it('accepts legitimate public domain names', () => {
      expect(validateDomain('example.com')).toBe('example.com');
      expect(validateDomain('sub.example.co.uk')).toBe('sub.example.co.uk');
      expect(validateDomain('security-audit.io')).toBe('security-audit.io');
    });

    it('rejects raw IP inputs directly', () => {
      expect(() => validateDomain('127.0.0.1')).toThrow('IP addresses are not allowed');
      expect(() => validateDomain('10.0.0.1')).toThrow('IP addresses are not allowed');
      expect(() => validateDomain('169.254.169.254')).toThrow('IP addresses are not allowed');
      expect(() => validateDomain('::1')).toThrow('IP addresses are not allowed');
    });

    it('rejects localhost and localhost subdomains', () => {
      expect(() => validateDomain('localhost')).toThrow('Internal hostnames are not allowed');
      expect(() => validateDomain('probe.localhost')).toThrow('Internal hostnames are not allowed');
    });

    it('rejects reserved, internal, and local-only TLDs', () => {
      expect(() => validateDomain('service.local')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('server.internal')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('device.lan')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('hidden.onion')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('test.invalid')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('app.test')).toThrow('Private or internal hostnames are not allowed');
      expect(() => validateDomain('demo.example')).toThrow('Private or internal hostnames are not allowed');
    });

    it('rejects all-numeric TLDs and malformed names', () => {
      expect(() => validateDomain('target.123')).toThrow('Malformed domain name');
      expect(() => validateDomain('foo..bar.com')).toThrow('Malformed domain name');
      expect(() => validateDomain('bad domain.com')).toThrow('Domain format is invalid');
    });
  });

  describe('API Target Rejection via POST /api/scan', () => {
    it('rejects localhost scan submissions with 400', async () => {
      const res = await request(app)
        .post('/api/scan')
        .send({ domain: 'localhost' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Internal hostnames are not allowed');
    });

    it('rejects raw IP address scan submissions with 400', async () => {
      const res = await request(app)
        .post('/api/scan')
        .send({ domain: '127.0.0.1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('IP addresses are not allowed');
    });

    it('rejects link-local / cloud metadata scan submissions with 400', async () => {
      const res = await request(app)
        .post('/api/scan')
        .send({ domain: '169.254.169.254' });
      expect(res.status).toBe(400);
    });

    it('rejects internal network names with 400', async () => {
      const res = await request(app)
        .post('/api/scan')
        .send({ domain: 'database.internal' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Private or internal hostnames are not allowed');
    });
  });
});
