# Production Deployment & Operations Guide — Domain Attack Surface Scanner

This guide details operational topology, environment configuration, backup/recovery procedures, deployment validation, and the post-deployment smoke test for **Domain Attack Surface Scanner**.

---

## 1. Local Development vs. Production Workflows

### Local Development (Zero External Dependencies)
- **Runtime**: Node.js 18+ on local machine.
- **Persistence**: Automatic fallback to atomic JSON store (`.data/dass_db.json`). No external PostgreSQL required.
- **Commands**:
  ```bash
  # Install dependencies for client, server, and shared
  npm install
  # Run both Vite frontend (:5173) and Express backend (:3001) concurrently
  npm run dev
  ```
- **Local Access**: Open `http://localhost:5173`.

### Production Deployment
- **Runtime**: Managed Node.js container (AWS ECS, Fly.io, Railway, Render, or Ubuntu VPS) + Static CDN (Cloudflare Pages or Vercel).
- **Persistence**: Managed PostgreSQL 14+ with SSL (`DATABASE_URL=postgres://...`).
- **Commands**:
  ```bash
  npm install --omit=dev
  npm run build
  npm start
  ```

---

## 2. Comprehensive 20-Point Production Deployment Checklist

| # | Item | Category | Production Requirement |
|---|---|---|---|
| 1 | **Domain** | Infrastructure | Apex domain (`domainattacksurface.io`) and API subdomain (`api.domainattacksurface.io`) registered and routed. |
| 2 | **DNS** | Routing | Authoritative DNS configured with A/AAAA or CNAME records pointing to frontend CDN and backend hosts. |
| 3 | **HTTPS** | Transport | TLS certificates provisioned via Let's Encrypt or Cloudflare Edge; automatic HTTP-to-HTTPS redirect enforced. |
| 4 | **Frontend Deployment** | Application | Static bundle (`client/dist`) deployed to Cloudflare Pages or edge CDN with zero-cache on `index.html`. |
| 5 | **Backend Deployment** | Application | Server compiled bundle (`server/dist`) executed via `node server/dist/index.js` under process supervisor (systemd / PM2 / Docker). |
| 6 | **PostgreSQL Provisioning** | Persistence | Managed PostgreSQL 14+ instance provisioned with connection pooling, SSL enforcement (`sslmode=require`), and daily snapshots. |
| 7 | **Environment Variables** | Configuration | Host environment populated with all mandatory production keys; verify `.env` files are not committed to git. |
| 8 | **SESSION_SECRET** | Cryptography | High-entropy random secret (>= 32 characters) generated via `crypto.randomBytes(32).toString('hex')`. Verified by server startup guard. |
| 9 | **CLIENT_ORIGIN** | Security | Canonical frontend URL (`https://scanner.example.com`). Strict startup validation prevents localhost in production. |
| 10 | **DATABASE_URL** | Persistence | Secure PostgreSQL URI; validated at startup to ensure valid `postgres://` or `postgresql://` URI scheme. |
| 11 | **TRUST_PROXY** | Proxy/RateLimit | Configured to `1` (or upstream proxy hop count / CIDR) behind reverse proxies (Nginx/Cloudflare) to safely populate `req.ip`. |
| 12 | **CORS** | Security | Strict origin restriction matching `CLIENT_ORIGIN` with `credentials: true`. Wildcards (`*`) are disallowed. |
| 13 | **Cookies** | Authentication | `dass_session` cookie issued with `HttpOnly; Secure; SameSite=Lax; Path=/` and 7-day lifetime. |
| 14 | **Health Endpoint** | Monitoring | `GET /api/health` returns `200 OK` with uptime and version without exposing system secrets. |
| 15 | **Readiness Endpoint** | Monitoring | `GET /api/health/ready` returns `200 OK` confirming database probe connectivity; returns `503` on persistence failure without leaking SQL details. |
| 16 | **Database Backups** | Resilience | Automated daily snapshot backups with point-in-time recovery (PITR) configured on the managed database host. |
| 17 | **Logging** | Observability | Structured stdout logging enabled; zero plaintext passwords, tokens, database credentials, or full scan payloads. |
| 18 | **Monitoring** | Observability | Uptime monitor probing `/api/health` every 60s; alert triggers on 5xx error spikes or latency degradations. |
| 19 | **Rollback Strategy** | Operations | Atomic git commit tagging enabling instant redeployment of previous stable release artifact. |
| 20 | **Smoke Testing** | Validation | Post-deployment execution of the 22-step smoke test checklist before public release announcement. |

---

## 3. Database Migration, Backup & Disaster Recovery

### Implementation Status Breakdown

| Area | Status | Classification | Details |
|---|---|---|---|
| **Idempotent DDL** | **IMPLEMENTED** | Technical Control | `server/src/db/schema.sql` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Tables are never dropped on restart. |
| **Foreign Key Cascades** | **IMPLEMENTED** | Technical Control | `sessions` and `scans` reference `users(id)` with `ON DELETE CASCADE`. `scan_results` references `scans(id)` with `ON DELETE CASCADE`. |
| **Managed DB Provisioning** | **DEPLOYMENT TASK** | Host Requirement | Database cluster (Supabase, Neon, AWS RDS, DigitalOcean) must be provisioned by infrastructure owner. |
| **Automated Snapshots** | **DEPLOYMENT TASK** | Host Requirement | Configure 24-hour snapshot frequency with minimum 7-day retention on cloud database dashboard. |
| **Point-in-Time Recovery** | **FUTURE RECOMMENDATION**| Enterprise Growth | Enable continuous WAL archiving for 30-day point-in-time recovery once user volume scales. |

