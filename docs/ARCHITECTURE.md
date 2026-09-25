# Domain Attack Surface Scanner — System Architecture

DomainAttackSurfaceScanner is an authorized, passive attack surface intelligence workstation designed to map and assess public-facing domain infrastructure without invasive penetration testing.

---

## 1. System Overview

The application is structured as a full-stack TypeScript workspace:

```
DomainAttackSurfaceScanner/
├── client/              # React 18 + Vite workstation interface
│   ├── src/
│   │   ├── components/  # Nav, Theme, Auth, Export, Charts, Network Graphs
│   │   ├── context/     # AuthContext (session state), ThemeContext (dark/light)
│   │   ├── pages/       # Landing, Scan, Report, History, Compare, Privacy, Terms, Auth
│   │   └── lib/         # API client with credentials: 'include', history manager
│   └── public/          # robots.txt, sitemap.xml, favicon.svg, icons.svg
├── server/              # Node.js + Express intelligence backend
│   ├── src/
│   │   ├── db/          # PostgreSQL adapter + JSON dev fallback, schema.sql
│   │   ├── middleware/  # Auth session guard, error handlers, security headers
│   │   ├── routes/      # /api/scan, /api/auth, /api/quota
│   │   ├── services/    # Scan orchestrator, DNS, WHOIS, TLS, HTTP, Quota, Scoring
│   │   └── utils/       # Scrypt crypto, SSRF validator (publicResolution.ts), safeHttp
├── shared/              # Universal TypeScript contracts and interfaces
└── docs/                # Architecture, Security, SEO, Environment, and Deployment specs
```

---

## 2. Authentication & Authorization Model

### Minimal Privacy-First Identity
- **No Third-Party Trackers**: Authentication is strictly first-party. No external OAuth or social login data brokers.
- **Credential Storage**: Passwords are never stored in plaintext. They are hashed using RFC 7914 **Scrypt** with unique 16-byte cryptographically secure salts (`N=16384, r=8, p=1, keylen=64`). Verification uses `crypto.timingSafeEqual` to eliminate timing attacks.
- **Session Management**: Authenticated state is maintained via a cryptographically random 32-byte hex token stored in the `sessions` table (or dev store) and issued in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie named `dass_session`.
- **Ownership Isolation**:
  - Anonymous scans are tracked in volatile memory (or local browser storage) and automatically expire after 24 hours.
  - Authenticated scans record the owner's `userId`.
  - The API strictly enforces ownership: requests to view (`GET /api/scan/:scanId`), delete (`DELETE /api/scan/:scanId`), or compare scans verify ownership before responding. Unauthorized requests from other users return `403 Forbidden`.

---

## 3. Quota & Rate Limiting Subsystem

To protect passive data sources and prevent resource exhaustion, the application enforces tiered sliding-window quotas:

| Tier | Default Limit | Identification | Persistence | Cookie Requirement |
|---|---|---|---|---|
| **Anonymous** | 5 scans / hour | Client IP (`req.ip` / forwarded header) | In-memory 24h sliding window | None (0 cookies) |
| **Registered** | 50 scans / hour | User ID (`req.user.id`) | Database `quotas` table | Essential session cookie |

When a quota threshold is exceeded, the server responds with:
- HTTP status `429 Too Many Requests`.
- Standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset`.
- Informative JSON payload detailing remaining quota, reset timestamp, and options to log in or await the window reset.

---

## 4. SSRF & Network Security Architecture

Passive scanning must strictly target legitimate public domains without becoming an open proxy or intranet probe:

1. **Target Validation**:
   - Rejects raw IP addresses, localhost, RFC 1918 private ranges, and non-canonical domain names.
2. **SSRF Guard (`publicResolution.ts`)**:
   - Resolves target hostnames using authoritative DNS.
   - Inspects all resolved IPv4 and IPv6 addresses against reserved CIDR ranges:
     - `127.0.0.0/8` (Loopback)
     - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private Intranet)
     - `169.254.0.0/16` (Link-Local & Cloud Metadata e.g. AWS `169.254.169.254`)
     - `100.64.0.0/10` (Carrier-Grade NAT)
     - `0.0.0.0/8` (This host)
     - `224.0.0.0/4`, `240.0.0.0/4` (Multicast & Reserved)
     - `::1`, `fc00::/7`, `fe80::/10` (IPv6 loopback, ULA, link-local)
3. **Safe HTTP Transport (`safeHttp.ts`)**:
   - Pinning and redirect inspection ensures HTTP banner grabs do not redirect attackers into internal network endpoints.

---

## 5. Dual-Mode Persistence Layer

The database adapter ([server/src/db/index.ts](file:///c:/Users/annap/Desktop/Projects/DomainAttackSurfaceScanner/server/src/db/index.ts)) operates in two distinct operational modes:

1. **Production Mode (`DATABASE_URL` configured)**:
   - Connects via `pg.Pool` with connection pooling, SSL/TLS, and prepared statements.
   - Automatically applies `server/src/db/schema.sql` on startup if tables do not exist.
   - Relational tables: `users`, `sessions`, `scans`, `scan_results`, and `quotas`.
2. **Development & CI Mode (`DATABASE_URL` unset)**:
   - Falls back automatically to an in-memory, file-backed atomic store (`.data/dass_db.json`).
   - Enables instantaneous unit testing (e.g., Jest suites complete in milliseconds without external database dependencies).
   - Preserves complete functional parity (Scrypt hashes, user sessions, scan histories, quotas).

---

## 6. Scan Lifecycle & Intelligence Pipeline

```
[Client Web UI]
       │
       ▼
[POST /api/scan] ──► [SSRF & Quota Guard]
       │
       ▼ (Scan ID Issued Immediately)
[Passive Intelligence Workers]
  ├── WHOIS / RDAP Registration Metadata
  ├── DNS Resolver (A, AAAA, MX, TXT, NS, CAA, CNAME)
  ├── Email Posture (SPF Syntax, DKIM Selectors, DMARC Enforcement)
  ├── Certificate Transparency Logs (crt.sh / Subject Alternative Names)
  ├── TLS Handshake & Cipher Suite Analysis
  ├── HTTP Header & Security Directives (HSTS, CSP, X-Frame-Options)
  └── Subdomain Discovery & Network ASN Correlation
       │
       ▼
[Scoring Engine (Heuristic 0-100 & Finding Generation)]
       │
       ▼
[Database / Store] ◄── [Client Polls GET /api/scan/:scanId]
```

---

## 7. User Interface & Theme System

- **Aesthetic**: Network Intelligence Workstation (high-density telemetry, clear hierarchical grouping, monospace data readouts).
- **Themes**: First-class Dark Theme and Light Theme toggled via `ThemeContext` and persisted in `localStorage`.
- **CSS Architecture**: Pure Vanilla CSS custom properties (`index.css`) with zero layout flashes and high-contrast accessibility compliance.
