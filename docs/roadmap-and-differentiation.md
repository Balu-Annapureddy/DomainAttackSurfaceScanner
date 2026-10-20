# Phase 4 Product Roadmap & Differentiation Strategy — DASS

This document defines the long-term product vision, technical differentiation, prioritized feature roadmap, and sustainability model for **Domain Attack Surface Scanner (DASS)**.

---

## 1. Product Identity and Core Differentiation

Most open-source reconnaissance tools fall into two extremes:
1. **Raw CLI Scanners** (e.g. `nmap`, `sublist3r`, `amass`): Produce unstructured terminal output or massive JSON dumps, requiring high expertise to interpret, without contextual explanations or defensible scoring.
2. **Commercial Attack Surface Management (ASM)** (e.g. Recorded Future, Censys ASM, CyCognito): Enterprise-locked with high subscription minimums, black-box scores, and invasive active probing that risks triggering alert fatigue or legal scrutiny.

### DASS Strategic Position:
> **"Honest, evidence-backed, passive attack-surface reconnaissance and hygiene verification for developers, system administrators, security analysts, and students."**

Key Differentiating Pillars:
1. **Explainable Deterministic Hygiene Scoring**: Rather than arbitrary 0–100 risk numbers, DASS publishes its complete mathematical rubric (12 distinct dimensions, transparent deductions, honest inconclusive states).
2. **First-Class Evidence Provenance**: Every observation identifies what was seen, how it was discovered, when it was seen, and its technical limitations.
3. **SSRF-Hardened Passive Execution**: Respects target boundaries with zero invasive exploit payloads, connection pinning, and strict request budgets.
4. **Actionable Remediation over FUD**: Clear defensive configuration advice (e.g., exact Nginx, Apache, DNS, and TLS directives) rather than sensationalized threat warnings.

---

## 2. Prioritized Feature Roadmap

Each feature is evaluated against:
- **User problem solved**
- **Evidence of user need**
- **Dependencies**
- **Estimated complexity**
- **Operational cost**
- **Security & privacy implications**
- **Success metrics**

---

### Priority 1: Evidence-Backed Graph Asset Relationships (Near-Term)
* **User Problem**: Users see disconnected tables of IP addresses, subdomains, certificates, and DNS records without understanding how they relate to the target domain or each other.
* **Evidence of Need**: Security analysts investigate infrastructure chains (e.g., "Which nameserver delegates this subdomain?" or "Which CDN owns this IP block?").
* **Technical Design**:
  - Enrich `Relationship` entities in `shared/types/index.ts`.
  - Distinguish **Direct Observations** (e.g., DNS `A` record returned `93.184.216.34` for `example.com`) from **Inferred Groupings** (e.g., shared ASN or CDN edge).
  - Explicit warning: *Shared IP or shared hosting does not prove common ownership*.
* **Dependencies**: Existing `buildNormalizedAssets()` in `server/src/services/normalization.ts`.
* **Complexity**: Low to Medium (2–3 engineering days).
* **Operational Cost**: Zero additional external network requests; uses existing scan graph.
* **Security & Privacy**: Zero risk; completely deterministic transformation of public data.
* **Success Metric**: Time-to-insight reduction for users navigating the asset graph.

---

### Priority 2: Historical Change & Infrastructure Drift Detection (Near-Term)
* **User Problem**: Domain configurations change silently over time (e.g., newly created staging subdomains, lapsed DMARC policies, certificate renewals, unexpected DNS delegation changes).
* **Evidence of Need**: Administrators need to know what changed between today's scan and last month's scan.
* **Technical Design**:
  - Build on `server/src/services/diff.ts` and `client/src/pages/ComparisonPage.tsx`.
  - Provide automated drift alerts:
    - New subdomains detected in CT logs or DNS.
    - TLS certificate rotation (issuer change, shortened validity window).
    - SPF/DMARC policy regressions (e.g., `p=reject` downgraded to `p=none`).
    - Nameserver migrations.
  - Distinguish *real infrastructure changes* from *transient provider outages*.
