# Development log

## 2026-09-24 — Passive intelligence backend sprint

- Added centralized scanner resource limits and environment-based provider configuration.
- Added public IPv4/IPv6 resolution checks covering private, reserved, loopback, link-local,
  multicast, documentation, and carrier-grade ranges.
- Added DNS-pinned HTTP/TLS requests with bounded redirects and response sizes.
- Added normalized assets, evidence, relationships, warnings, and findings to scan results.
- Added SPF, DMARC, DNS observation, technology evidence, IP intelligence, and approximate
  infrastructure geolocation support.
- Added correlated structured scan/category logs and concurrent scan/cooldown safeguards.
- Preserved the in-memory store while making result data suitable for later persistence.
- Added tests for domain validation and invalid target rejection.

## 2026-09-24 — UI Sprint 1 & Scan Differencing

- Built complete dark-themed Intelligence Dashboard (ScanOverviewCard, ScanProgressStepper,
  AttackSurfaceGraph with radial layout, InfrastructureMap with CartoDB dark tiles,
  FindingsSection, AssetsInventoryTable, CategoryInspectionTabs, AssetDetailModal).
- Implemented deterministic differencing engine (`compareScans`) in `server/src/services/diff.ts`
  and exposed endpoint `GET /api/scan/compare/:baselineId/:targetId`.
- Added client scan comparison page (`/compare/:baseId/:targetId`) showing score delta, asset changes,
  certificate rotations, and DNS drift.
- Added JSON and CSV asset export utilities.
- Added unit tests for scan differencing, bringing automated test suite to 26 passing tests.

## 2026-09-24 — Sprint 3 + Sprint 4 Merged: Review-Ready Intelligence, Reporting & Demo Readiness

- **Executive Intelligence Summary**: Added `ExecutiveSummary.tsx` and `executiveSummary.ts` providing
  high-level perimeter discovery totals, observable transport & perimeter security hygiene,
  and actionable takeaways.
- **Audit-Ready Printable Dossier & PDF Export**: Added `/report/:scanId` with clean printable
  dossier layout, `@media print` styling, and native browser "Print / Save as PDF" integration.
- **Historical Intelligence Timeline**: Added `IntelligenceTimeline.tsx` modal accessible from the History
  page for any domain with multiple scans, visualizing chronological perimeter evolution and drift events.
- **Enhanced History Page**: Added scan status, hygiene score badges, asset and finding counts,
  domain timeline triggers, and quick export actions.
- **Export Hardening**: Added sanitized domain filenames, added `exportFindingsCsv` alongside asset CSV
  and full JSON exports, with direct actions in both dashboard and report views.
- **Security & UX Hardening**: Escaped Leaflet popup HTML to prevent injection; enforced URL protocol
  validation; added empty states for map and graph; synchronized scan metrics to localStorage.
- **Documentation**: Overhauled `README.md` with complete problem statement, architecture diagrams,
  passive scope boundaries, setup instructions, and future roadmap.

Tests & Build:
- Jest server suite: 26/26 tests passing.
- Client production bundle: TypeScript and Vite compiled cleanly with zero errors.

## 2026-09-25 — Final Sprint: Production Readiness, Security Hardening & Release

