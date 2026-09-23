# Deployment

Build the application with:

```bash
npm run build
```

The compiled server is started with:

```bash
npm run start --workspace=server
```

Set `NODE_ENV=production` and configure `CLIENT_ORIGIN` to the deployed client origin. Put the
server behind HTTPS in production so the dashboard and API share a trusted origin.

## Scan rate limiting

Scan creation is protected by an environment-configurable limiter:

- `SCAN_RATE_LIMIT_MAX` sets the maximum requests allowed in the window.
- `SCAN_RATE_LIMIT_WINDOW_MS` sets the window duration in milliseconds.

When these variables are omitted, non-production environments allow 100 scan requests per
15 minutes (`100` and `900000`) to support local testing. Production uses the stricter default
of 10 requests per hour (`10` and `3600000`). Set both variables explicitly when deploying with
a different traffic profile.

The result store is in memory and has a 24-hour TTL. Use a shared database or cache when
deploying multiple server instances.