* **Dependencies**: PostgreSQL persistence with historical scan archiving (`scans` table).
* **Complexity**: Medium (3–4 engineering days).
* **Operational Cost**: Low; runs only when a user requests a comparison or schedules a scan.
* **Security & Privacy**: Scans are scoped to user account boundaries; users only compare domains in their own scan history.
* **Success Metric**: Number of recurring user scans per month.

---

### Priority 3: Automated Remediation Script Generation (Mid-Term)
* **User Problem**: System administrators know what is broken (e.g., missing `Strict-Transport-Security`, weak DMARC policy) but have to look up the correct configuration syntax.
* **Evidence of Need**: Users repeatedly copy recommendation text to search for server-specific snippets.
* **Technical Design**:
  - Add "Copy Config Snippet" buttons to findings for popular servers:
    - **Nginx**: `add_header Content-Security-Policy ...;`
    - **Apache**: `Header set X-Content-Type-Options "nosniff"`
    - **Cloudflare Transform Rules**: JSON / HTTP response header rules.
    - **BIND / Route53**: SPF / DMARC TXT record syntax.
* **Dependencies**: Client-side template generator matching `finding.id`.
* **Complexity**: Low (1–2 engineering days).
* **Operational Cost**: Zero (client-side static rendering).
* **Security & Privacy**: Templates must recommend secure defaults without incorporating untrusted user input.
* **Success Metric**: Click rate on remediation snippet copying.

---

### Priority 4: Deterministic Finding Correlation & Root-Cause Clustering (Mid-Term)
* **User Problem**: A single infrastructure misconfiguration (e.g., missing HTTPS redirection on port 80) can generate multiple redundant findings across HTTP, TLS, and Cookie categories.
* **Evidence of Need**: Alert fatigue from seeing 5 separate findings that all stem from the same missing reverse-proxy rule.
* **Technical Design**:
  - Correlation rules that group related observations into a "Root Cause" card:
    - *Origin Server Exposure*: Host header disclosure + Server header disclosure + IP bypass.
    - *Incomplete Transport Security*: Missing HTTPS redirect + Missing HSTS + Cookie missing `Secure` flag.
    - *Email Spoofing Exposure*: Missing SPF + Missing DMARC + Missing MX fallback.
* **Dependencies**: `server/src/services/findings.ts`.
* **Complexity**: Medium (3–5 engineering days).
* **Operational Cost**: Zero additional network traffic.
* **Security & Privacy**: Correlation rules must remain strictly deterministic and evidence-backed (no probabilistic hallucinations).
* **Success Metric**: 40% reduction in perceived finding noise reported in user feedback.

---

### Priority 5: Professional PDF & Executive Report Export (Mid-Term)
* **User Problem**: Security consultants and internal analysts need to deliver scan results to non-technical stakeholders (CTOs, compliance auditors, board members).
* **Evidence of Need**: The web interface is great for interactive exploration, but audit trails require standalone, immutable deliverables.
* **Technical Design**:
  - Clean printable stylesheet (`@media print`) and headless PDF export.
  - Generates:
    - Executive Summary with posture score and key attention items.
    - Detailed finding appendix with RFC references and evidence snippets.
    - Full asset inventory list.
    - Scan methodology and limitation disclaimer.
* **Dependencies**: Existing `ReportPage.tsx` and printable CSS styles.
* **Complexity**: Low to Medium (2 engineering days).
* **Operational Cost**: Zero; generated client-side via browser print API.
* **Security & Privacy**: Explicitly strips user tokens, database IDs, and sensitive session identifiers before rendering.
* **Success Metric**: Report downloads per completed scan.

---

