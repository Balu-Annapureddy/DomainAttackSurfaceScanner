# Testing

DASS uses automated server and client test suites together with build, lint, and manual smoke validation.

## Automated Checks

Run the checks from the repository root:

```bash
npm run build
npm test
npm run lint
```

- **Build:** validates the TypeScript server and client production bundle.
- **Tests:** validates scanner behavior, scoring, SSRF/network boundaries, authentication, authorization, quotas, provider failure handling, DNS/email analysis, scan comparison, API behavior, and important UI states.
- **Lint:** checks the client and server source trees.

The current repository contains **26 test files** with **202 test/it-case declarations** in the source tree. This is a repository snapshot and may change as tests are added or removed.

## Main Automated Test Areas

### Scanner and Intelligence
- Public-domain normalization and validation.
- DNS, DNSSEC, SPF and DMARC analysis.
- Certificate and TLS handling.
- Certificate Transparency/subdomain discovery.
- IP intelligence, ASN and anycast interpretation.
- Shodan InternetDB enrichment and request-budget enforcement.
- CVE enrichment and exposure scoring.
- Cloud-storage and public-document metadata checks.
- Graceful degradation when external providers fail.

### Security Controls
- SSRF protection against loopback, private, link-local, metadata, reserved and IPv4-mapped IPv6 destinations.
- Safe HTTP redirect validation and response-size limits.
- Authentication and password-reset flows.
- Session-cookie security.
- User ownership isolation for private scans.
- Account deletion and cascading data removal.
- Sliding-window quotas and concurrent quota consumption.
- Health and readiness endpoints.

### Findings, Scoring and Comparison
- Evidence-backed finding generation.
- Severity and observation-status handling.
- Transparent score deductions and score breakdowns.
- Scan-to-scan asset and finding comparison.
- Certificate and DNS change detection.
- Avoidance of false deductions for intelligence-only observations such as high subdomain counts or WHOIS privacy.

### Client and API
- Scan/report rendering and guided/raw modes.
- Finding detail analysis sections.
- Authentication and verification UI states.
- Theme persistence.
- API error handling.
- Cloudflare proxy behavior.
- Error boundary and 404 handling.

## End-to-End Validation

The repository includes an end-to-end scan test using `example.com` and a separate set of deterministic scanner tests. Provider-dependent behavior is isolated through controlled responses where appropriate so that most tests do not depend on third-party service availability.

## Manual Smoke Testing

1. Start the development server with `npm run dev`.
2. Open the client and submit a public domain such as `example.com`.
3. Confirm the scan page starts immediately and category cards transition independently.
4. Confirm the executive summary, score breakdown, findings, asset inventory, relationship graph, infrastructure map, and category inspection sections render when corresponding data is available.
5. Confirm an invalid domain, IP address, localhost name, and internal hostname are rejected.
6. Confirm anonymous scan history is maintained locally and does not require an account.
7. If accounts are enabled, verify registration, email verification, login, logout, history, scan ownership, comparison, and account deletion.
8. Confirm `/api/health` and `/api/health/ready` return the expected status.
9. Confirm production deployment uses HTTPS, the configured database, and the required session/proxy settings.

## Security Testing Principle

DASS is intentionally designed around passive external intelligence. Tests should verify that the application does not become an open proxy, private-network scanner, credential tester, or intrusive exploitation framework.