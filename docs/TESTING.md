# ReconLab Testing

## Setup

```bash
# Install all dependencies
npm install
cd server && npm install
cd ../client && npm install
```

## Automated Tests

```bash
# Run server tests
cd server
npm test
```

### Test Suites

#### Session Lifecycle (`__tests__/session.test.ts`)
- Create demo session
- Valid token retrieval
- Invalid token returns undefined
- Expired token is not usable
- Terminated token is not usable
- Session lifetime validation
- List all sessions

#### Session Handling
- Visitor session creation (mark visited)
- Location update
- Permission updates (camera, microphone, location)
- Photo reference storage
- Session expiration cleanup
- Termination cleanup removes data

#### CSV Generation
- Valid CSV generation with correct headers
- Proper escaping of commas, quotes, newlines
- CSV unavailable after termination

#### API Integration (`__tests__/api.test.ts`)
- POST /api/admin/demos — create with file
- POST /api/admin/demos — reject without file
- POST /api/admin/demos — reject invalid media type
- GET /api/admin/demos — list demos
- POST /api/admin/demos/:id/terminate
- GET /api/admin/demos/:id — not found
- GET /api/d/:token — valid token
- GET /api/d/:token — invalid token
- GET /api/d/:token — terminated token
- POST /api/d/:token/start
- POST /api/d/:token/location
- POST /api/d/:token/location — invalid data
- POST /api/d/:token/permission

## Manual Testing

### Two-Browser Test

1. **Browser A** — Open `http://localhost:5173/` → Login → Admin Dashboard
2. **Browser B** — Open the generated participant URL

### Test Checklist

- [ ] Generate demo with image upload
- [ ] Generate demo with PDF upload
- [ ] Generate demo with video upload
- [ ] Copy participant URL
- [ ] Open URL in Browser B
- [ ] Verify consent page shows
- [ ] Verify media preview displays
- [ ] Click "Start Demonstration"
- [ ] Verify admin dashboard shows "visited" status
- [ ] Test location — grant permission
- [ ] Test location — deny permission
- [ ] Test camera photo capture
- [ ] Test 5-second video recording
- [ ] Test 5-second audio recording
- [ ] Export CSV from admin
- [ ] Verify CSV contains collected data
- [ ] Terminate demo from admin
- [ ] Refresh participant URL — confirm "ended" message
- [ ] Create a 1-minute demo, wait, confirm auto-expiry

### Browser Permission Testing

Camera/microphone/location tests require:
- HTTPS or localhost (secure context)
- User interaction (click) before permission request
- Cannot automate browser permission dialogs in unit tests

Permission states tested through the API:
- `not_requested` → default
- `granted` → after successful permission + data submission
- `denied` → after permission denial + status update
- `unavailable` → when API not available (e.g., no geolocation)

### Expiration Testing

Set `ENABLE_SHORT_DURATIONS=true` in `.env` to enable:
- 1 minute
- 5 minutes
- 10 minutes

These short durations allow testing expiration without waiting hours.