- **Health & Readiness Endpoints**: Added `GET /api/health` (process uptime, memory, version, status) and `GET /api/health/ready` (active scan capacity, traffic admission check) for container and reverse proxy orchestrators.
- **Scan Lifecycle & Concurrency Hardening**: Encapsulated scan pipeline execution in `try...catch...finally` guards; guaranteed decrement of active scan concurrency counters even on catastrophic unhandled rejection; scan record marked with `status: 'failed'` and diagnostic warnings.
- **Provider Traffic Isolation & Direct Host Allowlist**: Hardened `fetchProviderJson` with strict outbound hostname allowlist enforcement (`ipapi.co`, `ip-api.com`, `ipwhois.app`, `ipinfo.io`) preventing SSRF through malicious redirection or provider manipulation.
- **Environment & Deployment Hardening**: Documented all production configuration variables in `.env.example`; created comprehensive `docs/DEPLOYMENT.md` covering reverse proxy (Nginx) configuration, TLS edge termination, header proxying, timeouts, single-node in-memory scaling constraints, and security checklist.
- **End-to-End Real-Domain Verification**: Implemented automated live integration test suite (`realDomainE2E.test.ts`) validating end-to-end passive scan against `example.com` with budget enforcement, certificate transparency, DNS resolution, and normalized graph generation.
- **Code Quality & Frontend Diagnostics**: Resolved React Hook dependency warnings across `InfrastructureMap` and `IntelligenceTimeline` components using `useMemo`; verified oxlint and eslint clean passes.

Tests & Build Verification:
- Jest test suite: **32/32 tests passing** across 2 suites (`scanner.test.ts` [31 tests] and `realDomainE2E.test.ts` [1 test]).
- Linter: **0 errors, 0 warnings** across client and server.
- Production build: Both TypeScript backend and Vite frontend compile cleanly with zero errors.

## 2026-09-25 — Final Hardened Sprint: Correctness, Epistemology, UX Redesign & Accessibility Layer

- **Scan Correctness & Provider Edge Failure Hardening**:
  - Implemented strict IP validation (`net.isIP(ip) > 0`) across `publicResolution.ts`, `dns.ts`, `ipIntelligence.ts`, and `normalization.ts`, completely eliminating the `Invalid IP address: undefined` bug when scanning domains behind Cloudflare or with empty reverse mappings.
  - Prioritized outbound IPv4 over IPv6 connections in `safeHttp.ts` and `tls.ts` to prevent false probe failures in environments lacking global IPv6 default routes.
  - Standardized outbound client `User-Agent` to a modern browser string, preventing false block responses from Cloudflare and CDN edge rate limiters.
  - Hardened Certificate Transparency abort handling in `subdomains.ts` to gracefully differentiate between external cancellation and upstream `crt.sh` provider timeouts without throwing unhandled promise rejections.

- **Epistemology & Hygiene Scoring Overhaul**:
  - Enforced strict passive OSINT epistemology: *"We did not observe X ≠ X does not exist."*
  - Added `ObservationStatus` (`'observed' | 'not_observed' | 'check_failed' | 'not_applicable'`) and `ScanCompleteness` ratings (`'complete' | 'partial' | 'inconclusive'`) to shared contracts.
  - Probes that encounter network reachability or provider timeouts (e.g. port 80 timeout when HTTPS is fully active, or WHOIS provider rate limits) are categorized as `check_failed` and deduct **0 points** from the security hygiene score.
  - Augmented all findings with structured educational metadata: `whyItMatters`, `investigationSteps`, and exact evidentiary observations.

- **Interactive Asset Routing Chain Visualizer**:
  - Created `AssetChainVisualizer.tsx` displaying complete end-to-end resolution paths from Domain → Subdomain → IP → ASN → Hosting Organization → Approximate Geolocation.
  - Included quick search filtering, unresolved host indicators, and direct asset selection inspection.

- **Beginner Accessibility & Plain-English Glossary**:
  - Created `client/src/lib/glossary.ts` with a comprehensive dictionary of external attack surface terminology (Attack Surface, CT logs, ASN, MX, SPF, DMARC, HSTS, CSP, Geolocation, Passive OSINT).
  - Built `GlossaryModal.tsx` featuring real-time search, category filters, and 4-pillar structured explainers: *What is this?*, *Why it matters*, *What does it mean in practice?*, and *Recommended next steps*.
  - Added inline `TermExplainer` trigger buttons throughout the application (Overview, Findings, Header, Landing page).

