# Production Architecture, Operations & Cost Assessment — DASS

This document provides the definitive Phase 3 engineering specifications for the production deployment, hosting topology, security and privacy posture, environment variable checklist, quota economics, custom domain setup, and acceptance testing of **Domain Attack Surface Scanner (DASS)**.

---

## 1. Production Architecture Overview

```mermaid
graph TD
    User([Browser Client]) -->|HTTPS: Edge CDN| CFPages[Cloudflare Pages<br/>React 18 + Vite SPA]
    CFPages -->|API Requests: HTTPS| RailwayLB[Railway Edge / Ingress Reverse Proxy]
    RailwayLB -->|X-Forwarded-For + Host| ExpressApp[Express / Node.js 18+ Backend<br/>(DASS Server Container)]
    ExpressApp -->|SSL Pool: sslmode=require| Postgres[(Managed PostgreSQL 14+<br/>Railway / RDS)]
    ExpressApp -->|Atomic Fallback in Dev| LocalJson[(Local JSON Store<br/>.data/dass_db.json)]
    ExpressApp -->|SSRF-Guarded Outbound| OutboundProbes{Safe HTTP & DNS Prober<br/>Budget: 30 queries}
    OutboundProbes -->|Strict passive DNS| TargetDNS[Authoritative DNS]
    OutboundProbes -->|TLS probe: Pinning + SAN| TargetTLS[Port 443 TLS Handshake]
    OutboundProbes -->|Stream max 512KB| TargetHTTP[Target Web Server]
    OutboundProbes -->|Whitelisted API| ThirdParty[Shodan InternetDB / IP-API / CertSpotter]
    ExpressApp -->|Fail-Closed in Prod| ResendAPI[Resend Transactional Email API]
```

### 1.1 Architectural Topology
1. **Frontend Tier (Edge Delivery)**:
   - Hosted on **Cloudflare Pages**.
   - Serves pre-compiled, gzip/brotli compressed assets (`client/dist`).
   - Immutable asset hashing for bundle chunks (`[name]-[hash].js`), enabling `Cache-Control: public, max-age=31536000, immutable`.
   - `index.html` delivered with `Cache-Control: no-cache, no-store, must-revalidate` to ensure immediate updates upon release.
   - Global Anycast CDN termination with automated edge TLS certificates.

2. **Backend Application Tier (Compute)**:
   - Hosted in a containerized environment on **Railway** (or Docker on AWS ECS / Render / VPS).
   - Single-node Node.js 18+ runtime managed under an active process supervisor.
   - Reverse proxy termination with `TRUST_PROXY=1` (validating real client IP via proxy headers).
   - Rate limiting and sliding window quota management enforced per client IP and user identity.
   - Outbound scan executor governed by `ScanRequestBudget` (30 max external queries per scan) and `safeHttp` (strict IP pinning, loopback/link-local/private/NAT64 rejection, redirect validation).

3. **Persistence Tier (Storage)**:
   - **PostgreSQL 14+** managed database with encrypted storage at rest and SSL in transit (`sslmode=require`).
   - Automated schema migration on server startup (`server/src/db/schema.sql`).
   - Zero-dependency local JSON adapter (`.data/dass_db.json`) for seamless zero-setup offline development and automated CI.

---

## 2. Deployment and Rollback Guide

### 2.1 Deployment Pipeline
1. **Automated CI Checks**:
   - Every commit and pull request triggers GitHub Actions (`.github/workflows/ci.yml`).
   - Pipeline stages:
     1. Dependency audit & lockfile integrity (`npm ci`).
     2. Code quality & linting (`npm run lint` — ESLint on server & client).
     3. Automated test suite (`npm test` — Jest server suite + Vitest client suite).
     4. Production compilation test (`npm run build` — TypeScript compile + Vite bundling).
2. **Frontend Deployment to Cloudflare Pages**:
   - Connected directly to GitHub repository `main` branch.
   - Build command: `npm run build --workspace=client`
   - Build output directory: `client/dist`
   - Environment variables set in Cloudflare Dashboard: `VITE_API_URL` (points to Railway backend).
3. **Backend Deployment to Railway**:
   - Connected to GitHub repository `main` branch with root directory set to `/`.
   - Build command: `npm run build --workspace=server`
   - Start command: `node server/dist/server/src/index.js`

### 2.2 Rollback Procedure
1. **Instant Frontend Rollback**:
   - Cloudflare Pages preserves all previous deployment artifact hashes.
   - In Cloudflare Pages dashboard -> **Deployments**, locate the last known healthy deployment and click **Rollback to this deployment**. Instant zero-downtime revert (< 5 seconds).
2. **Backend Rollback**:
   - In Railway dashboard -> **Deployments**, click **Redeploy** on the prior successful build.
   - Alternatively, via Git:
     ```bash
     git revert HEAD --no-edit
     git push origin main
     ```