### Backup Procedures & Recommendations
1. **Automated Logical Backup (pg_dump)**:
   ```bash
   # Scheduled nightly cron script
   pg_dump "$DATABASE_URL" -Fc -f "/backups/dass_db_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Restoration Procedure**:
   ```bash
   # In event of data corruption or disaster recovery:
   pg_restore --clean --if-exists -d "$NEW_DATABASE_URL" "/backups/dass_db_YYYYMMDD_HHMMSS.dump"
   ```
3. **What Happens to Anonymous Scans**:
   - Anonymous scan results reside in volatile cache with a 24-hour TTL.
   - Anonymous scan data is not permanently preserved in the relational database; loss of a node or restart clears volatile cache cleanly without corrupting user accounts.
4. **Disaster Recovery / Loss of Database**:
   - In catastrophic database loss, restoring from snapshot restores all registered users, historical scans, and quota counters.
   - If no backup is available, `schema.sql` automatically re-creates an empty schema on startup. Users would need to re-register.
5. **Rollback Strategy**:
   - Since schema initialization is additive and non-destructive, rolling back the Node.js application binary to a previous commit does not require destructive database downgrades.

---

## 4. Reverse Proxy & SSL Configuration (Nginx / Caddy / Cloudflare)

When deploying behind an Nginx reverse proxy on a Linux host:

```nginx
# /etc/nginx/sites-available/dass.conf
server {
    listen 80;
    server_name api.domainattacksurface.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.domainattacksurface.io;

    ssl_certificate /etc/letsencrypt/live/api.domainattacksurface.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.domainattacksurface.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Buffer and timeout limits
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

---

## 5. Post-Deployment Smoke Test (22-Step Verification)

Execute this sequential verification checklist immediately following production deployment:

1. [ ] **Homepage loads**: Navigate to `https://domainattacksurface.io/` — verify terminal theme renders without layout shift.
2. [ ] **HTTPS works**: Verify browser padlock icon confirms valid TLS certificate without mixed-content warnings.
3. [ ] **Anonymous scan works**: Submit `example.com` as an unauthenticated visitor; verify progress bars and complete dossier generation.
4. [ ] **Invalid domain rejected**: Submit `not-a-valid-domain` or malformed input; verify `400 Bad Request` with helpful error message.
5. [ ] **SSRF targets rejected**: Attempt to scan `127.0.0.1`, `169.254.169.254`, `localhost`, and `internal.corp`; verify immediate rejection.
6. [ ] **Quota works**: Verify anonymous quota meter drops from 5 to 4 remaining; verify `X-RateLimit-*` response headers.
7. [ ] **Registration works**: Navigate to `/register`; create test account (`test@example.com`); verify instant redirection.
8. [ ] **Login works**: Log out and log back in on `/login`; verify session restoration.
9. [ ] **Logout works**: Click "LOGOUT"; verify `dass_session` cookie is cleared and UI returns to anonymous state.
10. [ ] **Authenticated scan works**: Perform a scan while logged in; verify scan completes under registered quota tier.
11. [ ] **Scan appears in history**: Navigate to `/history`; verify the newly completed scan is listed with domain, timestamp, and score.
12. [ ] **Cross-user access denied**: Attempt to fetch a private scan ID from another unauthenticated session; verify `403 Forbidden`.
13. [ ] **Scan deletion works**: Click delete on a saved scan in `/history`; verify it is permanently removed from the list.
14. [ ] **Account deletion works**: Open account management modal on `/history`; confirm deletion; verify user, scans, quotas, and session are purged.
15. [ ] **Session cookie has correct flags**: Inspect `dass_session` in DevTools; verify `HttpOnly=true`, `Secure=true`, `SameSite=Lax`.
16. [ ] **Health endpoint works**: `curl -i https://api.domainattacksurface.io/api/health` returns HTTP 200 with status `ok`.
17. [ ] **Readiness endpoint works**: `curl -i https://api.domainattacksurface.io/api/health/ready` returns HTTP 200 with status `ready`.
18. [ ] **Robots.txt works**: Verify `https://domainattacksurface.io/robots.txt` disallows `/login`, `/register`, `/api/`, `/scan/`, `/report/`.
19. [ ] **Sitemap.xml works**: Verify `https://domainattacksurface.io/sitemap.xml` lists public canonical routes with valid XML headers.
20. [ ] **Policy pages work**: Verify `/privacy`, `/terms`, `/cookies`, and `/billing` render accurately without placeholder errors.
21. [ ] **No secrets in responses**: Verify DevTools Network tab inspects responses for absence of passwords, hashes, tokens, or SQL URIs.
22. [ ] **No third-party trackers**: Inspect DevTools Network waterfall; confirm zero calls to Google Analytics, Facebook, or ad networks.
