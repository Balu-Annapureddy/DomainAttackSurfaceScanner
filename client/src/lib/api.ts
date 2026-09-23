// ─── ReconLab API Client ──────────────────────────────────────────────────────

const API_BASE = '/api';

function adminHeaders(): HeadersInit {
  const credentials = sessionStorage.getItem('reconlab_admin_credentials');
  return credentials ? { Authorization: `Basic ${credentials}` } : {};
}

export function setAdminCredentials(username: string, password: string): void {
  sessionStorage.setItem('reconlab_admin_credentials', btoa(`${username}:${password}`));
}

export function clearAdminCredentials(): void {
  sessionStorage.removeItem('reconlab_admin_credentials');
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function getStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: adminHeaders() });
  if (res.status === 401) throw new Error('Admin authentication required');
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json() as Promise<{ activeUrls: number; visitors: number; visits: number; expiringSoon: number }>;
}

export async function getAuditEvents() {
  const res = await fetch(`${API_BASE}/admin/audit`, { headers: adminHeaders() });
  if (!res.ok) throw new Error('Failed to load audit log');
  return res.json() as Promise<Array<{ id: string; action: string; demoRef: string | null; timestamp: string }>>;
}

export async function createUrl(formData: FormData) {
  const res = await fetch(`${API_BASE}/admin/urls`, {
    method: 'POST',
    body: formData,
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create URL');
  }
  return res.json();
}

export async function listUrls() {
  const res = await fetch(`${API_BASE}/admin/urls`, { headers: adminHeaders() });
  if (!res.ok) throw new Error('Failed to list URLs');
  return res.json();
}

export async function getUrlDetail(id: string) {
  const res = await fetch(`${API_BASE}/admin/urls/${id}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error('Failed to get URL detail');
  return res.json();
}

export async function terminateUrl(id: string) {
  const res = await fetch(`${API_BASE}/admin/urls/${id}/terminate`, { method: 'POST', headers: adminHeaders() });
  if (!res.ok) throw new Error('Failed to terminate URL');
  return res.json();
}

export async function exportCsv(id: string, includePractice = false): Promise<string> {
  const query = includePractice ? '?includePractice=true' : '';
  const res = await fetch(`${API_BASE}/admin/urls/${id}/csv${query}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error('CSV export unavailable');
  return res.text();
}

export function getCapturedPhotoUrl(id: string): string {
  return `${API_BASE}/admin/urls/${id}/photo`;
}

export function getCapturedVideoUrl(id: string): string {
  return `${API_BASE}/admin/urls/${id}/video`;
}

export function getCapturedAudioUrl(id: string): string {
  return `${API_BASE}/admin/urls/${id}/audio`;
}

// ─── Visitor API ──────────────────────────────────────────────────────────────

export async function getVisitorSession(token: string) {
  const res = await fetch(`${API_BASE}/r/${token}`);
  if (res.status === 410) {
    const data = await res.json();
    throw new Error(data.error || 'Link ended');
  }
  if (!res.ok) throw new Error('Link not found');
  return res.json();
}

export async function recordVisit(token: string, browserInfo: object) {
  const res = await fetch(`${API_BASE}/r/${token}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(browserInfo),
  });
  return res.ok;
}

export async function submitLocation(token: string, location: { latitude: number; longitude: number; accuracy: number }) {
  const res = await fetch(`${API_BASE}/r/${token}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
  if (!res.ok) throw new Error('Failed to submit location');
  return res.json();
}

export async function updatePermission(token: string, permission: string, status: string) {
  const res = await fetch(`${API_BASE}/r/${token}/permission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permission, status }),
  });
  return res.ok;
}

export async function uploadPhoto(token: string, blob: Blob) {
  const formData = new FormData();
  formData.append('photo', blob, 'photo.jpg');
  const res = await fetch(`${API_BASE}/r/${token}/photo`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}

export async function uploadVideo(token: string, blob: Blob) {
  const formData = new FormData();
  formData.append('video', blob, 'video.webm');
  const res = await fetch(`${API_BASE}/r/${token}/video`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload video');
  return res.json();
}

export async function uploadAudio(token: string, blob: Blob) {
  const formData = new FormData();
  formData.append('audio', blob, 'audio.webm');
  const res = await fetch(`${API_BASE}/r/${token}/audio`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload audio');
  return res.json();
}
