# 🔬 ReconLab — Technical & Architectural Report

---

## 1. Executive Summary

**ReconLab** is an educational, classroom-ready cybersecurity demonstration web application. Its primary objective is to visually and interactively teach students the fundamental difference between:

1. **Passive Browser/Network Reconnaissance**: Information automatically revealed by standard HTTP requests and client-side JavaScript runtime environments (IP address, user-agent, operating system, screen dimensions, timezone, language, cookie capabilities, Do Not Track flags).
2. **Active W3C Hardware/Permission Demonstrations**: Sensitive device capabilities (high-accuracy GPS Geolocation, Camera snapshots/video, Microphone audio recording) that require **explicit, informed user consent** and native browser permission approvals.

Authentication, sign-up, and login gates have been **completely removed**. Anyone navigating to the root URL immediately accesses the Instructor/Demonstration Dashboard without entering credentials.

---

## 2. Technology Stack & Libraries

### Frontend (`client/`)
| Technology | Version / Tool | Purpose |
|---|---|---|
| **React** | `19.2.8` | Modern declarative UI component architecture |
| **Vite** | `8.3.0` | Ultra-fast local development server and optimized ES production bundler |
| **TypeScript** | `5.x / 6.x` | Strict type safety across client state and API payloads |
| **Tailwind CSS** | `v4` | Contemporary design styling with custom cybersecurity dark-mode design system |
| **React Router** | `7.18.4` | Client-side SPA routing (`/`, `/admin`, `/d/:demoId`) |
| **Lucide React** | `^1.47.0` | Visual icon indicators for permissions, telemetry, media, and hardware state |

### Backend (`server/`)
| Technology | Package | Purpose |
|---|---|---|
| **Node.js + Express** | `4.18.3` | Lightweight, robust REST API server |
| **TypeScript** | `5.5.2` | Strong typing, DTO validation, and modular compilation |
| **Helmet** | `^7.1.0` | HTTP security headers (CSP, HSTS, frame protection) |
| **CORS** | `^2.8.5` | Cross-origin resource sharing controls |
| **express-rate-limit** | `^7.3.1` | DoS and brute-force mitigation on API endpoints |
| **Multer** | `^1.4.5` | Multipart form-data handling for decoy media uploads and participant snapshots |
| **file-type** | `^16.5.4` | Server-side magic-byte inspection to prevent MIME spoofing |
| **ua-parser-js** | `^1.0.38` | User-agent parsing for device category, browser, and OS detection |
| **nanoid** | `^3.3.7` | Cryptographically secure 16-character demo session token generation |

### Testing & Verification
- **Jest 29** & **ts-jest**: Automated unit and integration testing suite.
- **Supertest 7**: End-to-end HTTP endpoint simulation and status verification.

---

## 3. System Architecture & Directory Structure

```text
ReconLab/
├── package.json              # Monorepo root with npm workspaces & concurrently scripts
├── shared/
│   └── types/index.ts        # Common TypeScript interfaces & API contracts
├── server/
│   ├── src/
│   │   ├── index.ts          # Express entrypoint, middleware, static hosting
│   │   ├── config.ts         # Environment configuration (ports, paths, TTLs)
│   │   ├── routes/
│   │   │   ├── admin.ts      # /api/admin: create demos, inspect telemetry, export CSV, terminate
│   │   │   └── demo.ts       # /api/d: participant info, consent, location, capture uploads
│   │   ├── services/
│   │   │   ├── sessionStore.ts # In-memory session state store with TTL cleanup
│   │   │   ├── mediaStore.ts   # Decoy and captured file storage with traversal protection
│   │   │   └── csvExport.ts    # RFC 4180 CSV export generator
│   │   ├── middleware/
│   │   │   ├── auth.ts       # Open access middleware (logins disabled)
│   │   │   ├── security.ts   # Helmet, CORS, and rate limiting
│   │   │   └── upload.ts     # Multer file validation rules
│   │   ├── utils/
│   │   │   └── parseRequest.ts # Request parsing (IP extraction & UA parsing)
│   │   └── __tests__/        # 29 automated unit & integration test suites
├── client/
│   ├── src/
│   │   ├── main.tsx          # React application router
│   │   ├── index.css         # Cybersecurity dark theme, tokens, animations
│   │   ├── lib/api.ts        # Client API SDK
│   │   └── pages/
│   │       ├── AdminDashboard.tsx   # Instructor creation, monitoring & telemetry review
│   │       └── ParticipantPage.tsx  # Informed consent gate & interactive permission lab
└── docs/                     # Full system documentation suite
```

---

## 4. How ReconLab Works (End-to-End Workflow)

