# Environment Variables & Configuration Guide

This document describes all environment variables used by **Domain Attack Surface Scanner**, their default values, security implications, and production recommendations.

---

## 1. Quick Reference Table

| Variable | Type | Default | Required in Prod? | Description |
|---|---|---|---|---|
| `NODE_ENV` | `string` | `development` | Recommended | `production`, `development`, or `test` |
| `PORT` | `integer` | `3001` | No | Port for the Express backend server |
| `CLIENT_ORIGIN` | `url` | `http://localhost:5173` | **Yes** | Origin allowed by CORS and session cookies |
| `DATABASE_URL` | `string` | _empty (in-memory dev)_ | Recommended | PostgreSQL connection URI (`postgres://user:pass@host:5432/dbname`) |
| `SESSION_SECRET` | `string` | _internal fallback_ | **Yes** | Cryptographic secret for signing session state / tokens |
| `ANONYMOUS_SCAN_LIMIT` | `integer` | `5` | No | Maximum scans per hour for unauthenticated IP addresses |
| `REGISTERED_SCAN_LIMIT` | `integer` | `50` | No | Maximum scans per hour for registered user accounts |
| `SCAN_LIMIT_WINDOW_MS` | `integer` | `3600000` (1 hr) | No | Quota sliding window duration in milliseconds |
| `SCAN_TIMEOUT_MS` | `integer` | `120000` (2 min) | No | Maximum duration allowed for a single domain scan |
| `MAX_CONCURRENT_SCANS` | `integer` | `2` | No | Concurrent scans processed per node instance |
| `MAX_SUBDOMAINS` | `integer` | `200` | No | Maximum subdomains gathered per scan |
| `MAX_ASSETS` | `integer` | `500` | No | Maximum normalized assets stored per scan |
| `MAX_RESPONSE_BYTES` | `integer` | `524288` (512 KB) | No | Maximum payload size downloaded from target HTTP banners |
| `MAX_REDIRECTS` | `integer` | `3` | No | Maximum HTTP redirects followed during banner checks |
| `MAX_EXTERNAL_REQUESTS` | `integer` | `30` | No | Maximum third-party outbound queries per scan |
| `IP_INTELLIGENCE_ENABLED`| `boolean` | `true` | No | Enable/disable external IP ASN & geo lookups (`true`/`false`) |
| `IP_INTELLIGENCE_URL` | `url` | `https://ipapi.co/{ip}/json/`| No | Provider URL template containing `{ip}` placeholder |
| `IP_INTELLIGENCE_TIMEOUT_MS` | `integer` | `5000` (5s) | No | Timeout for IP intelligence lookup queries |

---

## 2. Production Security Best Practices

### `DATABASE_URL`
- When set, the server automatically connects using `pg.Pool` and runs initial schema migrations (`schema.sql`).
- In cloud deployments (e.g. Supabase, Neon, AWS RDS, DigitalOcean), always use SSL:
  ```env
  DATABASE_URL=postgres://dass_user:STRONG_PASSWORD@db.example.com:5432/dass_db?sslmode=require
  ```
- If unset, the application automatically falls back to an atomic local file/memory store (`.data/dass_db.json`), ideal for self-contained testing and single-node development.

### `SESSION_SECRET`
- Generate a high-entropy secret using OpenSSL or Node:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Set in your production environment variables:
  ```env
  SESSION_SECRET=c8e9b4f2167d4a10e82c5f1a9b3e7d6c5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d
  ```

### `CLIENT_ORIGIN`
- Must match your deployed frontend domain exactly (e.g. `https://domainattacksurface.io`).
- Do not use wildcards (`*`) because authentication requires `credentials: true` and cookie passing.

---

## 3. Example Production `.env`

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://domainattacksurface.io

# PostgreSQL persistence
DATABASE_URL=postgres://dass_app:vErYsEcReTpAsSwOrD@db.prod.internal:5432/dass_production?sslmode=require

# Session security
SESSION_SECRET=e7418b958c89b7f52077e6f3aa522be2208ca58b68832a829e1dbfeadcf12891

# Quotas
ANONYMOUS_SCAN_LIMIT=5
REGISTERED_SCAN_LIMIT=50
SCAN_LIMIT_WINDOW_MS=3600000

# Limits
SCAN_TIMEOUT_MS=120000
MAX_CONCURRENT_SCANS=4
MAX_SUBDOMAINS=250
MAX_ASSETS=600

# Passive Intelligence
IP_INTELLIGENCE_ENABLED=true
IP_INTELLIGENCE_URL=https://ipapi.co/{ip}/json/
IP_INTELLIGENCE_TIMEOUT_MS=5000
```
