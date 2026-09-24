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

Known limitations:

- IP intelligence depends on an external provider and remains optional enrichment.
- DNSSEC status is not inferred from ordinary records.
- In-memory scans are single-instance and expire after 24 hours.
- The next major sprint should add a visual asset inventory, map, graph, findings, and timeline.