### Stage 1: Demonstration Creation (Instructor / Admin)
1. The instructor opens `http://localhost:5173/` (or `/admin`).
2. Without needing any login, the instructor clicks **Create Demonstration**:
   - Selects decoy media type: **Image** (PNG, JPEG, WebP), **PDF Document**, or **Video** (MP4, WebM).
   - Uploads an educational file (e.g., sample cybersecurity diagram, training PDF, or demo clip).
   - Selects session duration (e.g., 5 minutes for quick class test, or 1 to 24 hours).
3. The server generates a unique, unguessable 16-character identifier (e.g., `http://localhost:5173/d/x7K9pL2m...`).
4. The instructor copies this link or displays a QR code to students/participants.

### Stage 2: Informed Consent Gate (Participant)
1. The participant opens the demonstration URL on their laptop, tablet, or smartphone.
2. Before anything sensitive can happen, the **Informed Consent Gate** is presented:
   - Displays clear educational disclaimers explaining the exercise.
   - Summarizes what information is passive vs. what requires active permission.
   - The participant must explicitly click **"I Understand & Begin Demonstration"**.

### Stage 3: Passive Telemetry Gathering
Immediately upon participant consent:
- **Server-Side Extraction**:
  - Client IP address (handles `X-Forwarded-For` proxy headers).
  - User-Agent parsing reveals browser family (e.g., Chrome, Firefox, Safari), browser version, operating system (Windows, macOS, Android, iOS), and device category (desktop, mobile, tablet).
- **Client-Side Extraction**:
  - Screen dimensions (`window.screen.width` × `window.screen.height`).
  - Color depth (`window.screen.colorDepth`).
  - Browser language (`navigator.language`).
  - System Timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
  - Cookie status and Do Not Track (`navigator.doNotTrack`) flag.
- The participant view automatically renders the instructor's uploaded decoy media.

### Stage 4: Active Permission Demonstrations (Voluntary)
The participant page provides distinct interactive testing cards:

1. **Geolocation (GPS / Wi-Fi Positioning)**:
   - Only triggered when participant clicks **"Share Location"**.
   - Invokes standard `navigator.geolocation.getCurrentPosition()`.
   - Browser displays native prompt: *"Allow ReconLab to access your location?"*
   - If granted: displays exact latitude, longitude, and accuracy radius on-screen and syncs with instructor.
   - If denied: updates dashboard status to `denied` without error crashes.

2. **Photo Snapshot Capture**:
   - Only triggered when participant clicks **"Take Photo"**.
   - Requests camera access via `navigator.mediaDevices.getUserMedia({ video: true })`.
   - Displays a live video preview with a **3-second visual countdown** (3... 2... 1...).
   - Captures snapshot to HTML5 Canvas, immediately stops all camera tracks (hardware LED turns off), and uploads the image.

3. **Short Video Capture**:
   - Triggers camera and records a 3-second clip using `MediaRecorder`.
   - Automatically shuts down hardware streams when recording finishes.

4. **Audio Note Capture**:
   - Requests microphone access via `getUserMedia({ audio: true })`.
   - Records a 3-second audio sample via `MediaRecorder` and shuts down mic stream.

### Stage 5: Live Instructor Monitoring & Data Export
1. On the Admin Dashboard, the active session automatically reflects real-time status updates every 5 seconds.
2. Clicking **View Telemetry** opens an inspection modal showing:
   - Complete network and browser fingerprint breakdown.
   - Real-time permission matrix badges (`granted`, `denied`, `not_requested`).
   - Recorded GPS coordinates and accuracy.
   - Embedded previews of voluntarily captured photo, video, or audio evidence.
3. **Export to CSV**: Download an RFC 4180 compliant CSV file containing all classroom telemetry columns for lab grading or class discussion.
4. **Session Termination**: Instantly destroys the session and deletes uploaded participant media from disk.

---

## 5. Security & Privacy Safeguards Built-In

1. **Zero Browser Exploitation**:
   - No stealth permission bypasses.
   - No browser fingerprinting hacks (no canvas font scraping, no WebGL hashing, no battery API scraping).
   - Only standard, documented W3C APIs are utilized.

2. **Hardware Stream Lifecycle Management**:
   - Camera and microphone media streams (`MediaStreamTrack`) are explicitly stopped via `.stop()` immediately after the 3-second capture completes, ensuring hardware indicators (green/orange camera dots) turn off.

3. **Ephemeral In-Memory Storage**:
   - No persistent database. All session records exist only in RAM.
   - Background cleanup job automatically purges expired sessions and deletes orphaned media files.

4. **Directory Traversal Protection**:
   - File uploads and retrieval sanitize filenames using `path.basename` and resolve paths strictly against the designated storage root.

---

## 6. Current Status & How to Run

Both frontend and backend are compiled and running on your machine:
- **Admin Dashboard**: [http://localhost:5173/](http://localhost:5173/) (or `http://localhost:5173/admin`)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Logins / Credentials**: **None required**. Access is direct and immediate.
- **Automated Tests**: **29/29 Passing**. Run anytime using `npm test`.