3. **Database Migration Safety**:
   - DASS migrations in `schema.sql` are additive (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
   - Rollback of application code does not require destructive database rollback.

---

## 3. Environment Variable Checklist

| Variable | Production Value / Requirement | Purpose | Validation & Safety Behavior |
|---|---|---|---|
| `NODE_ENV` | `production` | Enables production mode | Guard suppresses internal stack traces in HTTP responses |
| `PORT` | Set by host (e.g. `3001` or dynamic `$PORT`) | Server HTTP listener port | Falls back to `3001` if unset |
| `CLIENT_ORIGIN` | `https://domainattacksurfacescanner.pages.dev` (or custom domain) | CORS and cookie scope | **Strict guard**: Server refuses to boot if set to `localhost` in production |
| `SESSION_SECRET` | `openssl rand -hex 32` (min 32 chars) | Cryptographic signature of session cookies | **Strict guard**: Server refuses to boot if missing or < 32 characters in production |
| `DATABASE_URL` | `postgres://user:pass@host:5432/dass?sslmode=require` | Persistent storage connection | Fail-closed in production if PostgreSQL initialization fails |
| `TRUST_PROXY` | `1` | Reverse proxy trust count | Required behind Railway / Cloudflare to ensure accurate client IP rate limiting |
| `ANONYMOUS_SCAN_LIMIT` | `15` | Anon quota per sliding window (1 hr) | Enforced via in-memory & DB quota buckets |
| `REGISTERED_SCAN_LIMIT` | `60` | Registered user quota per sliding window | Unlocked upon verified email address |
| `SCAN_LIMIT_WINDOW_MS` | `3600000` (1 hour) | Sliding quota reset window | Governs quota refill schedule |
| `SCAN_TIMEOUT_MS` | `120000` (2 minutes) | Max total scan execution timeout | Hard deadline enforced via AbortController |
| `MAX_CONCURRENT_SCANS` | `2` (single node) | Prevents resource starvation | Extra scans queued or rejected with `429` |
| `MAX_EXTERNAL_REQUESTS`| `30` | Request budget cap per scan | Enforced via `ScanRequestBudget.consume()` |
| `RESEND_API_KEY` | `re_...` (Resend production key) | Transactional email delivery | **Fail-closed in production**: Throws explicit error rather than silently mocking |
| `EMAIL_FROM` | `DASS Workstation <no-reply@domainattacksurface.io>` | Verified sender identity | Must match verified domain in Resend |

---

## 4. Security and Privacy Checklist

- [x] **SSRF Defense (Server-Side Request Forgery)**:
  - Custom DNS resolver callbacks pin target IP address before connecting.
  - Strict IP validation blocks:
    - IPv4 Loopback (`127.0.0.0/8`)
    - IPv4 RFC1918 Private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
    - IPv4 Link-Local & Cloud Metadata (`169.254.0.0/16`, specifically `169.254.169.254`)
    - IPv4 Shared / CGNAT (`100.64.0.0/10`)
    - IPv4 Multicast & Reserved (`224.0.0.0/4`, `240.0.0.0/4`)
    - IPv6 Loopback (`::1`), Link-Local (`fe80::/10`), Unique Local (`fc00::/7`)
    - IPv6 Transition Mechanisms: NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), Discard (`100::/64`), Teredo (`2001::/32`), 6to4 (`2002::/16`)
  - Redirect validation: Every HTTP redirect re-evaluates the destination IP against SSRF blocklists.
- [x] **Rate Limiting & Abuse Prevention**:
  - Global IP rate limiting: 100 requests per 15 minutes on general API routes.
  - Auth rate limiting: 10 attempts per 15 minutes on login/register endpoints.
  - Scan rate limiting: Max 15 anonymous scans/hr per IP; max 60 scans/hr per verified account.
  - Domain debouncing: Identical domain scans within 30 seconds reuse existing results to prevent target flooding.
- [x] **Credential & Token Protection**:
  - Passwords hashed using `bcrypt` (12 rounds).
  - Email verification tokens generated using `crypto.randomBytes(32).toString('hex')`.
  - Verification tokens expire after 24 hours and are invalidated immediately upon use.
  - Email delivery logs only `recipient=` and `subject=`; never outputs token-bearing bodies or URLs to stdout in dev or production.
  - Client-side JSON exports explicitly strip `userId` to avoid leaking internal user UUIDs.
- [x] **CORS & Cookie Hardening**:
  - CORS strictly configured to `CLIENT_ORIGIN` with credentials enabled.
  - Session cookies configured with `HttpOnly; Secure; SameSite=Lax; Path=/`.
- [x] **Input Sanitization**:
  - Domain names validated using strict RFC 1035 / RFC 1123 hostname rules.
  - IP inputs validated via Node `net.isIP()`.
  - Disallowed inputs: Wildcards, URLs with credentials, local hostnames (`localhost`, `*.local`, `*.internal`).

---

## 5. Quota Economics and Operating Cost Assessment