- **UX Redesign & Guided vs. Technical Modes**:
  - Added an intuitive toggle switch allowing users to seamlessly transition between **Guided Mode** (plain-English summaries, action cards, context callouts) and **Technical Mode** (raw evidence tables, DNS flags, headers, TLS fingerprints).
  - Added prominent Scan Completeness indicator badges and Edge / Transit infrastructure pills (e.g. Cloudflare, AWS, Google Cloud).
  - Redesigned Findings cards with 4-pillar expandable action panels.

- **Sample / Demo Scan Generator**:
  - Built `server/src/services/sampleScan.ts` generating a verified, realistic perimeter scan (`perimeter-demo.io`) with complete DNS, subdomains, TLS certificates, IP intelligence, and findings.
  - Exposed via `GET /api/scan/sample` and `GET /api/scan/demo` for instantaneous, zero-quota demonstrations and evaluation.
  - Added one-click "Explore Sample Scan" button directly on the Landing Page.

Tests & Build Verification:
- Jest test suite: **34/34 tests passing** across 2 suites (`scanner.test.ts` [33 tests] and `realDomainE2E.test.ts` [1 test]).
- Linter: **0 errors, 0 warnings** across client and server.
- Production build: Both TypeScript backend (`tsc`) and Vite frontend (`tsc -b && vite build`) compile cleanly with zero errors.


---

## Sprint [Final UI Redesign]: Retro-Digital Intelligence Console & UI Hardening

Date: 2026-09-25
Status: COMPLETED

Overview:
Consolidated final UI/UX hardening sprint transforming DomainAttackSurfaceScanner into a distinctive, cohesive, retro-digital cybersecurity terminal / intelligence console. Solved all previous layout, spacing, and hierarchy issues while preserving 100% of underlying backend scanning, evidentiary models, and security logic.

Design System & Visual Language:
- **Palette**: Deep charcoal/near-black foundation (`#0b0e14`, `#111620`, `#161c28`), warm off-white typography (`#e6edf3`), phosphor green (`#3fb950`), amber (`#d29922`), coral/red (`#f85149`), muted console cyan/blue (`#58a6ff`).
- **Typography**: Display headings in retro technical styles, body text in crisp readable sans-serif, and all technical data (IPs, hashes, ports, DNS records) in dedicated monospace typography.
- **CRT / Console Details**: High-density CRT panel headers, subtle grid textures, technical section indicators (`[01] WHOIS`, `SYS // ONLINE`), status tags (`OBSERVED`, `NOT OBSERVED`, `CHECK FAILED`). Completely free of cheap neon glow, generic glassmorphism, or cliché hacker tropes.

Components & Pages Redesigned:
- **Global Application Shell & Navigation**: Persistent console topbar with system telemetry (`SYS // ONLINE`, `PASSIVE RECON`), clean navigation hierarchy, contextual actions, and Knowledge Guide trigger.
- **Landing Page (`/`)**: Compact, editorial-style console layout replacing the giant centered hero. Includes Scan Console, quick sample scan launcher, 3-column "What We Observe" grid, 6-stage "How It Works" pipeline, and Passive Reconnaissance Guarantee callout.
- **Scan Dashboard (`/scan/:id`)**:
  - Horizontal retro system pipeline (`[01] WHOIS ✓` through `[07] HYGIENE ✓`).
  - Executive summary 6-cell metric grid (`ASSETS`, `RELATIONSHIPS`, `OBSERVATIONS`, `FINDINGS`, `COMPLETENESS`, `HYGIENE SCORE`).
  - Security posture score card with explicit epistemological breakdown: *What was observed*, *What was not observed*, *What could not be verified*.
  - Tabbed intelligence views: Topology Graph & Map, Routing Chains, Executive Synthesis, Asset Inventory, Findings, and Raw Telemetry.
