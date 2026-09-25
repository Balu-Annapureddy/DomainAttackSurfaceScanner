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

Known limitations & Roadmap:
- In-memory scan store with 24-hour TTL (suitable for single-node deployment; migration to PostgreSQL/Redis planned for multi-instance clusters).
- Rate limits on third-party passive APIs (CT logs, GeoIP) may necessitate external API keys in high-throughput deployments.
- Scheduled recurring scans and automated drift alert webhooks deferred to post-release roadmap.

