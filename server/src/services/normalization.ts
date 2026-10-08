import { randomUUID } from 'node:crypto';
import net from 'node:net';
import type { Asset, DomainScan, Evidence, Relationship, ShodanHostData } from '../../../shared/types';
import { parseAsn, type IpIntelligence } from './ipIntelligence';
import type { OrgProfile } from './orgProfile';
import type { DisclosedCve } from './cveLookup';
import type { CloudStorageCheckResult } from './cloudStorage';
import type { BreachExposureResult } from './breachExposure';
import type { DocumentMetadataRecord } from './docMetadata';
import { config } from '../config';

export interface Phase3ExtraIntel {
  orgProfile?: OrgProfile | null;
  recentCves?: DisclosedCve[];
  cloudStorageData?: CloudStorageCheckResult[];
  breachData?: BreachExposureResult | null;
  docMetadata?: DocumentMetadataRecord[];
}

function makeEvidence(source: string, description: string, confidence: Evidence['confidence'] = 'high'): Evidence {
  return { source, description, confidence, observedAt: new Date().toISOString() };
}

export function buildNormalizedAssets(
  scan: DomainScan,
  ipIntelligence: IpIntelligence[] = [],
  shodanData: ShodanHostData[] = [],
  phase3Intel?: Phase3ExtraIntel,
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
    let canonicalValue = value;
    if (type === 'ASN') {
      const parsed = parseAsn(value);
      canonicalValue = parsed.asNumber || value;
    }
    const key = `${type}:${canonicalValue}`;
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
      value: canonicalValue,
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

  const subdomains = scan.categories.subdomains.data as {
    subdomains?: string[];
    subdomainSources?: Record<string, string[]>;
    available?: boolean;
  } | undefined;
  for (const subdomain of (subdomains?.subdomains ?? []).slice(0, config.maxSubdomains)) {
    const sources = subdomains?.subdomainSources?.[subdomain] ?? ['Certificate Transparency'];
    const sourceLabel = sources.length > 1 || (sources[0] && sources[0] !== 'Certificate Transparency')
      ? `Certificate Transparency (${sources.join(', ')})`
      : 'Certificate Transparency';
    const asset = add('SUBDOMAIN', subdomain, sourceLabel, 'Observed in a public certificate record', 'high');
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: asset.id,
      type: 'issued_for',
      evidence: makeEvidence(sourceLabel, `Observed ${subdomain} in CT logs (${sources.join(', ')})`),
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

    const rawAsn = info.asNumber || info.asn;
    if (rawAsn) {
      const parsed = parseAsn(rawAsn);
      const canonicalAsn = parsed.asNumber || rawAsn;
      const orgName = info.organization || parsed.organization;
      const asn = add(
        'ASN',
        canonicalAsn,
        'IP intelligence provider',
        'Observed network association; provider data may change',
        'medium',
        {
          asNumber: canonicalAsn,
          organization: orgName ?? null,
        },
      );
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: asn.id,
        type: 'belongs_to_asn',
        evidence: makeEvidence('IP intelligence provider', `Observed ${canonicalAsn}`, 'medium'),
      });
    }

    const effectiveOrg = info.organization || (rawAsn ? parseAsn(rawAsn).organization : undefined);
    if (effectiveOrg) {
      const organization = add('ORGANIZATION', effectiveOrg, 'IP intelligence provider', 'Observed network organization; attribution is not proof of ownership', 'medium');
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: organization.id,
        type: 'operated_by',
        evidence: makeEvidence('IP intelligence provider', `Observed ${effectiveOrg}`, 'medium'),
      });
    }

    if (info.country || info.city) {
      const anycastSuffix = info.anycastLikely ? ' (Anycast / Edge CDN)' : '';
      const locationLabel = `${info.city ?? 'Unknown city'}, ${info.country ?? 'Unknown country'}${anycastSuffix}`;
      const geoAsset = add(
        'GEOLOCATION',
        locationLabel,
        'IP intelligence provider',
        info.anycastLikely
          ? 'Anycast/CDN edge endpoint — traffic is routed to globally distributed datacenters'
          : 'Approximate infrastructure/network location; not a person location',
        'low',
        {
          country: info.country ?? null,
          region: info.region ?? null,
          city: info.city ?? null,
          latitude: info.latitude ?? null,
          longitude: info.longitude ?? null,
          accuracy: 'approximate',
          anycastLikely: Boolean(info.anycastLikely),
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
    } else if (!info.available && info.reason) {
      const locationLabel = `Lookup failed: ${info.reason}`;
      const geoAsset = add(
        'GEOLOCATION',
        locationLabel,
        'IP intelligence provider',
        `Geolocation lookup failed: ${info.reason}`,
        'low',
        {
          error: info.reason,
          accuracy: 'failed',
          source: 'IP intelligence provider',
        },
      );

      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: geoAsset.id,
        type: 'located_approximately_at',
        evidence: makeEvidence(
          'IP intelligence provider',
          `Geolocation lookup failed for IP ${info.ip}: ${info.reason}`,
          'low',
        ),
      });
    }
  }

  // ── Shodan InternetDB open ports and CVEs ──────────────────────────────────
  for (const host of shodanData) {
    if (!host.hasData) continue;
    const ipAsset = assets.find((asset) => asset.type === 'IP' && asset.value === host.ip);
    if (!ipAsset) continue;

    for (const port of host.ports) {
      const portAsset = add(
        'PORT',
        `${host.ip}:${port}`,
        'Shodan InternetDB',
        `Observed open port ${port} on ${host.ip}`,
        'high',
        { ip: host.ip, port, tags: host.tags?.join(', ') || null },
      );
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: portAsset.id,
        type: 'exposes_port',
        evidence: makeEvidence('Shodan InternetDB', `Observed open port ${port} on host ${host.ip}`, 'high'),
      });
    }

    for (const cve of host.vulns) {
      const vulnAsset = add(
        'VULNERABILITY',
        cve,
        'Shodan InternetDB',
        `Observed known vulnerability ${cve} on ${host.ip}`,
        'high',
        { ip: host.ip, cve },
      );
      relationships.push({
        fromAssetId: ipAsset.id,
        toAssetId: vulnAsset.id,
        type: 'vulnerable_to',
        evidence: makeEvidence('Shodan InternetDB', `Observed CVE ${cve} associated with host ${host.ip}`, 'high'),
      });
    }
  }

  // ── DNSSEC signed status ───────────────────────────────────────────────────
  const dnssec = (dns as { dnssec?: { observed?: boolean; note?: string; record?: string } } | undefined)?.dnssec;
  if (dnssec?.observed) {
    const dnssecAsset = add(
      'DNSSEC',
      `${scan.domain} (DNSSEC)`,
      'DNS query',
      dnssec.note || 'DNSSEC cryptographic signing chain observed',
      'high',
      { record: dnssec.record || null },
    );
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: dnssecAsset.id,
      type: 'secured_by',
      evidence: makeEvidence('DNS query', `Observed DNSSEC records validating ${scan.domain}`, 'high'),
    });
  }

  // ── Phase 3: Organization Profile Enrichment ──────────────────────────────
  if (phase3Intel?.orgProfile) {
    const orgProf = phase3Intel.orgProfile;
    const existingOrgAsset = assets.find((a) => a.type === 'ORGANIZATION');
    if (existingOrgAsset) {
      existingOrgAsset.metadata = {
        ...(existingOrgAsset.metadata ?? {}),
        foundingYear: orgProf.foundingYear || null,
        headquarters: orgProf.headquarters || null,
        website: orgProf.website || null,
        logoUrl: orgProf.logoUrl || null,
        wikidataId: orgProf.wikidataId || null,
        description: orgProf.description,
      };
      existingOrgAsset.evidence.push(
        makeEvidence('Wikidata Public Knowledge Base', `Verified public profile for ${orgProf.name}: ${orgProf.description}`, 'high'),
      );
    }
  }

  // ── Phase 3: Cloud Storage Namespace Assets ────────────────────────────────
  if (Array.isArray(phase3Intel?.cloudStorageData)) {
    for (const bucket of phase3Intel.cloudStorageData) {
      const storageAsset = add(
        'CLOUD_STORAGE',
        bucket.bucketName,
        'Cloud Storage Probe',
        `Discovered ${bucket.provider} storage namespace (${bucket.url})`,
        'high',
        {
          provider: bucket.provider,
          url: bucket.url,
          publiclyAccessible: bucket.status === 'publicly_accessible',
          status: bucket.status,
        },
      );
      relationships.push({
        fromAssetId: domain.id,
        toAssetId: storageAsset.id,
        type: 'hosted_on_storage',
        evidence: makeEvidence('Cloud Storage Probe', `Correlated bucket namespace ${bucket.bucketName}`, 'high'),
      });
    }
  }

  // ── Phase 3: Recently Disclosed NVD CVEs ───────────────────────────────────
  if (Array.isArray(phase3Intel?.recentCves)) {
    for (const cve of phase3Intel.recentCves) {
      const vulnAsset = add(
        'VULNERABILITY',
        cve.cveId,
        'NVD API 2.0',
        cve.description,
        'high',
        {
          cpe: cve.cpe,
          publishedDate: cve.publishedDate,
          severity: cve.severity,
          source: 'NVD API 2.0',
        },
      );
      relationships.push({
        fromAssetId: domain.id,
        toAssetId: vulnAsset.id,
        type: 'vulnerable_to',
        evidence: makeEvidence('NVD API 2.0', `Correlated ${cve.cveId} against identified ${cve.cpe}`, 'high'),
      });
    }
  }

  // ── Phase 3: Breach Exposure Presence ──────────────────────────────────────
  if (phase3Intel?.breachData && phase3Intel.breachData.breaches.length > 0) {
    const bData = phase3Intel.breachData;
    const breachAsset = add(
      'BREACH_EXPOSURE',
      `${bData.domain} (${bData.breaches.length} breaches recorded)`,
      'HaveIBeenPwned Directory',
      `${bData.totalPwnCount.toLocaleString()} estimated accounts across ${bData.breaches.length} historical disclosure event(s)`,
      'high',
      {
        breachCount: bData.breaches.length,
        totalPwnCount: bData.totalPwnCount,
      },
    );
    relationships.push({
      fromAssetId: domain.id,
      toAssetId: breachAsset.id,
      type: 'referenced_in_breach',
      evidence: makeEvidence('HaveIBeenPwned Directory', `Observed public incident history for ${bData.domain}`, 'high'),
    });
  }

  // ── Phase 3: Document Metadata Records ─────────────────────────────────────
  if (Array.isArray(phase3Intel?.docMetadata)) {
    for (const doc of phase3Intel.docMetadata) {
      const docAsset = add(
        'DOCUMENT_METADATA',
        doc.url,
        'Public Document Inspection',
        `${doc.fileType} document: ${doc.creationTool || 'Tool unspecified'}`,
        'medium',
        {
          fileType: doc.fileType,
          creationTool: doc.creationTool || null,
          creationDate: doc.creationDate || null,
          hasAuthorField: doc.hasAuthorField,
        },
      );
      relationships.push({
        fromAssetId: domain.id,
        toAssetId: docAsset.id,
        type: 'references_document',
        evidence: makeEvidence('Public Document Inspection', `Extracted document properties from ${doc.url}`, 'medium'),
      });
    }
  }

  // Deduplicate any assets with matching canonical keys and remap relationships
  const deduplicatedAssets: Asset[] = [];
  const seenKeys = new Map<string, Asset>();
  const idRemap = new Map<string, string>();

  for (const asset of assets) {
    let val = asset.value;
    if (asset.type === 'ASN') {
      const parsed = parseAsn(asset.value);
      val = parsed.asNumber || asset.value;
    }
    const key = `${asset.type}:${val}`;
    const existing = seenKeys.get(key);
    if (existing) {
      existing.evidence = [...existing.evidence, ...asset.evidence];
      if (asset.metadata) {
        existing.metadata = { ...(existing.metadata ?? {}), ...asset.metadata };
      }
      idRemap.set(asset.id, existing.id);
    } else {
      const canonicalAsset = { ...asset, value: val };
      seenKeys.set(key, canonicalAsset);
      deduplicatedAssets.push(canonicalAsset);
    }
  }

  const finalAssets = deduplicatedAssets;
  if (finalAssets.length > config.maxAssets) {
    warnings.push(`Asset output was capped at ${config.maxAssets} assets.`);
    finalAssets.length = config.maxAssets;
  }

  const remappedRelationships = relationships.map((rel) => ({
    ...rel,
    fromAssetId: idRemap.get(rel.fromAssetId) ?? rel.fromAssetId,
    toAssetId: idRemap.get(rel.toAssetId) ?? rel.toAssetId,
  }));

  return {
    assets: finalAssets,
    relationships: remappedRelationships.filter(
      (rel) => finalAssets.some((a) => a.id === rel.fromAssetId) && finalAssets.some((a) => a.id === rel.toAssetId),
    ),
    warnings,
  };
}