- **Findings Dossier**: Each finding formatted as a structured intelligence record with prominent severity badges, status tags, and 4 expandable dossiers (Observed Evidence, Why It Matters, Recommended Action, Backing Probes).
- **Attack Surface Graph**: SVG-based console grid canvas with search, asset-type filters, zoom controls, responsive node coordinates, and intelligence detail panel.
- **Asset Chain Visualizer**: Retro system trace routing chain (`DOMAIN → SUBDOMAIN → IP → ASN → ORGANIZATION → LOCATION`).
- **Infrastructure Map**: Integrated dark-theme CartoDB map with graceful fallback state, location cards, and network/datacenter disclaimer.
- **Report Page (`/report/:id`)**: Fully utilizes desktop width with a 2-column security dossier grid, executive summary, posture score, transport security, findings, and export controls (PDF, JSON, CSV).
- **Knowledge Guide & Mode Switcher**: Comprehensive cybersecurity glossary modal and seamless toggle between Guided Mode (plain English) and Technical Mode (raw evidence).

Quality & Verification:
- Tests: **34/34 passing** across Jest test suites.
- Lint: **0 errors, 0 warnings** across client (oxlint) and server (eslint).
- Build: Backend (`tsc`) and Frontend (`tsc -b && vite build`) compile cleanly.
- Sample Scan: `perimeter-demo.io` verified end-to-end with presentation-ready status.

---

## Sprint [Visual Redesign Correction]: Retro Network Intelligence Workstation

Date: 2026-09-25
Status: COMPLETED

Overview:
Addressed all visual design critique points to transform the application into an authentic Retro Network Intelligence Workstation inspired by Grafana density, React95/retro system panels, and professional security console architecture. Eliminated the "everything is a card" pattern, removed oversized typography, removed excessive cyan glows, resolved map tile key errors, and implemented structured intelligence dossier sections.

Key Changes & Hardening:
- **Design System & Palette**: Near-black charcoal background (`#080b0f`), structured panels (`#10151b`, `#151c23`, `#0c1015`), subtle muted gray/green borders (`#1e2631`), warm off-white primary text (`#e6edf3`), muted gray-green secondary text (`#8b9bb0`), phosphor green (`#3fb950`), amber (`#d29922`), and coral (`#f85149`). Muted cyan is reserved as a functional accent, not a global outline.
- **Removed "Everything is a Card"**: Replaced bubbly cards with structured workstation panels (`border-radius: 2px`), high-density telemetry grids, compact status strips, and numbered dossier headers (`[01] EXECUTIVE SUMMARY`, `[02] SECURITY POSTURE`, `[03] ATTACK SURFACE RELATIONSHIPS`, `[04] ASSET ROUTING CHAINS`, `[05] INFRASTRUCTURE DISTRIBUTION`, `[06] ASSET INVENTORY`, `[07] FINDINGS & ANOMALIES`).
- **Map Tile Resolution & Fallback**: Replaced broken CartoDB tiles with legitimate OpenStreetMap standard tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) using a crisp dark filter and full attribution. Added an environment variable option (`VITE_CARTO_API_KEY`) and a graceful coordinate overlay fallback. Added a structured Target Infrastructure summary dossier below the map.
- **Landing Page Workstation Console**: Replaced marketing hero with compact intelligence console (`DAS // WORKSTATION`), target input bar, 6 system capabilities, 6-stage pipeline (`01 RESOLVE` → `06 REPORT`), and Passive Reconnaissance Guarantee.
- **Scan Dashboard Layout**: 12-column desktop workstation layout with a compact top bar, compact pipeline stepper, 6-cell executive telemetry grid (`ASSETS`, `RELATIONS`, `OBSERVATIONS`, `FINDINGS`, `COMPLETENESS`, `SCORE`), and explicit posture checks (`HTTP`, `TLS`, `SPF`, `DMARC`) alongside the evidentiary breakdown.
- **High-Density Tables**: Assets presented as a monospace technical table with exact columns: `TYPE`, `VALUE`, `STATUS`, `OBSERVED EVIDENCE / SOURCE`, and `ACTION`.
- **Analyst Graph & Asset Chain**: Relationship graph features an embedded asset intelligence inspector panel on node click; asset chain features a numbered trace route console (`01 HOST → 02 IP → 03 ASN → 04 ORG → 05 LOCATION`).
- **Printed Dossier Report**: Replaced narrow layout with a 1200–1400px full desktop width 2-column security dossier with 9 numbered sections.
- **Security Field Manual**: Upgraded Knowledge Guide into a structured cybersecurity field manual with 3 distinct pillars (`WHAT IS THIS?`, `WHY DOES IT MATTER?`, `WHAT DID THIS SCAN OBSERVE?`).

