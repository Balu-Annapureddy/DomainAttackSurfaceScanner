# Deployment Guide — Domain Attack Surface Scanner

This guide details deployment practices, operational architecture, environment configuration, and security controls for deploying DomainAttackSurfaceScanner to production.

---

## 1. Build & Compilation

DomainAttackSurfaceScanner is structured as an npm workspaces monorepo:
- `client/`: React 19, TypeScript, Vite, Tailwind CSS
- `server/`: Node.js, Express, TypeScript
- `shared/`: Shared TypeScript data contracts

Build all packages with:

```bash
# Build both client and server production bundles
npm run build
```

The client outputs static assets to `client/dist/`. The server compiles TypeScript to `server/dist/`. In production mode (`NODE_ENV=production`), the Express server automatically serves the compiled client bundle from `client/dist/` for unified single-origin deployments.

---

## 2. Start Command & Process Execution

Run the compiled production server:

```bash
NODE_ENV=production npm run start --workspace=server
```

Or execute directly with Node:

```bash
NODE_ENV=production node server/dist/server/src/index.js
```

For production process management, use a process supervisor such as `pm2`, `systemd`, or a container runner (Docker/Kubernetes).

---

## 3. Environment Variables

All settings can be declared in a `.env` file or injected via container/cloud environment variables. Refer to `.env.example` for comprehensive documentation.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `3001` | TCP port for the backend server |
| `NODE_ENV` | Yes | `development` | Set to `production` in live environments |
| `CLIENT_ORIGIN` | Yes | `http://localhost:5173` | Allowed CORS origin (e.g., `https://scanner.example.com`) |
| `SCAN_RATE_LIMIT_MAX` | No | `10` (prod) / `100` (dev) | Maximum scan submissions per IP window |
| `SCAN_RATE_LIMIT_WINDOW_MS` | No | `3600000` (1h) / `900000` (15m) | Rate limiting window in milliseconds |
| `SCAN_TIMEOUT_MS` | No | `120000` (2m) | Per-scan execution timeout |
| `MAX_CONCURRENT_SCANS` | No | `2` | Maximum concurrent scan jobs handled simultaneously |
| `MAX_EXTERNAL_REQUESTS` | No | `30` | Request budget cap per scan |
| `MAX_RESPONSE_BYTES` | No | `524288` (512KB) | Maximum bytes read per outbound response |
| `MAX_REDIRECTS` | No | `3` | Maximum HTTP redirect hops allowed |
| `IP_INTELLIGENCE_ENABLED` | No | `true` | Enables approximate IP infrastructure geolocation |
| `IP_INTELLIGENCE_URL` | No | `https://ipapi.co/{ip}/json/` | HTTPS IP provider template with `{ip}` |
| `ALLOWED_IP_INTELLIGENCE_HOSTS` | No | *(default set)* | Comma-separated list of approved provider hostnames |

---

## 4. Reverse Proxy & HTTPS Configuration

The application must be placed behind a reverse proxy (such as Nginx, Caddy, AWS ALB, or Cloudflare) that terminates TLS.

Example Nginx reverse proxy configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name scanner.example.com;

    ssl_certificate /etc/letsencrypt/live/scanner.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scanner.example.com/privkey.pem;

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

## 5. Cloudflare & Edge Security Topology

Recommended production deployment topology:

```text
User Browser
    ↓ (HTTPS)
Cloudflare (Edge WAF, DDoS mitigation, Bot management, SSL/TLS termination)
    ↓ (Authenticated Origin Pull / HTTPS)
Reverse Proxy (Nginx / ALB)
    ↓ (HTTP localhost / private subnet)
Node.js Express Server (Port 3001)
    ↓
Target Scanning Engine (Strict public resolution, SSRF controls, Request budgets)
    ↓
Public Internet Records (DNS, RDAP, crt.sh, TLS handshakes)
```

*Note: Cloudflare is a deployment infrastructure recommendation. It is not bundled inside the application repo.*

---

## 6. Health & Readiness Endpoints

The server exposes dedicated health and liveness probes:

- **`GET /api/health`**:
  Returns `200 OK` with JSON `{ status: "ok", timestamp, uptime, version }`. Use this for basic liveness monitoring.
- **`GET /api/health/ready`**:
  Returns `200 OK` with JSON `{ status: "ready", timestamp, activeScans }` when configuration and in-memory stores are initialized. Returns `503 Service Unavailable` if unready.

---

## 7. Storage Model & Ephemeral Persistence Limitations

- **Current Implementation**: The scanner uses an in-memory `Map<string, ScanRecord>` with a 24-hour time-to-live (TTL). Scans expire automatically after 24 hours.
- **Single-Process Constraint**: Scans stored in memory are local to the running Node.js process. In a horizontally scaled multi-instance deployment, requests must be routed with sticky sessions, or a shared database must be used.
- **Future Migration Path**: The store interface in `server/src/services/scanStore.ts` cleanly isolates scan state operations (`createScanRecord`, `getScanRecord`, `updateCategoryStatus`, `setScanScore`, `markScanFinished`). Replacing the in-memory Map with PostgreSQL or Redis can be achieved without modifying route handlers or business logic.

---

## 8. Rate Limiting & Concurrency Controls

- Scan submission is bounded by `express-rate-limit` (defaulting to 10 scans per IP per hour in production).
- The server tracks active concurrent scans with `config.maxConcurrentScans` (default: 2) and rejects excess traffic with `429 Too Many Requests (SCAN_CONCURRENCY_LIMIT)`.
- A 60-second cooldown per target domain prevents redundant concurrent scanning of the same target.
- Individual scans enforce a `ScanRequestBudget` (default: 30 outbound requests) and an execution timeout of 120 seconds.

---

## 9. Production Security Checklist

Before exposing the scanner to the public internet:
1. [ ] Set `NODE_ENV=production`.
2. [ ] Set `CLIENT_ORIGIN` to your canonical HTTPS domain.
3. [ ] Confirm server is fronted by HTTPS termination.
4. [ ] Verify `PORT` is bound to `127.0.0.1` or isolated within a container network.
5. [ ] Verify `SCAN_RATE_LIMIT_MAX` and `SCAN_RATE_LIMIT_WINDOW_MS` match your expected traffic volume.
6. [ ] Confirm no secrets or `.env` files are tracked in version control.
7. [ ] Ensure provider URL uses HTTPS and matches `ALLOWED_IP_INTELLIGENCE_HOSTS`.
8. [ ] Verify `/api/health` and `/api/health/ready` respond with 200 OK.
