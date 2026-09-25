# Search Engine Optimization (SEO) & Indexing Guide

This document details the search engine configuration, crawl architecture, canonical pages, and verification workflows for **Domain Attack Surface Scanner**.

---

## 1. Indexing Strategy & URL Architecture

DomainAttackSurfaceScanner provides both public informational pages and dynamic scan intelligence:

| Route | Canonical Target | Indexable? | Crawl Policy | Notes |
|---|---|---|---|---|
| `/` | `https://domainattacksurface.io/` | **Yes** | `Allow: /` | Primary landing page, scanner interface |
| `/security` | `https://domainattacksurface.io/security` | **Yes** | `Allow: /security` | Passive scanning scope, SSRF protections |
| `/privacy` | `https://domainattacksurface.io/privacy` | **Yes** | `Allow: /privacy` | Data minimization, privacy rights, DPDP/GDPR |
| `/terms` | `https://domainattacksurface.io/terms` | **Yes** | `Allow: /terms` | Terms of service, acceptable use policy |
| `/cookies` | `https://domainattacksurface.io/cookies` | **Yes** | `Allow: /cookies` | Essential session cookie disclosure |
| `/billing` | `https://domainattacksurface.io/billing` | **Yes** | `Allow: /billing` | Free tier disclosure, no paid transactions |
| `/login` | `https://domainattacksurface.io/login` | **No** | `Disallow: /login` | Registered account sign-in (private) |
| `/register` | `https://domainattacksurface.io/register` | **No** | `Disallow: /register` | Account registration (private) |
| `/scan/:id` | Dynamic scan | **No** | `Disallow: /scan/` | Ephemeral scan processing |
| `/report/:id` | Dynamic scan result | **No** | `Disallow: /report/` | User scan report (protected, non-indexable) |
| `/history` | User scan history | **No** | `Disallow: /history` | Account scan history (private) |
| `/compare` | Multi-scan diff | **No** | `Disallow: /compare/`| Dynamic comparison interface |
| `/api/*` | API endpoints | **No** | `Disallow: /api/` | Machine interface |

---

## 2. Crawler Configuration (`robots.txt`)

Located at `client/public/robots.txt`:

```txt
User-agent: *
Allow: /
Allow: /security
Allow: /privacy
Allow: /terms
Allow: /cookies
Allow: /billing
Disallow: /login
Disallow: /register
Disallow: /api/
Disallow: /scan/
Disallow: /report/
Disallow: /history
Disallow: /compare/

Sitemap: https://domainattacksurface.io/sitemap.xml
```

### Rationale:
- Prevents search spiders from exhausting crawl budget or triggering passive scans via search discovery.
- Protects scan identifiers, private accounts, and individual scan reports from being indexed into public search indices.

---

## 3. Sitemap Structure (`sitemap.xml`)

Located at `client/public/sitemap.xml`:
- Contains canonical public URLs:
  - `/` (Priority 1.0)
  - `/security` (Priority 0.8)
  - `/privacy` (Priority 0.8)
  - `/terms` (Priority 0.8)
  - `/cookies` (Priority 0.7)
  - `/billing` (Priority 0.7)
- `<lastmod>` timestamps reflect current release dates.

---

## 4. Metadata & Structured Sharing

Every public page served via `client/index.html` implements standard metadata:

```html
<!-- Primary Meta Tags -->
<title>Domain Attack Surface Scanner | Attack Surface Intelligence Workstation</title>
<meta name="description" content="Passive public-domain attack surface intelligence workstation. Analyze DNS records, subdomains, SSL/TLS certificates, email authentication (SPF, DKIM, DMARC), and exposure posture." />
<meta name="keywords" content="domain attack surface, osint, attack surface management, dns reconnaissance, subdomain enumeration, certificate transparency, spf dmarc audit" />
<meta name="robots" content="index, follow" />
<meta name="theme-color" content="#0B0F10" />

<!-- Canonical URL -->
<link rel="canonical" href="https://domainattacksurface.io/" />

<!-- Open Graph / Social Media Preview -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://domainattacksurface.io/" />
<meta property="og:title" content="Domain Attack Surface Scanner | Network Intelligence" />
<meta property="og:description" content="Passive public-domain attack surface intelligence workstation. Discover infrastructure, certificates, mail security, and attack surface posture." />
<meta property="og:image" content="/icons.svg" />
```

---

## 5. Search Console Launch Checklist

Follow these exact steps upon production deployment:

1. **Deploy production domain**: Ensure HTTPS is fully provisioned and apex/subdomain redirects are active.
2. **Verify domain ownership in Google Search Console**: Add Domain Property using DNS TXT verification token provided by Google.
3. **Submit sitemap.xml**: In Search Console, navigate to **Sitemaps** > enter `https://domainattacksurface.io/sitemap.xml` > click **Submit**.
4. **Inspect public URLs**: Use the URL Inspection tool on `https://domainattacksurface.io/`, `/security`, `/privacy`, `/terms`, `/cookies`, and `/billing` to verify crawlability and correct canonical tag pickup.
5. **Monitor indexing**: Check the **Pages** indexing report to ensure private routes (`/login`, `/scan/`, etc.) remain unindexed as configured in `robots.txt`.
6. **Monitor search performance**: Track impressions, click-through rates (CTR), and queries.
7. **Monitor crawl errors**: Review the **Coverage / Crawl Stats** report weekly to address 4xx or 5xx server errors immediately.

