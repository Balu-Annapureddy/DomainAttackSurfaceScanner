# Domain Attack Surface Scanner

Domain Attack Surface Scanner is a passive external attack-surface intelligence platform designed to discover, normalize, map, and assess an organization's publicly exposed internet footprint without sending intrusive traffic, probing private networks, or launching attacks.

---

## 1. The Problem

Modern organizations inadvertently expand their external attack surface through forgotten subdomains, decommissioned services, misconfigured DNS records, missing email security controls, and expiring TLS certificates. Active vulnerability scanning or penetration testing tools can be invasive, disruptive, and require explicit network authorization.

**DomainAttackSurfaceScanner solves this by operating purely passively and evidence-driven:**
It answers the essential perimeter questions:
1. **What exists?** (Domains, subdomains, IPs, mail servers, certificates, nameservers)
2. **How are assets connected?** (Resolutions, authoritative delegations, mail exchangers, ASN operations)
3. **Where is infrastructure approximately located?** (Network points of presence, cloud providers, datacenters)
4. **What defensive posture is observable?** (HTTPS enforcement, modern TLS, security headers, SPF/DMARC)
5. **What changed over time?** (Asset additions/removals, certificate rotations, DNS drift, remediated findings)

---

## 2. Core Capabilities

- **Passive DNS Intelligence**: Enumerates A, AAAA, MX, TXT (SPF & DMARC), NS, and CNAME records with full evidence chains.
- **Certificate Transparency Subdomain Discovery**: Harvests subdomains logged to public CT logs (`crt.sh`) without brute-forcing.
- **IP Intelligence & BGP Mapping**: Identifies autonomous system numbers (ASNs), BGP routing prefixes, and hosting organizations.
- **Approximate Infrastructure Geolocation**: Maps IP endpoints to network datacenters and ISP regions on an interactive Leaflet dark-theme map.
- **TLS & Cryptographic Dossier**: Inspects active certificates, validity horizons, SHA-256 fingerprints, SANs, and protocol versions.
- **HTTP Perimeter & Security Headers**: Analyzes observed redirection, verified HTTP → HTTPS enforcement, and missing defense headers (`Strict-Transport-Security`, `Content-Security-Policy`, etc.).
- **Published Exposure Checks**: Non-intrusively verifies presence of `robots.txt`, `sitemap.xml`, and `/.well-known/security.txt`.
- **Normalized Asset Graph**: Synthesizes all discoveries into strongly typed graph nodes with evidence-backed edges (`resolves_to`, `uses_nameserver`, `delivers_mail_to`, `operated_by`, `belongs_to_asn`, `located_approximately_at`).
- **Interactive SVG Relationship Visualizer**: Pan, zoom, filter by node type, search, and inspect full node metadata.
- **Explainable External Hygiene Scoring**: Heuristic 0–100 posture rating reflecting defensive configurations without penalizing ordinary reconnaissance signals.
- **Deterministic Historical Differencing**: Compares any two scans of the same domain, computing asset additions/removals, score deltas, certificate rotations, DNS policy drift, and resolved vs new findings.
- **Historical Intelligence Timeline**: Chronological visualization tracking perimeter evolution and change events across multiple scans.
- **Executive Intelligence Summary**: Synthesized high-level overview answering what was scanned, discovered, observed, and what requires attention.
- **Audit-Ready Printable Dossier & PDF Export**: Dedicated report view (`/report/:scanId`) formatted with `@media print` stylesheets for one-click browser PDF generation.
- **Data Portability**: Full JSON export and CSV spreadsheet downloads for assets and security findings with safe sanitized filenames.

---

## 3. Architecture & Data Flow

```text
Target Domain
     ↓
Passive Discovery (DNS, WHOIS, crt.sh, TLS handshake, HTTP headers, Well-Known files)
     ↓
Evidence Aggregation (Source, timestamp, description, confidence)
     ↓
Normalization Engine (Deduplicated assets by type:value)
     ↓
Relationship Builder (Evidence-backed graph edges)
     ↓
Findings & Posture Scoring Engine (Heuristic defensive configuration evaluation)
     ↓
Intelligence Dashboard (Graph, Map, Asset Inventory, Stepper, Category Data)
     ↓
Historical Comparison & Timeline (Deterministic diff engine, drift tracking, dossier reporting)
```

---

## 4. Passive Scope & Responsible Use

> **CRITICAL NOTICE:** DomainAttackSurfaceScanner is strictly a passive reconnaissance tool.

- **It does NOT:**
  - Launch brute-force attacks or dictionary directory scans.
  - Probe closed ports or execute intrusive vulnerability exploits.
  - Test credentials, bypass authentication, or fuzz parameters.
  - Interfere with target infrastructure or service availability.
- **Public Domain Validation & SSRF Protection:**
  - The scanner rejects private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), multicast, carrier-grade NAT, and internal hostnames.
  - All outbound connections enforce strict request timeouts, bounded redirect counts, and external request budgets.

---

## 5. Infrastructure Geolocation Disclaimer

Coordinates displayed on the infrastructure map represent **approximate network datacenter or ISP points of presence** derived from public registry records. They **do NOT** indicate physical offices, residences, or individual person locations. Co-located endpoints are visually offset to preserve node distinguishability.

---

## 6. Project Layout

```text
DomainAttackSurfaceScanner/
├── client/                     # React 19, TypeScript, Vite, Tailwind CSS, Leaflet
│   ├── src/
│   │   ├── components/         # Graph, Map, Overview, ExecutiveSummary, Timeline, etc.
│   │   ├── pages/              # LandingPage, ScanPage, HistoryPage, ComparisonPage, ReportPage
│   │   ├── lib/                # API client, export helpers, executive summary calculation
│   │   └── main.tsx            # Client routes (/ , /scan/:id , /report/:id , /history , /compare/...)
├── server/                     # Node.js, Express, TypeScript
│   ├── src/
│   │   ├── routes/             # POST /api/scan, GET /api/scan/:id, GET /api/scan/compare/:base/:target
│   │   ├── services/           # DNS, WHOIS, TLS, CT, HTTP, IP Intel, Normalization, Findings, Diff
│   │   └── __tests__/          # Automated Jest test suite
├── shared/                     # Canonical shared TypeScript models and data contracts
└── docs/                       # Architecture, Security, Scoring, and Development logs
```

---

## 7. Getting Started

### Prerequisites
- Node.js 18.0.0 or newer
- npm 9.0.0 or newer

### Local Setup
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

---

## 8. Validation & Testing

```bash
# Run server test suite (26 unit and integration tests)
npm test

# Run client production build
npm run build --workspace=client

# Run root-level linting
npm run lint
```

---

## 9. Future Roadmap

The following architectural enhancements are planned for post-review phases:
- **Persistent Database Engine**: Migration from the current 24-hour in-memory TTL store to PostgreSQL / SQLite for permanent retention.
- **Scheduled Automated Scans**: Background cron triggers with email / webhook alerting on detected perimeter drift.
- **Additional Intelligence Sources**: Integration with Shodan, Censys, SecurityTrails, or AlienVault OTX APIs via modular provider adapters.
- **Multi-Tenant Team Workspaces**: Role-based access control, domain grouping, and audit logging.
