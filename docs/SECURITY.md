# ReconLab Security

## Purpose

ReconLab is an **educational** cybersecurity classroom tool. It demonstrates how browser/server information gathering works when a participant **voluntarily** visits a URL and **explicitly** grants browser permissions.

## Threat Model

### In-scope threats
- Unauthorized admin access
- Path traversal via file uploads
- Malicious file uploads (executable files)
- Session token guessing
- Data persistence beyond session lifetime
- Cross-site request forgery
- XSS via uploaded filenames

### Out-of-scope threats
- DDoS (use infrastructure-level protection)
- Server OS compromise
- Physical access attacks

## Privacy Principles

1. **Consent first** — Participant sees a clear explanation before starting
2. **Explicit permissions** — Camera, mic, location only requested on button click
3. **No hidden collection** — No tracking pixels, fingerprinting, or silent activation
4. **Temporary data** — All visitor data deleted on session expiry/termination
5. **Minimal collection** — Only what the classroom demo requires

## What Is NOT Collected

- Passwords or credentials
- Cookies from other sites
- Clipboard contents
- Local files
- Contacts or messages
- Browser history
- EXIF metadata
- Keystroke data

## Security Measures

### Authentication
- HTTP Basic Auth for admin routes
- Credentials from environment variables (never hardcoded)
- Production startup refuses missing or known-placeholder admin passwords.
- Authentication attempts use a dedicated stricter rate limit and constant-time credential comparison.
- Production should use a stronger auth mechanism (OAuth, SSO)

### Session Tokens
- 16-character nanoid (URL-safe, cryptographically random)
- ~95 bits of entropy — not guessable
- Tokens are the only sensitive URL component

### File Upload Security
- MIME type validation against allowlist
- File size limit (configurable, default 50MB)
- Filenames sanitized (non-alphanumeric replaced with `_`)
- Path traversal protection (resolved paths checked against upload dir)
- Files stored with timestamp-prefixed names
- Uploaded files are never executable

### HTTP Security Headers
- Helmet.js applies secure defaults
- CORS restricted to configured client origin
- X-Powered-By removed
- Cross-Origin-Resource-Policy set

### Rate Limiting
- General API: 100 requests/minute
- Demo participant endpoints: 30 requests/minute
- Admin authentication attempts: 10 requests/minute per IP

### Input Validation
- Media type validated against `image | pdf | video`
- Duration validated against allowed values
- Location data type-checked
- Permission values validated against enum
- CSV fields beginning with `=`, `+`, `-`, `@`, tab, or carriage return are prefixed before export to prevent spreadsheet formula injection.

## Temporary Data Model

- Sessions stored in-memory (Node.js Map)
- The in-memory session store does not survive a server restart or crash and cannot safely scale across multiple server instances. This is a documented classroom limitation, not durable storage.
- No database, no persistent storage of visitor data
- Cleanup job runs every 60 seconds
- Expired sessions: data nullified, files deleted
- Terminated sessions: immediately invalidated and cleaned
- Practice/rehearsal sessions contain simulated data and are excluded from CSV export unless explicitly requested.

## Deployment Security

- **HTTPS required** for production (camera/mic APIs require secure context)
- Environment variables for all secrets
- No secrets in frontend source code
- `.env` file gitignored
- Production should use proper secret management

## Infrastructure Logging

Hosting providers may maintain access logs outside the application's control. ReconLab does not claim "zero logs" for the deployment environment — only that the application itself does not persist visitor data beyond session lifetime.
