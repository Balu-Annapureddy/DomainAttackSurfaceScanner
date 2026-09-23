# ReconLab Architecture

## Overview

ReconLab is a two-sided cybersecurity classroom demonstration application:
- **Admin side** — create demos, monitor sessions, export data, terminate
- **Participant side** — view media, consent, grant/deny browser permissions

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Storage | In-memory (Map) + local filesystem for uploads |
| Auth | HTTP Basic Auth via env credentials |

## Project Structure

```
ReconLab/
├── client/           # React SPA
│   └── src/
│       ├── pages/          # LoginPage, AdminDashboard, ParticipantPage
│       ├── lib/api.ts      # API client
│       └── index.css       # Dark cybersecurity theme
├── server/           # Express API
│   └── src/
│       ├── routes/         # admin.ts, demo.ts
│       ├── services/       # sessionStore.ts, mediaStore.ts, csvExport.ts
│       ├── middleware/      # auth.ts, security.ts, upload.ts
│       ├── utils/          # parseRequest.ts
│       └── index.ts        # Entry point
├── shared/           # Shared TypeScript types
│   └── types/index.ts
└── docs/             # Documentation
```

## Data Flow

1. Admin creates demo → server generates 16-char nanoid token, stores session in memory
2. Admin uploads media → multer receives file, mediaStore writes to `./uploads/`
3. Admin shares participant URL `/d/:demoId`
4. Participant opens URL → frontend fetches demo info via `GET /api/d/:token`
5. Participant clicks "Start" → `POST /api/d/:token/start` sends browser info, server records IP/UA
6. Participant grants permissions → individual `POST` endpoints for location/photo/video/audio
7. Admin dashboard polls `GET /api/admin/demos` every 5 seconds
8. Admin views detail via `GET /api/admin/demos/:id`

## Session Lifecycle

```
Active → Visited → Expired (automatic)
                 → Terminated (manual)
```

- Server-side cleanup runs every 60 seconds
- Expired sessions have visitor data nullified and files deleted
- Terminated sessions are immediately invalidated

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/admin/demos | Admin | Create demo |
| GET | /api/admin/demos | Admin | List demos |
| GET | /api/admin/demos/:id | Admin | Get detail |
| POST | /api/admin/demos/:id/terminate | Admin | Terminate |
| GET | /api/admin/demos/:id/csv | Admin | Export CSV |
| GET | /api/d/:token | Public | Get demo info |
| GET | /api/d/:token/media | Public | Serve media |
| POST | /api/d/:token/start | Public | Start demo |
| POST | /api/d/:token/location | Public | Submit location |
| POST | /api/d/:token/permission | Public | Update permission |
| POST | /api/d/:token/photo | Public | Upload photo |
| POST | /api/d/:token/video | Public | Upload video |
| POST | /api/d/:token/audio | Public | Upload audio |
| POST | /api/d/:token/activity | Public | Heartbeat |

## Storage Abstraction

`mediaStore.ts` exposes a `StorageProvider` interface:
- `save(filename, buffer)` → returns ID
- `get(id)` → returns Buffer
- `getPath(id)` → returns filesystem path
- `remove(id)` → deletes file

Current implementation: `LocalStorage` (filesystem). Can be replaced with S3/GCS for production.
