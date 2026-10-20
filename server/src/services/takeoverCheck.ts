/**
 * Subdomain Takeover Risk Detection Service
 *
 * References the public `can-i-take-over-xyz` database to identify dangling DNS CNAME
 * pointers to decommissioned third-party cloud services (GitHub Pages, AWS S3, Heroku,
 * Azure, Fastly, Shopify, Zendesk, etc.) where the resource is unclaimed.
 *
 * Epistemic standard:
 * - A subdomain is ONLY flagged as vulnerable if BOTH:
 *   (a) Its DNS CNAME resolves to a known vulnerable service provider endpoint.
 *   (b) A passive HTTP response contains the verified provider "unclaimed resource" fingerprint.
 * - If the service responds normally, the domain is NOT flagged.
 */

import dns from 'node:dns/promises';
import { safeGet } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface TakeoverServiceRule {
  service: string;
  cnamePatterns: RegExp[];
  fingerprints: Array<string | RegExp>;
}

export interface TakeoverMatch {
  subdomain: string;
  cname: string;
  service: string;
  matchedFingerprint: string;
  confirmed: boolean;
}

export interface TakeoverCheckResult {
  checkedCount: number;
  matches: TakeoverMatch[];
}

export interface TakeoverOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
  maxSubdomainsToCheck?: number;
}

/**
 * Curated reference rules from `can-i-take-over-xyz` (https://github.com/EdOverflow/can-i-take-over-xyz)
 */
export const TAKEOVER_RULES: TakeoverServiceRule[] = [
  {
    service: 'GitHub Pages',
    cnamePatterns: [/\.github\.io$/i],
    fingerprints: [
      "There isn't a GitHub Pages site here",
      'For root URLs (like http://example.com/) you must provide an index.html file',
    ],
  },
  {
    service: 'Amazon S3',
    cnamePatterns: [
      /\.s3(?:-[a-z0-9-]+)?\.amazonaws\.com$/i,
      /\.s3-website(?:-[a-z0-9-]+)?\.amazonaws\.com$/i,
    ],
    fingerprints: [
      '<Code>NoSuchBucket</Code>',
      'The specified bucket does not exist',
    ],
  },
  {
    service: 'Heroku',
    cnamePatterns: [
      /\.herokuapp\.com$/i,
      /\.herokussl\.com$/i,
      /\.herokudns\.com$/i,
    ],
    fingerprints: [
      '<title>No such app</title>',
      'herokucdn.com/error-pages/no-such-app.html',
      "There's nothing here, yet.",
    ],
  },
  {
    service: 'Microsoft Azure',
    cnamePatterns: [
      /\.azurewebsites\.net$/i,
      /\.cloudapp\.net$/i,
      /\.azureedge\.net$/i,
      /\.blob\.core\.windows\.net$/i,
    ],
    fingerprints: [
      '404 Web Site not found',
      'The resource you are looking for has been removed, had its name changed, or is temporarily unavailable',
    ],
  },
  {
    service: 'Fastly',
    cnamePatterns: [/\.fastly\.net$/i],
    fingerprints: ['Fastly error: unknown domain'],
  },
  {
    service: 'Shopify',
    cnamePatterns: [/\.myshopify\.com$/i],
    fingerprints: ['Sorry, this shop is currently unavailable'],
  },
  {
    service: 'Zendesk',
    cnamePatterns: [/\.zendesk\.com$/i],
    fingerprints: ['Help Center Closed'],
  },
  {
    service: 'Readme.io',
    cnamePatterns: [/\.readme\.io$/i],
    fingerprints: ['Project doesnt exist... yet!'],
  },
  {
    service: 'Surge.sh',
    cnamePatterns: [/\.surge\.sh$/i],
    fingerprints: ['project not found'],
  },
  {
    service: 'Bitbucket',
    cnamePatterns: [/\.bitbucket\.io$/i],
    fingerprints: ['Repository not found'],
  },
  {
    service: 'Pantheon',
    cnamePatterns: [/\.pantheonsite\.io$/i],
    fingerprints: ['The gods are wise, but do not know of the site which you seek.'],
  },
  {
    service: 'Unbounce',
    cnamePatterns: [/\.unbouncepages\.com$/i],
    fingerprints: ['The requested URL was not found on this server.'],
  },
  {
    service: 'Ghost',
    cnamePatterns: [/\.ghost\.io$/i],
    fingerprints: ['The thing you were looking for is no longer here'],
  },
  {
    service: 'Tumblr',
    cnamePatterns: [/\.domains\.tumblr\.com$/i],
    fingerprints: ["Whatever you were looking for doesn't exist"],
  },
  {
    service: 'WordPress.com',
    cnamePatterns: [/\.wordpress\.com$/i],
    fingerprints: ['Do you want to register'],
  },
  {
    service: 'Help Scout',
    cnamePatterns: [/\.helpscoutdocs\.com$/i],
    fingerprints: ['No settings were found for this company:', 'Page Not Found - Help Scout Docs'],
  },
];

/**
 * Checks a list of subdomains for dangling CNAME records and unclaimed third-party services.
 */
export async function checkSubdomainTakeover(
  subdomains: string[],
  options: TakeoverOptions = {},
): Promise<TakeoverCheckResult> {
  const matches: TakeoverMatch[] = [];
  const limit = Math.min(options.maxSubdomainsToCheck ?? 25, subdomains.length);
  const targets = subdomains.slice(0, limit);

  for (const subdomain of targets) {
    if (options.signal?.aborted) break;
    if (options.budget?.isExhausted()) break;

    try {
      let cnames: string[] = [];
      try {
        if (options.budget) {
          options.budget.consume(1, `Takeover DNS check: ${subdomain}`);
        }
        cnames = await dns.resolveCname(subdomain);
      } catch {
        // Many subdomains will not have CNAME records (they have A/AAAA); skip quietly
        continue;
      }

      for (const cname of cnames) {
        const normCname = cname.toLowerCase().replace(/\.$/, '');

        // Find matching provider rule
        const matchedRule = TAKEOVER_RULES.find((rule) =>
          rule.cnamePatterns.some((pattern) => pattern.test(normCname)),
        );

        if (!matchedRule) continue;

        // Perform passive HTTP check to inspect response body for unclaimed fingerprints
        let responseBody = '';
        try {
          const res = await safeGet(`http://${subdomain}/`, {
            signal: options.signal,
            budget: options.budget,
            timeoutMs: 4000,
          });
          responseBody = res.body || '';
        } catch {
          // If HTTP fails, try HTTPS passively
          try {
            const resHttps = await safeGet(`https://${subdomain}/`, {
              signal: options.signal,
              budget: options.budget,
              timeoutMs: 4000,
            });
            responseBody = resHttps.body || '';
          } catch {
            responseBody = '';
          }
        }

        if (!responseBody) continue;

        // Verify fingerprint match
        for (const fp of matchedRule.fingerprints) {
          const isMatch = typeof fp === 'string'
            ? responseBody.includes(fp)
            : fp.test(responseBody);

          if (isMatch) {
            matches.push({
              subdomain,
              cname: normCname,
              service: matchedRule.service,
              matchedFingerprint: typeof fp === 'string' ? fp : fp.source,
              confirmed: true,
            });
            break;
          }
        }
      }
    } catch {
      // Continue inspecting next subdomain on transient failure
      continue;
    }
  }

  return {
    checkedCount: targets.length,
    matches,
  };
}
