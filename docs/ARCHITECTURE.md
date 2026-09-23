# Architecture

The application is a two-package monorepo with shared TypeScript contracts:

- `client/` contains the responsive React dashboard.
- `server/` exposes the scan API and runs passive data-source services.
- `shared/` contains scan category and response types.

## Scan lifecycle

1. The client submits a domain to `POST /api/scan`.
2. The server validates that it is a public domain name.
3. The server creates an in-memory record and returns a scan ID immediately.
4. Independent service modules collect WHOIS/RDAP, DNS, Certificate Transparency, TLS, HTTP,
   and published-file results.
5. Each category updates its own status and data without invalidating other categories.
6. The scoring service computes the final heuristic after the category jobs finish.
7. The client polls `GET /api/scan/:scanId` and renders each card independently.

Results remain in memory for 24 hours and are intentionally suitable for a single application
instance. A database-backed store can replace `scanStore.ts` later without changing the API.