Verification & Quality Gate:
- Automated tests: **34/34 passed** across Jest test suites.
- Lint: **0 errors, 0 warnings** across all 24 client files and all server files.
- Build: Both backend (`tsc`) and frontend (`tsc -b && vite build`) compile with exit code 0.
- Sample & Real scan workflows fully functional.

---

## 2026-09-25 — Sprint: Production Readiness — Legal, Privacy, Consent, Accessibility & Trust Audit

Date: 2026-09-25  
Status: COMPLETED  

Overview:
Hardened the application for production deployment with real, audit-backed legal policies, zero fabricated claims, strict data minimization, privacy disclosures, accessibility compliance (WCAG 2.2), and security reporting mechanisms. Maintained existing workstation UI design intact without out-of-scope visual redesigns.

Key Audits & Implementations:
1. **Full Data-Collection & Tracking Audit**:
   - Zero tracking scripts or analytics SDKs present (no Google Analytics, Meta Pixel, PostHog, Hotjar, Sentry, or Clarity).
   - Zero HTTP cookies set or accepted by backend or frontend.
   - Client storage strictly bounded to 2 `localStorage` keys: `'dass_guided_mode'` (UI preference) and `'domain_scanner_scans'` (client-side scan history cache).
   - Backend persistence strictly bounded to in-memory `Map` with an automatic 24-hour TTL (`TTL_MS = 86,400,000`). No database or permanent disk persistence of target data.
   - No PII, passwords, emails, or personal identifiers collected.
2. **Authorized-Use Warning & Legal Notice**:
   - Added prominent authorization notice above scan console: *"NOTICE: Only scan domains and infrastructure that you own or are explicitly authorized to assess."*
   - Explicitly framed the tool as an informational passive reconnaissance utility; prohibited intrusive probing, credential attacks, exploitation, and DDoS.
3. **Dedicated Legal & Disclosure Pages**:
   - Added `/privacy` (`PrivacyPage.tsx`): Discloses target domain inputs, RAM-only retention, zero cookie policy, third-party resolver flows, and DPDP readiness principles (data minimization, purpose limitation, storage limitation).
   - Added `/terms` (`TermsPage.tsx`): Sets acceptable use, user authorization obligations, OSINT discovery limits, MIT license disclaimers, and free-tier/no-charge clarification.
   - Added `/security` (`SecurityPage.tsx`): Documents responsible vulnerability reporting via GitHub Security Advisories, SSRF protections (RFC 1918 / RFC 4193 / RFC 3927 blocking), rate limiting, and passive boundary guarantees.
4. **Third-Party Resource Inventory**:
   - Verified OpenStreetMap standard tile attribution and dark filter styling.
   - Verified Google Fonts (JetBrains Mono & Inter) public CDN inclusion.
   - Verified backend DNS and OSINT providers (`crt.sh`, `rdap.org`, `ipapi.co`).
5. **Accessibility (WCAG 2.2) Hardening**:
   - Added `<label htmlFor="target-domain-input" className="sr-only">` to search forms.
   - Added `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` to all modals (`GlossaryModal`, `AssetDetailModal`, `IntelligenceTimeline`).
   - Implemented `Escape` key event listeners on all modals to prevent keyboard focus traps.
   - Added descriptive `aria-label` attributes to icon-only controls (zoom, modal close buttons).