### 5.1 Free-Tier Operational Budget
| Service | Provider Tier | Allocated Limit | DASS Usage Model | Estimated Monthly Cost |
|---|---|---|---|---|
| **Frontend CDN** | Cloudflare Pages (Free) | Unlimited requests, 500 builds/month | Static client distribution | **$0.00** |
| **Backend Compute**| Railway (Hobby Tier) | $5.00 monthly usage credit (~500 hrs execution) | 1 vCPU, 512MB RAM container | **$0.00 – $5.00** |
| **Database** | Railway PostgreSQL (Free/Hobby) | 1GB storage, shared CPU | Scan records (1000 scans ≈ 30MB) | **Included in credit** |
| **Email Service** | Resend (Free Tier) | 3,000 emails/month, 100 emails/day | Account verification & password resets | **$0.00** |
| **Threat Intel** | Shodan InternetDB (Free) | Unlimited passive IP queries | No API key required | **$0.00** |
| **IP Intelligence**| IP-API / ipapi.co (Free) | 45 requests/minute (IP-API) | Bounded by 30 queries per scan | **$0.00** |
| **Domain Registration** | Cloudflare Registrar | Annual apex registration | E.g. `.io` or `.com` ($10–$35/yr) | **~$1.00 – $3.00 / month** |
| **TOTAL** | — | — | Full operating capability | **~$1.00 – $8.00 / month** |

### 5.2 Scalability & Cost Bottlenecks
1. **Outbound Bandwidth**: Target banners are streamed up to 512 KB per connection (`MAX_RESPONSE_BYTES=524288`), with connection aborted immediately after limit reached.
2. **Third-Party Rate Limits**: Third-party IP intelligence is strictly budgeted (max 30 requests per scan).
3. **Database Growth**: Historical scans expire after 30 days (`expiresAt` column). A daily cron job (`DELETE FROM scans WHERE expires_at < NOW() AND is_saved = false`) keeps PostgreSQL well within 1GB free limits indefinitely.

---

## 6. Custom Domain Setup Plan

When transitioning from `domainattacksurfacescanner.pages.dev` to a custom domain (e.g., `domainattacksurface.io`):

1. **DNS Architecture**:
   - Apex Domain (`@`): CNAME to Cloudflare Pages (`<project>.pages.dev`).
   - API Subdomain (`api`): CNAME to Railway backend (`<project>.railway.app`).
2. **DNS Records (Cloudflare DNS)**:
   ```dns
   @       CNAME   domainattacksurfacescanner.pages.dev.   Proxied (Orange Cloud)
   api     CNAME   domainattacksurfacescanner.up.railway.app. Proxied (Orange Cloud)
   ```
3. **SSL / TLS Configuration**:
   - Cloudflare SSL/TLS mode: **Full (Strict)**.
   - Enforce **Always Use HTTPS** and **Minimum TLS Version: 1.2**.
4. **Environment Variable Cutover**:
   - Update Railway backend `CLIENT_ORIGIN`: `https://domainattacksurface.io`
   - Update Cloudflare Pages frontend `VITE_API_URL`: `https://api.domainattacksurface.io`
   - Re-deploy backend and frontend simultaneously.

---

## 7. Production Acceptance Testing Checklist

Execute these 10 verification steps prior to opening public traffic:

1. **Health Probes**:
   - Verify `GET /api/health` returns HTTP 200 with `{ status: "ok" }`.
   - Verify `GET /api/health/ready` returns HTTP 200 with `{ database: "connected" }`.
2. **SSRF Rejection Verification**:
   - Request scan of `127.0.0.1` -> Returns HTTP 400 with invalid domain message.
   - Request scan of `169.254.169.254` -> Returns HTTP 400.
   - Request scan of `localhost` -> Returns HTTP 400.
3. **Real Domain Pipeline Verification**:
   - Run scan of `example.com`: All 7 pipeline stages complete within 15 seconds.
   - External Hygiene Score generated with all 12 dimensions populated.
4. **Scan Budget Enforcement**:
   - Verify `ScanRequestBudget` caps total outbound network attempts at 30.
5. **Session & Cookie Security**:
   - Verify `Set-Cookie` header includes `HttpOnly`, `Secure`, `SameSite=Lax`.
6. **Authentication & Token Expiry**:
   - Register test account -> Verification email dispatched.
   - Verify token works once and cannot be replayed.
7. **Rate Limit & Quota Triggering**:
   - Send 16 consecutive scan requests from unauthenticated client -> 16th receives HTTP 429 quota exhausted.
8. **Export Sanity**:
   - Download JSON scan report -> Verify `userId` is absent from exported payload.
   - Download CSV findings -> Verify severity, observationStatus, and affectedAsset columns match report.
9. **History & Comparison Drift**:
   - Compare two consecutive scans of the same domain -> Differences correctly categorized without score distortion.
10. **Zero Secrets in Repository**:
    - Git history verified clean with zero committed API keys, tokens, or production credentials.
