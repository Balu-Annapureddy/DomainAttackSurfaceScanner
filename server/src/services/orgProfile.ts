import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface OrgProfile {
  name: string;
  description: string;
  foundingYear?: string;
  headquarters?: string;
  website?: string;
  logoUrl?: string;
  wikidataId?: string;
}

export interface OrgProfileOptions {
  budget?: ScanRequestBudget;
  signal?: AbortSignal;
}

interface WikidataSearchItem {
  id: string;
  label?: string;
  description?: string;
}

interface WikidataSearchResponse {
  search?: WikidataSearchItem[];
}

interface WikidataEntityClaim {
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
}

interface WikidataEntitiesResponse {
  entities?: Record<
    string,
    {
      id: string;
      labels?: { en?: { value: string } };
      descriptions?: { en?: { value: string } };
      claims?: Record<string, WikidataEntityClaim[]>;
    }
  >;
}

// Strip corporate suffixes for clean entity search
function cleanOrgName(rawName: string): string {
  return rawName
    .replace(/,\s*(Inc\.|LLC|Ltd\.|Corp\.|Corporation|GmbH|B\.V\.|Co\.|LP|S\.A\.|PLC)/gi, '')
    .replace(/\s+(Inc\.|LLC|Ltd\.|Corp\.|Corporation|GmbH|B\.V\.|Co\.|LP|S\.A\.|PLC)$/gi, '')
    .trim();
}

/**
 * Looks up corporate profile information via the public Wikidata API.
 * Pulls description, founding date, headquarters, and official website.
 * Rejects non-corporate or ambiguous entries to prevent spurious false matches.
 */
export async function fetchOrgProfile(
  rawOrgName: string,
  options: OrgProfileOptions = {},
): Promise<OrgProfile | null> {
  const orgName = rawOrgName?.trim();
  if (!orgName || orgName.length < 2) return null;

  // Skip generic registration entities (privacy guards, unassigned placeholder text)
  const lower = orgName.toLowerCase();
  if (
    lower.includes('privacy') ||
    lower.includes('redacted') ||
    lower.includes('whoisguard') ||
    lower.includes('domain proxy') ||
    lower.includes('contact privacy') ||
    lower.includes('withheld for privacy')
  ) {
    return null;
  }

  const queryName = cleanOrgName(orgName);
  if (!queryName) return null;

  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(queryName)}&language=en&format=json&type=item&limit=5`;
    const searchData = await fetchProviderJson<WikidataSearchResponse>(searchUrl, {
      budget: options.budget,
      signal: options.signal,
      timeoutMs: 4000,
    });

    const candidates = searchData?.search ?? [];
    if (candidates.length === 0) return null;

    // Filter to confident organizational matches (avoiding persons, places, films, etc.)
    const companyKeywords = [
      'company',
      'corporation',
      'enterprise',
      'provider',
      'firm',
      'conglomerate',
      'business',
      'telecommunications',
      'technology',
      'software',
      'host',
      'registrar',
      'operator',
      'cloud',
      'internet',
    ];

    const match = candidates.find((item) => {
      const desc = (item.description || '').toLowerCase();
      const label = (item.label || '').toLowerCase();
      // Exact label match or description clearly indicating a corporate entity
      const isExactOrClose =
        label === queryName.toLowerCase() ||
        label === orgName.toLowerCase() ||
        label.includes(queryName.toLowerCase());
      const isCorporate = companyKeywords.some((kw) => desc.includes(kw));
      return isExactOrClose && isCorporate;
    });

    if (!match) return null;

    // Query entity claims for detailed properties
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(match.id)}&props=claims|descriptions|labels&languages=en&format=json`;
    const entityData = await fetchProviderJson<WikidataEntitiesResponse>(entityUrl, {
      budget: options.budget,
      signal: options.signal,
      timeoutMs: 4000,
    });

    const entity = entityData?.entities?.[match.id];
    if (!entity) {
      return {
        name: match.label || queryName,
        description: match.description || 'Public organization',
        wikidataId: match.id,
      };
    }

    const claims = entity.claims ?? {};

    // P571 = inception / founding date
    let foundingYear: string | undefined;
    const inceptionClaim = claims.P571?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
    if (inceptionClaim?.time) {
      const matchYear = inceptionClaim.time.match(/([+-]?\d{4})/);
      if (matchYear?.[1]) foundingYear = matchYear[1].replace('+', '');
    }

    // P856 = official website
    let website: string | undefined;
    const websiteClaim = claims.P856?.[0]?.mainsnak?.datavalue?.value;
    if (typeof websiteClaim === 'string') {
      website = websiteClaim;
    }

    // P154 = logo image
    let logoUrl: string | undefined;
    const logoClaim = claims.P154?.[0]?.mainsnak?.datavalue?.value;
    if (typeof logoClaim === 'string') {
      logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logoClaim)}?width=120`;
    }

    return {
      name: entity.labels?.en?.value || match.label || queryName,
      description: entity.descriptions?.en?.value || match.description || 'Public organization',
      foundingYear,
      website,
      logoUrl,
      wikidataId: match.id,
    };
  } catch {
    return null;
  }
}