6. **Unified Legal Footer Navigation**:
   - Added consistent legal footer links (`Privacy Policy`, `Terms of Use`, `Security & Vulnerability Disclosure`) to `LandingPage`, `ScanPage`, `HistoryPage`, and `ReportPage`.

Quality & Verification:
- Tests: **34/34 passing** across all Jest test suites.
- Lint: **0 errors, 0 warnings** across client (oxlint) and server (eslint).
- Build: Backend (`tsc`) and Frontend (`tsc -b && vite build`) compile with exit code 0.

---

## SPRINT: MASTER PRODUCTION, AUTHENTICATION, DATA, SEO & UI SPRINT
Date: 2026-09-25  
Status: COMPLETED  

Overview:
Consolidated and executed the complete production-readiness architecture for DomainAttackSurfaceScanner: implemented a dual-tier identity model (anonymous vs registered), Scrypt cryptography, session cookies, database persistence (PostgreSQL + zero-dependency in-memory/JSON fallback), tiered sliding-window quotas, strict scan ownership authorization, retro network intelligence workstation dark/light themes, live quota indicators, and full search engine optimization.

Key Implementations & Verifications:
1. **Dual-Tier Identity & Cryptography**:
   - Anonymous users: zero tracking cookies, 5 scans/hour default quota, volatile 24-hr TTL, local browser cache.
   - Registered users: email + Scrypt password hash (`crypto.scrypt` RFC 7914, 16-byte cryptographically secure salt, `crypto.timingSafeEqual` timing-attack defense), 50 scans/hour default quota, cross-device database history, multi-scan comparison.
   - Session management: Cryptographically random 32-byte tokens stored in database `sessions` table and issued via `HttpOnly`, `SameSite=Lax`, `Secure` cookie named `dass_session`.
   - Zero third-party trackers, zero data brokers, zero advertising scripts, no paid tiers or fake refund noise.
2. **Dual-Mode Persistence Layer**:
   - PostgreSQL adapter (`server/src/db/index.ts`) with connection pooling and automated migration using `server/src/db/schema.sql` (`users`, `sessions`, `scans`, `scan_results`, `quotas`).
   - High-performance local in-memory/file-backed JSON store (`.data/dass_db.json`) for zero-setup local development and instant test suite runs.
3. **Quota & Rate Limiting System**:
   - `quotaService.ts` enforcing sliding-window limits for anonymous IPs (`ANONYMOUS_SCAN_LIMIT`, default 5/hr) and authenticated user IDs (`REGISTERED_SCAN_LIMIT`, default 50/hr).
   - Quota endpoints (`GET /api/quota`) and HTTP 429 Too Many Requests responses with `X-RateLimit-*` headers.
4. **Scan Ownership Authorization**:
   - Added `userId` tracking to scans and scan records.
   - Strict ownership guard in `server/src/routes/scan.ts`: Users can only access, compare, or delete their own scans; unauthorized access returns `403 Forbidden`.
   - Anonymous scans remain accessible via scan ID without persistent user binding.
5. **Workstation UI & Dual-Theme System**:
   - Retro Network Intelligence Workstation aesthetic supporting Dark Theme (`#0B0F10`, `#131B1E`, `#1D332E`, `#2EE59D`) and Light Theme (`#F8FAFC`, `#FFFFFF`, `#BAE6FD`, `#0EA5E9`).
   - `ThemeContext.tsx` with `localStorage` persistence and zero-FOUC initialization.
   - Unified `WorkstationNav.tsx` with live quota badge, active user indicator, auth buttons, and theme toggle.
   - Added `/login` (`LoginPage.tsx`) and `/register` (`RegisterPage.tsx`).
   - Enhanced `/history` (`HistoryPage.tsx`) with server-backed persistence, local fallback, and per-scan deletion.
