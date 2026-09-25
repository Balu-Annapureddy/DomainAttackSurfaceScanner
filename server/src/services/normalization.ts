import { randomUUID } from 'node:crypto';
import net from 'node:net';
import type { Asset, DomainScan, Evidence, Relationship } from '../../../shared/types';
import type { IpIntelligence } from './ipIntelligence';
import { config } from '../config';

function makeEvidence(source: string, description: string, confidence: Evidence['confidence'] = 'high'): Evidence {
  return { source, description, confidence, observedAt: new Date().toISOString() };
}

export function buildNormalizedAssets(
  scan: DomainScan,
  ipIntelligence: IpIntelligence[] = [],
): { assets: Asset[]; relationships: Relationship[]; warnings: string[] } {
  const assets: Asset[] = [];
  const relationships: Relationship[] = [];
  const warnings: string[] = [];
  const ids = new Map<string, string>();

  const add = (
    type: Asset['type'],
    value: string,
    source: string,
    description: string,
    confidence: Evidence['confidence'],
    metadata?: Asset['metadata'],
  ): Asset => {
    const key = `${type}:${value}`;
    const existing = ids.get(key);
    if (existing) {
      const asset = assets.find((entry) => entry.id === existing);
      if (asset) {
        asset.evidence.push(makeEvidence(source, description, confidence));
        if (metadata) {
          asset.metadata = { ...(asset.metadata ?? {}), ...metadata };
        }
      }
      return asset!;
    }
    const asset: Asset = {
      id: randomUUID(),
      type,
      value,
      targetDomain: scan.domain,
      discoveredAt: new Date().toISOString(),
      evidence: [makeEvidence(source, description, confidence)],
      metadata,
    };
    ids.set(key, asset.id);
    assets.push(asset);
    return asset;
  };

  const domain = add('DOMAIN', scan.domain, 'User input', 'Validated public scan target', 'high');
  const dns = scan.categories.dns.data as { addresses?: string[]; aaaa?: string[]; ns?: string[]; mx?: string[] } | undefined;

  const validIps = [...(dns?.addresses ?? []), ...(dns?.aaaa ?? [])].filter(
    (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
  );

  for (const ip of validIps) {
    const ipAsset = add('IP', ip, 'DNS A/AAAA record', `Observed address for ${scan.domain}`, 'high');
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: ipAsset.id,
      type: 'resolves_to',
      evidence: makeEvidence('DNS A/AAAA record', `Observed ${ip} for ${scan.domain}`),
    });
  }

  for (const value of dns?.ns ?? []) {
    const nameserver = add('NAMESERVER', value, 'DNS NS record', `Observed authoritative nameserver for ${scan.domain}`, 'high');
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: nameserver.id,
      type: 'uses_nameserver',
      evidence: makeEvidence('DNS NS record', `Observed ${value}`),
    });
  }

  for (const value of dns?.mx ?? []) {
    const mail = value.split(' (')[0];
    if (!mail) continue;
    const mailAsset = add('MAIL_SERVER', mail, 'DNS MX record', `Observed mail exchanger for ${scan.domain}`, 'high');
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: mailAsset.id,
      type: 'delivers_mail_to',
      evidence: makeEvidence('DNS MX record', `Observed ${value}`),
    });
  }

  const subdomains = scan.categories.subdomains.data as { subdomains?: string[]; available?: boolean } | undefined;
  for (const subdomain of (subdomains?.subdomains ?? []).slice(0, config.maxSubdomains)) {
    const asset = add('SUBDOMAIN', subdomain, 'Certificate Transparency', 'Observed in a public certificate record', 'high');
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: asset.id,
      type: 'issued_for',
      evidence: makeEvidence('Certificate Transparency', `Observed ${subdomain} in CT data`),
    });
  }
  if (subdomains?.available === false) {
    warnings.push('Certificate Transparency data was unavailable.');
  }

  const tls = scan.categories.tls.data as {
    subjectAltNames?: string[];
    issuer?: string;
    fingerprint256?: string;
    serialNumber?: string;
    validFrom?: string;
    validTo?: string;
  } | undefined;

  if (tls?.fingerprint256 || tls?.issuer || tls?.subjectAltNames?.length) {
    const certIdentifier = tls.fingerprint256
      ? `SHA256:${tls.fingerprint256.replace(/:/g, '').toLowerCase()}`
      : (tls.issuer ?? 'live-certificate');

    const certificate = add(
      'CERTIFICATE',
      certIdentifier,
      'TLS handshake',
      'Observed live certificate cryptographic identity and metadata',
      'high',
      {
        fingerprint256: tls.fingerprint256 ?? null,
        serialNumber: tls.serialNumber ?? null,
        issuer: tls.issuer ?? null,
        validFrom: tls.validFrom ?? null,
        validTo: tls.validTo ?? null,
      },
    );

    for (const name of tls.subjectAltNames ?? []) {
      const san = add(name === scan.domain ? 'DOMAIN' : 'SUBDOMAIN', name, 'TLS certificate SAN', 'Observed in live certificate SANs', 'high');
      relationships.push({
        fromAssetId: certificate.id,
        toAssetId: san.id,
        type: 'issued_for',
        evidence: makeEvidence('TLS certificate SAN', `Observed ${name}`),
      });
    }
  }

  for (const info of ipIntelligence) {
    const ipAsset = assets.find((asset) => asset.type === 'IP' && asset.value === info.ip);
    if (!ipAsset) continue;

    if (info.asn) {
      const asn = add('ASN', info.asn, 'IP intelligence provider', 'Observed network association; provider data may change', 'medium');
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: asn.id,
        type: 'belongs_to_asn',
        evidence: makeEvidence('IP intelligence provider', `Observed ${info.asn}`, 'medium'),
      });
    }

    if (info.organization) {
      const organization = add('ORGANIZATION', info.organization, 'IP intelligence provider', 'Observed network organization; attribution is not proof of ownership', 'medium');
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: organization.id,
        type: 'operated_by',
        evidence: makeEvidence('IP intelligence provider', `Observed ${info.organization}`, 'medium'),
      });
    }

    if (info.country || info.city) {
      const locationLabel = `${info.city ?? 'Unknown city'}, ${info.country ?? 'Unknown country'}`;
      const geoAsset = add(
        'GEOLOCATION',
        locationLabel,
        'IP intelligence provider',
        'Approximate infrastructure/network location; not a person location',
        'low',
        {
          country: info.country ?? null,
          region: info.region ?? null,
          city: info.city ?? null,
          latitude: info.latitude ?? null,
          longitude: info.longitude ?? null,
          accuracy: 'approximate',
          source: 'IP intelligence provider',
        },
      );

      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: geoAsset.id,
        type: 'located_approximately_at',
        evidence: makeEvidence(
          'IP intelligence provider',
          `Observed approximate network location ${locationLabel} for IP ${info.ip}`,
          'low',
        ),
      });
    }
  }

  if (assets.length > config.maxAssets) {
    warnings.push(`Asset output was capped at ${config.maxAssets} assets.`);
    assets.length = config.maxAssets;
  }

  return {
    assets,
    relationships: relationships.filter(
      (rel) => assets.some((a) => a.id === rel.fromAssetId) && assets.some((a) => a.id === rel.toAssetId),
    ),
    warnings,
  };
}
