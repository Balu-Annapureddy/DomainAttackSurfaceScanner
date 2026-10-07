# Changelog

All notable changes to this project are documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`MAJOR.MINOR.PATCH`).

- **PATCH (`v1.0.x`)**: Backward-compatible bug fixes and stability enhancements.
- **MINOR (`v1.x.0`)**: Backward-compatible new features.
- **MAJOR (`v2.0.0`)**: Incompatible API or architectural changes.

---

## [Unreleased] - 2026-10-07

### Documentation & Validation
- Refreshed the README to match the current passive intelligence architecture and repository layout.
- Updated testing documentation to reflect the current automated test tree and coverage areas.
- Updated architecture documentation to include IP/ASN intelligence, Shodan InternetDB, NVD/CVE enrichment, cloud-storage checks, document metadata controls, breach-exposure metadata, normalization, relationship correlation, transparent scoring, and historical comparison.
- Corrected stale test-count documentation in the README.
- Added the scoring documentation to the README documentation index.

### Security & Data-Minimization Clarifications
- Documented that cloud-storage inspection uses safe HEAD checks rather than content retrieval.
- Documented that public breach enrichment does not expose raw credentials, passwords, or hashes.
- Documented privacy boundaries for document metadata and employee-level personal information.
- Clarified that failed or inconclusive provider checks are not automatically treated as security weaknesses.

---

## [1.0.0] - 2026-09-27

### Summary
Domain Attack Surface Scanner (DASS) v1.0.0 is the first stable, production-ready release of the passive public-domain attack surface reconnaissance workstation. Built for security engineers, analysts, and incident responders, the platform executes real-time passive reconnaissance across DNS records, subdomains, WHOIS, SSL/TLS certificates, HTTP security configurations, and cloud provider exposure without generating intrusive active scans. It provides unified asset correlation, visual relationship graphing, security scoring, telemetry diffing across historical scans, sliding-window rate limiting, and an operator console with light/dark glassmorphic themes.

### Key Capabilities & Features

#### 🛡️ Passive Reconnaissance Engine
- **Multi-Vector Scanning**: Concurrently analyzes WHOIS registration metadata, DNS zone records (SPF, DMARC, MX, NS, SOA, TXT, CAA), subdomains (crt.sh Certificate Transparency enumeration), SSL/TLS cipher suites and cert chains, and HTTP header security postures (HSTS, CSP, X-Frame-Options).
- **Outbound Budget & SSRF Protection**: Strictly restricts scans to safe external public hosts via RFC1918 / loopback / link-local / cloud metadata protection. Implements an outbound request budget (max 30 requests) to guarantee defensive, non-intrusive operations.
- **Exposure Scoring & Remediation Engine**: Automatically calculates a domain security posture score (0–100) based on severity-weighted finding vectors with actionable remediation steps and references.

#### 🖥️ Workstation Console & Visualization
- **Cybersecurity Console UI**: Fully responsive terminal/dashboard aesthetic with light and dark mode support, subtle glassmorphism, and live scan telemetry.
- **Asset Graph & Visual Hierarchy**: Maps domain-to-IP, IP-to-ASN, and subdomain-to-certificate relationships with Leaflet geolocation mapping.
- **Recon Comparison (Diff Engine)**: Compares historical scans to detect newly added or removed assets, certificate rotations, DNS drift, and resolved findings over time.
- **Field Manual / Knowledge Base**: Interactive searchable glossary detailing attack surface vectors, asset classifications, and remediation strategies.

#### ⚙️ Security, Quotas & Infrastructure
- **Sliding-Window Quota System**: Rate limits scan execution per IP with hourly quotas and a 60-second domain cooldown protecting upstream services. Cooldown rejections preserve user quota.
- **Dual Persistence Architecture**: Production PostgreSQL schema with migrations alongside an automatic fallback dev-store for zero-dependency local runs.
- **Transactional Auth Architecture (Feature-Flagged)**: Complete Scrypt password hashing, session management, and Resend transactional email verification and password reset workflows, toggleable via `ACCOUNTS_ENABLED`.
- **Health & Readiness Endpoints**: Kubernetes-ready `/api/health` and `/api/health/ready` liveness and database probe endpoints.
