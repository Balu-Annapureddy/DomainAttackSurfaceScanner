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

The result store is in memory and has a 24-hour TTL. Use a shared database or cache when
deploying multiple server instances.
