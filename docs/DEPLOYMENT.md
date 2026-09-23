# ReconLab Deployment

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | none | Required unique admin password; production rejects placeholders |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `MAX_FILE_SIZE_MB` | `50` | Max upload size |
| `ENABLE_SHORT_DURATIONS` | `true` | Allow 1m/5m/10m durations |
| `UPLOAD_DIR` | `./uploads` | Temporary file storage path |
| `CLEANUP_INTERVAL_MS` | `60000` | Cleanup job interval |
| `GEO_ENABLED` | `true` | Enable IP-derived approximate location lookups |
| `GEO_PROVIDER_URL` | `https://ipapi.co/{ip}/json/` | IP geo provider URL containing `{ip}` |
| `GEO_API_KEY` | empty | Optional provider API key |
| `GEO_TIMEOUT_MS` | `3000` | IP geo request timeout |

## Build

```bash
npm install
cd server && npm install && npm run build
cd ../client && npm install && npm run build
```

The server serves the client's `dist/` folder in production mode.

## HTTPS Requirement

**HTTPS is mandatory in production.** Browser APIs for camera, microphone, and geolocation require a secure context. Without HTTPS, these features will be unavailable.

## Temporary Filesystem

The application stores uploads and captured media in the local filesystem (`./uploads/`). In production environments where the filesystem is ephemeral (e.g., containers, serverless):

- Use a temporary object storage service (S3, GCS)
- Swap the `LocalStorage` class in `mediaStore.ts` for your cloud storage implementation
- The `StorageProvider` interface makes this straightforward

## Production Considerations

1. **Set unique admin credentials** — production refuses missing or placeholder passwords
2. **Use a proper auth system** — OAuth2, SSO, or session-based auth
3. **Set `NODE_ENV=production`**
4. **Set `ENABLE_SHORT_DURATIONS=false`**
5. **Configure CORS** — set `CLIENT_ORIGIN` to your actual domain
6. **Use a process manager** — PM2, systemd, or container orchestration
7. **Add HTTPS** — via reverse proxy (nginx), load balancer, or platform (Vercel, Railway)
8. **Monitor memory** — in-memory sessions are cleared by restart/crash and do not scale across instances; implement max session limits or a durable store only if the retention model changes
9. **Infrastructure logs** — hosting providers maintain their own access logs

## Recommended Deployment

### Simple VPS (DigitalOcean, Linode, etc.)
1. Clone repo, install deps, build
2. Use PM2 to run `node server/dist/server/src/index.js`
3. Use nginx as reverse proxy with SSL (Let's Encrypt)
4. Set env vars in `/etc/environment` or PM2 ecosystem file

### Container (Docker)
1. Multi-stage Dockerfile: build client + server, then run
2. Mount a volume for `./uploads/` if persistence is needed
3. Use docker-compose with env file

### Platform (Railway, Render, Fly.io)
1. Set env vars in platform dashboard
2. Build command: `npm run build`
3. Start command: `node server/dist/server/src/index.js`
4. Note: filesystem may be ephemeral — use external storage for uploads
