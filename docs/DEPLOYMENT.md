# Deployment Guide — Domain Attack Surface Scanner

This guide details deployment architectures, operational topology, environment configuration, and security practices for deploying DomainAttackSurfaceScanner to production.

---

## 1. Deployment Topology Options

The application supports two primary production deployment architectures:

### Option A: Decoupled (Cloudflare Pages + Node Backend + Managed PostgreSQL) — *Recommended*
- **Frontend**: Deployed to Cloudflare Pages (or Vercel / Netlify) serving pre-compiled static assets from `client/dist`. Fast global CDN distribution, edge caching, and DDoS defense.
- **Backend API**: Deployed to a containerized Node.js host (e.g. Fly.io, Railway, Render, AWS ECS, or Ubuntu VPS) running `server/dist`.
- **Database**: Managed PostgreSQL instance (e.g. Supabase, Neon, AWS RDS, DigitalOcean PostgreSQL).
- **Communication**: Frontend sends API requests with `credentials: 'include'` over HTTPS.

```text
[Browser]
    │ (Static Assets & HTML)
    ├─────────────────────────────► [Cloudflare Pages CDN]
    │ (API with Session Cookie)
    └─────────────────────────────► [Cloudflare Edge WAF]
                                           │ (Reverse Proxy)
                                           ▼
                                    [Node.js Express API]
                                           │ (SSL Pool)
                                           ▼
                                    [PostgreSQL Database]
```

### Option B: Unified Fullstack Container (Single Origin)
- A single Node.js container builds both `client` and `server`.
- In `NODE_ENV=production`, Express serves the compiled static SPA from `client/dist` and handles `/api/*` routes directly on the same domain and port.
- Simplifies cookie handling (`SameSite=Lax` without cross-site origin issues).

---

## 2. Build & Compilation Commands

The repository is an npm workspaces monorepo:

```bash
# 1. Install all dependencies
npm install

# 2. Build both client and server production bundles
npm run build
```

- Client static output: `client/dist/`
- Server compiled JavaScript: `server/dist/`

---

## 3. Database Initialization & Persistence

1. **PostgreSQL Setup**:
   - Provision a PostgreSQL database (version 14+ recommended).
   - Retrieve connection string: `postgres://user:password@hostname:5432/dbname?sslmode=require`.
   - Set as `DATABASE_URL` environment variable.
2. **Auto-Migration**:
   - On server startup, if `DATABASE_URL` is configured, `server/src/db/index.ts` automatically executes `server/src/db/schema.sql` to establish tables:
     - `users` (credentials hashed with Scrypt)
     - `sessions` (cryptographically random tokens, expiration)
     - `scans` (scan metadata, ownership, scores)
     - `scan_results` (relational JSON results)
     - `quotas` (sliding-window scan counts)
3. **Zero-Setup Local / Standalone Mode**:
   - If `DATABASE_URL` is omitted, the application uses an atomic in-memory/file-backed JSON store at `.data/dass_db.json`. No external database is needed for development or test runs.

---

## 4. Environment Variables Checklist

Set these in your host dashboard (e.g. Fly secrets, Railway variables, Render environment):

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://scanner.example.com
DATABASE_URL=postgres://user:password@db.example.com:5432/dass?sslmode=require
SESSION_SECRET=GENERATE_HIGH_ENTROPY_64_CHAR_HEX_KEY
ANONYMOUS_SCAN_LIMIT=5
REGISTERED_SCAN_LIMIT=50
SCAN_LIMIT_WINDOW_MS=3600000
SCAN_TIMEOUT_MS=120000
MAX_CONCURRENT_SCANS=4
IP_INTELLIGENCE_ENABLED=true
IP_INTELLIGENCE_URL=https://ipapi.co/{ip}/json/
```

Generate `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Reverse Proxy & SSL Configuration (Nginx / Caddy)

When running behind Nginx or Caddy on a Linux server:

### Nginx Example
```nginx
server {
    listen 443 ssl http2;
    server_name api.scanner.example.com;

    ssl_certificate /etc/letsencrypt/live/api.scanner.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.scanner.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Health & Readiness Verification

After deployment, test the health check endpoints:

```bash
# Basic liveness check
curl -f https://api.scanner.example.com/api/health
# Response: {"status":"ok","timestamp":"...","uptime":...,"version":"1.0.0"}

# Readiness check (database & store initialized)
curl -f https://api.scanner.example.com/api/health/ready
# Response: {"status":"ready","timestamp":"...","activeScans":0}
```

---

## 7. Cloudflare Pages Deployment Steps

1. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select repository `DomainAttackSurfaceScanner`.
3. Build Settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build --workspace=client`
   - **Build output directory**: `client/dist`
   - **Root directory**: `/`
4. Set Environment Variables:
   - `VITE_API_URL`: `https://api.scanner.example.com` (or leave empty if using Cloudflare Pages proxy routes).
5. Custom Domain: Configure your apex or subdomain (e.g. `scanner.example.com`).

---

## 8. Post-Deployment Verification Checklist

1. [ ] Confirm `/api/health` returns `200 OK`.
2. [ ] Submit test scan for a known public domain (e.g. `example.com`).
3. [ ] Verify quota deduction (anonymous quota drops from 5 to 4).
4. [ ] Register a new account (`/register`), verify cookie `dass_session` set with `HttpOnly; Secure; SameSite=Lax`.
5. [ ] Verify registered quota displays `50 / 50 remaining`.
6. [ ] Save/view scan history (`/history`) and verify cross-session persistence.
7. [ ] Toggle dark / light theme and refresh page; confirm preference persists.
8. [ ] Check `robots.txt` (`https://domain.com/robots.txt`) and `sitemap.xml` (`https://domain.com/sitemap.xml`).
