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



