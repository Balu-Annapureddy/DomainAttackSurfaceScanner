# Search Engine Optimization (SEO) & Indexing Guide

This document details the search engine configuration, crawl architecture, canonical pages, and verification workflows for **Domain Attack Surface Scanner**.

---

## 1. Indexing Strategy & URL Architecture

DomainAttackSurfaceScanner provides both public informational pages and dynamic scan intelligence:

| Route | Canonical Target | Indexable? | Crawl Policy | Notes |
|---|---|---|---|---|
| `/` | `https://domainattacksurface.io/` | **Yes** | `Allow: /` | Primary landing page, scanner interface |
| `/security` | `https://domainattacksurface.io/security` | **Yes** | `Allow: /security` | Passive scanning scope, SSRF protections |
| `/privacy` | `https://domainattacksurface.io/privacy` | **Yes** | `Allow: /privacy` | Data minimization, cookie policy, GDPR/CCPA |
| `/terms` | `https://domainattacksurface.io/terms` | **Yes** | `Allow: /terms` | Terms of service, acceptable use policy |
| `/login` | `https://domainattacksurface.io/login` | **Yes** | `Allow: /login` | Registered account sign-in |
| `/register` | `https://domainattacksurface.io/register` | **Yes** | `Allow: /register` | Account registration |
| `/scan/:id` | Dynamic scan | **No** | `Disallow: /scan/` | Ephemeral scan processing |
| `/report/:id` | Dynamic scan result | **No** | `Disallow: /report/` | User scan report (protected, non-indexable) |
| `/history` | User scan history | **No** | `Disallow: /history` | Account scan history |
| `/compare` | Multi-scan diff | **No** | `Disallow: /compare/`| Dynamic comparison interface |
| `/api/*` | API endpoints | **No** | `Disallow: /api/` | Machine interface |

---

## 2. Crawler Configuration (`robots.txt`)

Located at `client/public/robots.txt`:

```txt
User-agent: *
Allow: /
Allow: /privacy
Allow: /terms
Allow: /security
Allow: /login
Allow: /register
Disallow: /api/
Disallow: /scan/
Disallow: /report/
Disallow: /history
Disallow: /compare/

Sitemap: https://domainattacksurface.io/sitemap.xml
```

### Rationale:
- Prevents search spiders from exhausting crawl budget or triggering passive scans via search discovery.
- Protects scan identifiers and individual scan reports from being indexed into public search indices.

---

## 3. Sitemap Structure (`sitemap.xml`)

Located at `client/public/sitemap.xml`:
- Contains canonical URLs with appropriate `<priority>` and `<changefreq>` tags.
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

## 5. Webmaster Tools Submission Checklist

When deploying to your production domain:

1. **Google Search Console**:
   - Add property via DNS TXT record or HTML verification file.
   - Navigate to **Sitemaps** > Enter `sitemap.xml` > Click **Submit**.
   - Inspect URL `https://domainattacksurface.io/` to verify rendering and canonical tag recognition.
2. **Bing Webmaster Tools**:
   - Import directly from Google Search Console or verify via DNS.
   - Submit `https://domainattacksurface.io/sitemap.xml`.
3. **Core Web Vitals Verification**:
   - Run Google Lighthouse audit on production URL.
   - Verify zero layout shift (CLS), first contentful paint (FCP) < 1.0s, and high contrast ratings.
