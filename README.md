# Domain Attack Surface Scanner

Domain Attack Surface Scanner is a passive external attack-surface intelligence workstation designed to discover, normalize, map, and assess an organization's publicly exposed internet footprint without sending intrusive traffic, probing private networks, or launching attacks.

---

## 1. The Problem

Modern organizations inadvertently expand their external attack surface through forgotten subdomains, decommissioned services, misconfigured DNS records, missing email security controls, and expiring TLS certificates. Active vulnerability scanning or penetration testing tools can be invasive, disruptive, and require explicit network authorization.

**DomainAttackSurfaceScanner operates purely passively and evidence-driven:**
1. **What exists?** (Domains, subdomains, IPs, mail servers, certificates, nameservers)
2. **How are assets connected?** (Resolutions, authoritative delegations, mail exchangers, ASN operations)
3. **Where is infrastructure approximately located?** (Network points of presence, cloud providers, datacenters)
4. **What defensive posture is observable?** (HTTPS enforcement, modern TLS, security headers, SPF/DMARC)
5. **What changed over time?** (Asset additions/removals, certificate rotations, DNS drift, remediated findings)

---

## 2. Core Capabilities & Architecture

- **Passive Intelligence Engines**:
  - Authoritative DNS enumeration (A, AAAA, MX, TXT, NS, CNAME, CAA).
  - Certificate Transparency logging (`crt.sh`) for non-intrusive subdomain discovery.
  - BGP routing prefix and Autonomous System Number (ASN) correlation.
  - TLS handshake cryptography verification (ciphers, expiry, SANs).
  - HTTP perimeter defense header auditing (HSTS, CSP, X-Frame-Options, redirects).
  - Email posture verification (SPF syntax, DKIM selectors, DMARC policy enforcement).
  - Approximate infrastructure geolocation rendered on an interactive Leaflet map.
- **Privacy-First Dual Identity Model**:
  - **Anonymous Mode**: Perform scans without an account; 0 tracking cookies; volatile 24-hr retention; local browser history cache; 5 scans/hour default quota.
  - **Registered Account Mode**: Minimal first-party signup (email + Scrypt password hash); persistent cross-device history; multi-scan comparison; 50 scans/hour default quota; essential `HttpOnly`, `SameSite=Lax`, `Secure` session cookie (`dass_session`).
  - **NO payments, NO subscriptions, NO external trackers, NO third-party data brokers**.
- **Retro Network Intelligence Workstation UI**:
  - First-class Dark Theme (`#0B0F10`, `#131B1E`, `#1D332E`, `#2EE59D`) and Light Theme (`#F8FAFC`, `#FFFFFF`, `#BAE6FD`, `#0EA5E9`).
  - High-density telemetry, interactive SVG relationship graphs, routing chain visualizers, and audit-ready printable dossiers (`/report/:id`).
  - Live quota meter in the navigation bar showing remaining scans and reset time.
- **Dual-Mode Persistence Layer**:
  - Production: PostgreSQL with connection pooling and automated DDL migration (`server/src/db/schema.sql`).
  - Development & CI: High-performance atomic in-memory/file-backed JSON store (`.data/dass_db.json`) allowing zero-dependency local runs and instant test execution.
- **Strict SSRF & Request Boundaries**:
  - Hardened loopback, private intranet, link-local, carrier-grade NAT, and cloud metadata (`169.254.169.254`) blocking via `publicResolution.ts`.
  - Request timeouts, bounded redirect hops, and strict request budgets.
- **SEO & Web Standards**:
  - Canonical public pages (`/`, `/security`, `/privacy`, `/terms`, `/login`, `/register`).
  - Crawler protection via `client/public/robots.txt` and `client/public/sitemap.xml`.
  - Rich Open Graph, Twitter Cards, and semantic HTML5 hierarchy.

---

## 3. Project Structure

```text
DomainAttackSurfaceScanner/
├── client/                     # React 18, TypeScript, Vite, Vanilla CSS Design System, Leaflet
│   ├── public/                 # robots.txt, sitemap.xml, favicon.svg, icons.svg
│   └── src/
│       ├── components/         # WorkstationNav, Graph, Map, Overview, Timeline, etc.
│       ├── context/            # AuthContext, ThemeContext
│       ├── pages/              # Landing, Scan, Report, History, Compare, Privacy, Terms, Auth
│       ├── lib/                # API client, History manager, export utilities
│       └── index.css           # Pure CSS custom properties for Dark/Light workstation themes
├── server/                     # Node.js, Express, TypeScript
│   ├── src/
│   │   ├── db/                 # PostgreSQL adapter + JSON dev fallback, schema.sql
│   │   ├── middleware/         # Auth session guard, error handlers, rate limiters
│   │   ├── routes/             # /api/scan, /api/auth, /api/quota
│   │   ├── services/           # DNS, WHOIS, TLS, CT, HTTP, Quota, Scoring, Diff
│   │   ├── utils/              # Scrypt crypto, SSRF validator (publicResolution.ts), safeHttp
│   │   └── __tests__/          # Automated Jest test suites (44 tests)
├── shared/                     # Canonical TypeScript interfaces and contracts
└── docs/                       # Architecture, Security, SEO, Environment, and Deployment specs
```

---

## 4. Getting Started

### Prerequisites
- Node.js 18.0.0 or newer
- npm 9.0.0 or newer

### Local Setup (Zero External Dependencies)
```bash
# Clone the repository
git clone https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner.git
cd DomainAttackSurfaceScanner

# Install dependencies for all workspaces
npm install

# Start both backend server (port 3001) and frontend client (port 5173) in development
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build & Running
```bash
# Build production bundles for server and client
npm run build

# Start the compiled production backend server
npm start
```

For cloud hosting with PostgreSQL, Cloudflare Pages, Nginx reverse proxy, and environment configuration, refer to the [Deployment Guide](docs/DEPLOYMENT.md) and [Environment Guide](docs/ENVIRONMENT.md).

---

## 5. Automated Testing & Validation

```bash
# Run complete automated test suite (44 tests across 3 suites)
npm test

# Run build verification (Server TypeScript compiler + Client Vite production bundle)
npm run build

# Verify health probes
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/ready
```

---

## 6. Responsible Use & Passive Scope

> **NOTICE:** DomainAttackSurfaceScanner is exclusively a passive reconnaissance platform.

- **It does NOT:**
  - Launch brute-force attacks, directory fuzzing, or port scans.
  - Probe closed ports or execute intrusive vulnerability exploits.
  - Test credentials, bypass authentication, or interfere with target services.
- **SSRF Hardening:**
  - Rejects loopbacks, RFC 1918 private ranges, AWS/GCP cloud metadata IP `169.254.169.254`, and carrier-grade NAT.
  - Validates all resolved addresses against strict public IP boundaries before issuing any outbound network probes.

---

## 7. Documentation Index

- [Architecture & Data Pipeline](docs/ARCHITECTURE.md)
- [Environment Configuration & Variables](docs/ENVIRONMENT.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
- [SEO & Webmaster Guide](docs/SEO.md)
- [Passive Security Disclosure](docs/SECURITY.md)
- [Development Log](docs/DEVELOPMENT_LOG.md)
