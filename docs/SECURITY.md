# Security & Vulnerability Policy — Domain Attack Surface Scanner

Domain Attack Surface Scanner is built with defense-in-depth principles, strict operational boundaries, and zero-trust network safeguards.

---

## 1. Passive Reconnaissance Scope & Boundaries

The scanner is strictly passive and evidence-driven:

- **Target Acceptance**: Accepts only valid canonical public domain names. It strictly rejects:
  - Raw IPv4 and IPv6 addresses (e.g., `127.0.0.1`, `169.254.169.254`, `[::1]`).
  - Reserved and special-use TLDs: `.localhost`, `.local`, `.onion`, `.invalid`, `.test`, `.example`, `.arpa`.
  - Internal unqualified hostnames (e.g., `localhost`, `intranet`, `corp`).
  - All-numeric TLDs designed to mimic IP representations.
- **SSRF Network Boundaries (`publicResolution.ts`)**:
  - Authoritative DNS resolves hostnames before any network probe.
  - Every resolved address is evaluated against banned IP blocks:
    - Loopback: `127.0.0.0/8`, `::1`
    - Private Intranet: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`
    - Link-Local & Cloud Metadata: `169.254.0.0/16`, `fe80::/10` (specifically blocks AWS/GCP/Azure instance metadata at `169.254.169.254`)
    - Carrier-Grade NAT: `100.64.0.0/10`
    - Reserved & Multicast: `0.0.0.0/8`, `224.0.0.0/4`, `240.0.0.0/4`
    - IPv4-mapped IPv6: `::ffff:0:0/96` unpacked and checked against IPv4 rules.
- **Safe HTTP Transport (`safeHttp.ts`)**:
  - Binds HTTP connections to the validated public IP.
  - Follows maximum of 3 redirects (`MAX_REDIRECTS`); each intermediate redirect target is re-validated against the SSRF guard before following.
  - Maximum response body capped at 512 KB (`MAX_RESPONSE_BYTES`) to prevent denial-of-service or memory exhaustion.
  - Strictly limits requests to standard public web paths (`/`, `robots.txt`, `sitemap.xml`, `/.well-known/security.txt`).
  - Never submits active exploit payloads, SQL injection fuzzing, or authentication bypass attempts.

---

## 2. Cryptography & Password Storage

- **Algorithm**: RFC 7914 **Scrypt** with memory-hard work factor parameters:
  - $N = 16384$ (CPU/memory cost parameter)
  - $r = 8$ (block size parameter)
  - $p = 1$ (parallelization parameter)
  - Output key length: 64 bytes
- **Salts**: Cryptographically strong random 16-byte salt (`crypto.randomBytes(16)`) generated independently for every user.
- **Timing Defense**: Password verification uses `crypto.timingSafeEqual` over fixed-length buffers to eliminate side-channel timing attacks.
- **Zero Plaintext**: Passwords are never written to disk, caches, or logs in plaintext.

---

## 3. Session Security & Zero-Leakage Logging

- **Session Identification**: Cryptographically random 32-byte hex tokens stored in the database `sessions` table.
- **Cookie Security (`dass_session`)**:
  - `HttpOnly`: Prevents JavaScript access, mitigating Cross-Site Scripting (XSS) token exfiltration.
  - `SameSite=Lax`: Mitigates Cross-Site Request Forgery (CSRF).
  - `Secure`: Enforced in production (`NODE_ENV=production`) ensuring cookies are transmitted strictly over HTTPS.
  - Lifetime: ~7 days with automatic expiration and database purge.
- **Production Secret Validation**:
  - `SESSION_SECRET` must be provided in production and must be at least 32 characters.
  - The server startup validator rejects known development defaults (e.g. `dev-secret`, `dass-insecure`).
- **Zero-Leakage Logging Policy**:
  - Sensitive parameters (passwords, tokens, database credentials, full session cookies) are excluded from structured logs.
  - Database error messages are sanitized before client transmission to prevent exposing SQL schema internals or connection URIs.

---

## 4. Reverse Proxy & Rate Limiting

- **Anti-Spoofing**: When deployed behind a reverse proxy (e.g. Nginx, Cloudflare), `TRUST_PROXY=1` instructs Express to trust only the immediate upstream proxy hop.
- If `TRUST_PROXY` is disabled, client-supplied `X-Forwarded-For` headers are strictly ignored, using the raw socket remote address to prevent quota evasion.
- **Hourly Sliding Quotas**:
  - Anonymous visitors: 5 scans/hour (bound to client IP).
  - Registered users: 50 scans/hour (bound to authenticated user ID).
  - Concurrency caps: Maximum 2 concurrent scans globally to prevent server resource starvation.

---

## 5. Security Headers

The application deploys modern defense headers:
- `Content-Security-Policy`: Default `'self'`, scripts `'self'`, styles `'self' 'unsafe-inline'` and Google Fonts, images `'self' data: https://*.tile.openstreetmap.org`.
- `Permissions-Policy`: `geolocation=(), camera=(), microphone=()`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production HTTPS)

---

## 6. Responsible Vulnerability Disclosure

If you believe you have discovered a security vulnerability in DomainAttackSurfaceScanner:

1. **Do not create a public issue**.
2. Email your findings and reproduction steps to:  
   `security@domainattacksurface.io` (or repository maintainer contact).
3. Include:
   - Type of issue (e.g., SSRF bypass, authentication flaw, race condition).
   - Detailed step-by-step reproduction guide or proof-of-concept.
   - Any proposed remediation.
4. **Response SLA**: We acknowledge security reports within 48 hours and aim to release patches within 7 business days for high-severity findings.
