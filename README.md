# ReconLab 🧪

> **Cybersecurity Classroom Information-Gathering & Permission Demonstration Application**

ReconLab is an educational cybersecurity demonstration platform built for classroom and workshop settings. It illustrates the real-world boundaries between **passive browser fingerprinting** (data sent automatically via HTTP headers and standard JavaScript environment variables) and **active browser permission models** (Geolocation, Camera, Microphone) governed by the W3C Permissions API.

---

## ⚠️ Educational Scope & Security Guarantee

ReconLab is strictly designed for **voluntary, informed, classroom demonstrations**:
- **No Exploits or Bypasses**: Standard browser security models and permission prompts are respected at all times.
- **Explicit Consent**: Participants are greeted with a clear consent screen explaining what will happen and why.
- **Voluntary Testing**: Participants individually trigger permission requests (GPS, Camera, Microphone) and countdown captures.
- **Safe & Non-Persistent**: All sessions are stored in-memory with automatic TTL expiration (default 30 minutes). No permanent tracking, cookies, or cross-site tracking.
- **Manual Termination**: Administrators can terminate any active demonstration session instantly from the dashboard.

---

## 🌟 Key Features

### 👨‍🏫 Instructor / Admin Dashboard (`/admin`)
- **Secure Authentication**: Protected via HTTP Basic Auth (configurable via environment variables).
- **Demo Link Generation**: Generate time-limited demonstration URLs bound to custom decoy media (Image, PDF, or Video).
- **Real-Time Participant Monitoring**:
  - **Passive Reconnaissance**: Remote IP, User-Agent, Browser name & version, Operating System & version, Device Category (desktop/mobile/tablet), Screen Resolution & Color Depth, Language, Timezone, Cookies Enabled, Do Not Track (DNT) preference.
  - **Active Permission Auditing**: Real-time tracking of Geolocation, Camera, and Microphone permission states (`not_requested`, `granted`, `denied`, `unavailable`).
  - **Voluntary Media Capture Inspection**: View captured participant snapshots, audio notes, or video clips submitted during the interactive exercise.
- **Export & Cleanup**:
  - Export classroom reconnaissance data directly to CSV with full RFC 4180 escaping.
  - One-click session termination with immediate media disk cleanup.

### 🧑‍🎓 Participant Demonstration View (`/d/:demoId`)
- **Informed Consent Gate**: Explains the demonstration and requests confirmation before proceeding.
- **Decoy Presentation**: Displays the instructor's selected media (e.g., cybersecurity infographic, sample research report, or demonstration clip).
- **Interactive Permission Playground**:
  - **Location Request**: Queries the Geolocation API and displays reported coordinates and accuracy radius.
  - **Photo Capture**: 3-second visual countdown before snapshot capture via HTML5 Canvas.
  - **Video Capture**: 3-second recording via standard `MediaRecorder` API.
  - **Audio Capture**: 3-second audio recording via `MediaRecorder` API.
  - Camera/Mic streams are immediately closed upon completion to turn off device hardware indicators.

---

## 🛠️ Architecture & Tech Stack

```text
ReconLab/
├── client/              # React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── pages/       # AdminDashboard, ParticipantPage
│   │   ├── lib/         # API Client & auth helpers
│   │   └── index.css    # Modern cybersecurity dark theme styling
├── server/              # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/      # /api/admin & /api/d routers
│   │   ├── services/    # sessionStore, mediaStore, csvExport
│   │   ├── middleware/  # adminAuth, rateLimiter, errorHandling
│   │   ├── utils/       # user-agent parser, IP resolver
│   │   └── types/       # Shared domain types & DTOs
├── shared/              # Monorepo shared types
└── docs/                # Architectural, Security, Testing & Deployment manuals
```

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router 7, Lucide React icons.
- **Backend**: Express 4, TypeScript, Helmet security headers, Express Rate Limit, Multer (file upload), ua-parser-js, nanoid.
- **Testing**: Jest 29, ts-jest, Supertest.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository and install root dependencies**:
   ```bash
   cd ReconLab
   npm install
   ```

2. **Install client and server dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Default credentials:
   - Port: `3001` (Backend) / `5173` (Vite Frontend)
   - Admin Username: `admin`
   - Admin Password: `changeme123`

4. **Run in Development Mode**:
   ```bash
   npm run dev
   ```
   This runs both the Express backend and the Vite frontend concurrently.
   - Admin Dashboard: [http://localhost:5173/admin](http://localhost:5173/admin)
   - API Backend: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Running Automated Tests

ReconLab includes unit and integration tests covering the session state store, API security, input validation, permission tracking, and CSV export.

```bash
# Run server test suites
npm test

# Run build checks across entire monorepo
npm run build
```

---

## 📚 Documentation Directory

Detailed project documentation is available in the [`docs/`](./docs) folder:
- [Architecture Guide](./docs/ARCHITECTURE.md) — System design, data flow diagrams, and state management.
- [Security Model & Safeguards](./docs/SECURITY.md) — Ethical boundaries, permissions handling, and mitigation of abuse.
- [Testing Guide](./docs/TESTING.md) — Test suites, edge cases, and automated test coverage.
- [Deployment Guide](./docs/DEPLOYMENT.md) — Production build, reverse proxy (Nginx/Caddy), HTTPS setup, and Docker recommendations.
- [Development Log](./docs/DEVELOPMENT_LOG.md) — Append-only chronological changelog of implementations.

---

## 📄 License
Educational Use Only — Designed strictly for accredited cybersecurity training and educational presentations.