### Priority 6: Optional AI-Assisted Assessment Explanation (Long-Term / Evaluative)
* **User Problem**: Junior security analysts and small business owners may not understand the business risk of an RFC violation (e.g., "Why does DNSSEC matter to an ecommerce store?").
* **Strict Operating Constraints**:
  1. **Strictly Optional**: The entire scanner must function completely without an AI key or external LLM service.
  2. **Findings as Ground Truth**: The AI layer must take deterministic scan findings as input and synthesize plain-language summaries; it must **never** invent findings or alter scores.
  3. **Privacy-Preserving**: No private user emails, tokens, or IP addresses sent to external LLMs; only target domain name and confirmed public findings.
  4. **Cost Transparency**: Must use local models (e.g. Ollama) or cost-effective APIs with bounded token budgets.
* **Dependencies**: Stable Finding schema (Phase 2).
* **Complexity**: High (requires prompt validation, guardrails, and privacy tests).
* **Operational Cost**: Dependent on API tier ($0.001 – $0.005 per summary).
* **Security & Privacy**: Requires strict output filtering to prevent prompt injection from malicious target server headers.
* **Decision**: Defer implementation until user volume justifies the operating cost.

---

## 3. Public Launch and Discovery Strategy

### 3.1 Trust and Compliance Foundation
Before public general availability:
1. **Legal & Policy Pages**:
   - `Terms of Service` (`/terms`): Clear scope defining DASS as a passive public reconnaissance tool for authorized domain owners and security researchers. Prohibits malicious automated scraping or abuse.
   - `Privacy Policy` (`/privacy`): Details minimal data retention (scan records stored for 30 days unless saved by registered user; no tracking cookies; zero sell-through of data).
   - `Responsible Disclosure` (`/security`): Vulnerability disclosure policy providing `security@domainattacksurface.io` and PGP key for reporting defects.
2. **SEO & Discoverability**:
   - High-value landing pages optimized for search queries:
     - *"Free Domain Attack Surface Scanner"*
     - *"Passive External Hygiene Check"*
     - *"Email Security (SPF / DMARC) Posture Review"*
     - *"Subdomain Takeover Risk Assessment"*
   - Pre-rendered meta tags, OpenGraph preview cards, and structured schema (`SoftwareApplication`).

---

## 4. Advertising & Sustainable Monetization Analysis

> **Crucial Guidance**: Advertising or monetization must **never** be implemented prematurely. The tool must first establish credibility, technical reliability, and an active user base.

### 4.1 Evaluation of Monetization Options

| Model | Feasibility | User Trust Impact | Revenue Potential | Recommendation |
|---|---|---|---|---|
| **Google AdSense / Display Ads** | Poor | **Negative**: Ads on cybersecurity tools signal low quality and can trigger adblockers or security browser flags. | Minimal (< $20/mo at early stage) | **NOT RECOMMENDED** for initial launch. Re-evaluate only if traffic exceeds 100k monthly visits. |
| **Freemium Pro Tiers** | High | **Positive**: Standard developer tool model. Free tier: 15 anon / 60 registered scans/hr. Pro tier: scheduled weekly scans, email drift alerts, custom PDF branding. | Sustainable ($10–$29/mo per user) | **RECOMMENDED** as primary long-term model. |
| **Open Source Sponsorship** | High | **Positive**: GitHub Sponsors, Polar.sh, or Open Collective for security research grants. | Community support ($50–$500/mo) | **RECOMMENDED** upon open-source public release. |

### 4.2 Publisher Policy Considerations (If Ads are Ever Evaluated)
If advertising is considered in the future:
1. **AdSense Eligibility**: Requires original, high-value editorial content on pages where ads appear. Scan results pages with dynamic data often trigger "low-value content" flags unless paired with detailed explanatory cybersecurity articles.
2. **Privacy Disclosures**: Requires GDPR/CPRA compliant Consent Management Platforms (CMP) before loading ad tags.
3. **User Experience**: Ad banners must never obscure security findings, score cards, or interactive recon graphs.