6. **SEO & Search Crawler Architecture**:
   - `client/public/robots.txt` guiding search engines to public pages (`/`, `/security`, `/privacy`, `/terms`, `/login`, `/register`) while disallowing private/dynamic scan paths (`/api/`, `/scan/`, `/report/`, `/history`, `/compare/`).
   - `client/public/sitemap.xml` with canonical URLs, change frequencies, and priorities.
   - Enhanced `client/index.html` with Open Graph, Twitter Cards, canonical links, and theme-color meta tags.
7. **Documentation Suite**:
   - Created `docs/ARCHITECTURE.md` (data model, auth lifecycle, scan pipeline, dual persistence, SSRF boundaries).
   - Created `docs/SEO.md` (Search Console setup, sitemap submission, crawl monitoring, meta tag guide).
   - Created `docs/ENVIRONMENT.md` (complete variable inventory, defaults, security sensitivity).
   - Updated `docs/DEPLOYMENT.md` (Cloudflare Pages + Node/PostgreSQL deployment guide).
   - Updated `README.md` (complete capabilities, setup, architecture).

Verification & Quality Gates:
- Automated Tests: **44/44 passing** across 3 test suites (`scanner.test.ts`, `realDomainE2E.test.ts`, `authAndQuota.test.ts`).
- Server Compilation: `tsc` compiles with 0 errors.
- Client Bundle: Vite production build succeeds with 0 errors.

---

## SPRINT: FINAL PRODUCTION HARDENING + COMPLIANCE AUDIT
Date: 2026-09-25  
Status: COMPLETED  

Overview:
Executed the comprehensive final production hardening, compliance, privacy, accessibility, and operational audit sprint for DomainAttackSurfaceScanner. Closed all remaining operational readiness gaps without altering the established workstation visual design: implemented self-service account deletion with cascading purge, dedicated Cookie Policy (`/cookies`), Billing Policy (`/billing`), enhanced Privacy Policy distinguishing target data from personal data, hardened SSRF guards (reserved TLDs, numeric TLDs, reserved IPv4/IPv6 ranges), startup secret validation, trusted reverse proxy support, operational readiness probes, and complete SEO crawler policies.

Key Implementations & Verifications:
1. **Cookie Policy & Client Storage Transparency (`/cookies`)**:
   - Created `client/src/pages/CookiePage.tsx` explaining the strictly essential `dass_session` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production, ~7 day lifetime).
   - Confirmed zero tracking cookies: no advertising cookies, analytics pixels, or third-party behavioral trackers.
   - Zero cookies issued to anonymous visitors performing public scans.
   - Fully documented browser `localStorage` keys (`dass_theme`, `dass_guided_mode`, `domain_scanner_scans`).
   - Complies with ePrivacy Directive Article 5(3) essential session cookie exemption; no deceptive fake consent banners.
2. **Billing & Zero-Payment Policy (`/billing`)**:
   - Created `client/src/pages/BillingPage.tsx` documenting the $0.00 free-to-use tier, absence of payment processing, and non-applicability of refund requests.
   - Confirmed zero payment gateway dependencies or environment secrets.
3. **Privacy Policy Final Audit (`/privacy`)**:
   - Re-structured `PrivacyPage.tsx` into three distinct data categories: User-Provided Identity Data, Scanner-Generated Target Infrastructure Data, and Technical/Operational Data.
   - Explicitly clarified that target infrastructure IPs and network observations belong to the scanned asset, not the visiting user.
   - Documented exact retention periods: 24-hour volatile memory TTL for anonymous scans vs persistent cross-device history for registered users until explicit deletion.
   - Documented DPDP and global privacy principles (data minimization, storage limitation, purpose specification) with realistic compliance guidance.
4. **Complete Account Deletion & Right to Erasure**:
   - Added `deleteUser(userId)` to `DatabaseAdapter`, `LocalJsonAdapter`, and `PostgresAdapter`.
   - Cascading deletion permanently wipes the user record, active sessions, owned scan records, scan result dossiers, and sliding-window quota counts.
   - Exposed `DELETE /api/auth/me` with `requireAuth` session guard, clearing the session cookie upon completion.
   - Added self-service "Delete Account" button and accessible confirmation modal (`role="dialog"`, `aria-modal="true"`, Escape key dismissal) on `/history`.
5. **Scan Deletion & Ownership Isolation**:
   - Added automated tests verifying that User A cannot delete or inspect User B's scans (`403 Forbidden`).
   - Authenticated users can selectively delete their own saved scans from `/history`.
6. **Password & Session Security Review**:
   - Verified RFC 7914 Scrypt configuration (`N=16384, r=8, p=1, keylen=64`, 16-byte cryptographically secure random salt, `crypto.timingSafeEqual`).
   - Production startup validator (`server/src/config.ts`) enforces `SESSION_SECRET` length >= 32 characters and rejects known development defaults.
   - Enforced zero-leakage logging policy: passwords, tokens, database credentials, and full authorization headers are excluded from logs.
7. **Reverse Proxy & Client IP Model**:
   - Added `TRUST_PROXY` configuration (`app.set('trust proxy', config.trustProxy)`).
   - Documented proxy configuration for Nginx, Caddy, Cloudflare Pages, and AWS ALB to ensure accurate rate-limit binding without allowing client-spoofed `X-Forwarded-For`.
8. **SSRF Final Audit & Target Hardening**:
   - Hardened `domainValidation.ts`: rejects all-numeric TLDs, raw IP addresses, internal unqualified names, and reserved TLDs (`.onion`, `.invalid`, `.test`, `.example`, `.arpa`, `.localhost`, `.local`).
   - Hardened `publicResolution.ts`: added `240.0.0.0/4` reserved block alongside existing loopback, RFC 1918, `169.254.0.0/16` (cloud metadata), carrier-grade NAT, and IPv6 ranges.
   - Added comprehensive Jest test suite (`server/src/__tests__/ssrfSecurity.test.ts`) validating 10 distinct attack cases.
9. **External Provider Resilience**:
   - Configured bounded timeouts, retry caps, and isolated try/catch handlers for `crt.sh`, IP intelligence (`ipapi.co`), and DNS resolvers so third-party outages gracefully degrade without crashing the scan engine.
10. **Database Lifecycle & Health/Readiness Probes**:
    - Retained idempotent schema creation for development; documented safe production migration and backup strategies in `docs/DEPLOYMENT.md`.
    - Added `/api/health/ready` probe testing database connectivity without exposing connection strings or schema internals.
11. **Form Consent & Authorized Use**:
    - Updated scan initiation form on `LandingPage.tsx` with explicit authorization notice ("By initiating a scan, you confirm that you own or are explicitly authorized to assess the target domain").
12. **Accessibility & Content Trust Audit**:
    - Verified all pages have valid form labels, accessible modal dialogs with Escape handling, visible focus states, and semantic headings.
    - Verified zero fake testimonials, fake ratings, fabricated company addresses, or unsupported "100% secure" claims.
13. **SEO & Search Crawler Architecture**:
    - Updated `client/public/robots.txt` disallowing private and user-specific paths (`/login`, `/register`, `/api/`, `/scan/`, `/report/`, `/history/`, `/compare/`) while allowing public canonical pages.
    - Updated `client/public/sitemap.xml` with canonical public URLs.
    - Documented 7-step Google Search Console launch workflow in `docs/SEO.md`.

Verification & Quality Gates:
- Automated Tests: **64/64 passing** across 4 test suites (`scanner.test.ts`, `ssrfSecurity.test.ts`, `authAndQuota.test.ts`, `realDomainE2E.test.ts`).
- Server Compilation: `tsc` compiles with 0 errors.
- Client Bundle: Vite production build succeeds with 0 errors.
- Security Headers: Helmet CSP, Permissions-Policy, HSTS, and nosniff verified.

