// ─── Server & Shared Types ───────────────────────────────────────────────────

export type DemoStatus = 'active' | 'visited' | 'expired' | 'terminated';
export type MediaType = 'image' | 'pdf' | 'video';
export type PermissionStatus = 'not_requested' | 'granted' | 'denied' | 'unavailable';

// ─── Geo Information (IP-based) ───────────────────────────────────────────────
export interface GeoInfo {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
}

// ─── Network / Request Info ───────────────────────────────────────────────────
export interface NetworkInfo {
  ipAddress: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  platform: string;
  deviceCategory: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  referrer: string | null;
  timestamp: string;
  // HTTP headers
  accept: string | null;
  acceptLanguage: string | null;
  acceptEncoding: string | null;
  origin: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  secFetchDest: string | null;
  uaClientHint: string | null;
}

// ─── Browser Environment Info (client-collected) ──────────────────────────────
export interface BrowserInfo {
  screenWidth: number;
  screenHeight: number;
  availScreenWidth: number;
  availScreenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  language: string;
  languages: string[];
  timezone: string;
  colorDepth: number;
  cookiesEnabled: boolean;
  doNotTrack: boolean | null;
  touchSupport: boolean;
  connectionType?: string;
}

// ─── GPS Location (browser Geolocation API) ───────────────────────────────────
export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

// ─── Main Session Object ──────────────────────────────────────────────────────
export interface DemoSession {
  demoId: string;
  createdAt: string;
  expiresAt: string;
  status: DemoStatus;
  mediaType: MediaType;
  // Content source: URL string (image/video) or null (PDF uses mediaId)
  contentUrl: string | null;
  mediaId: string | null;
  mediaFilename: string | null;
  // Theme
  theme: string;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
  // Visit tracking
  visitCount: number;
  visitedAt: string | null;    // first visit timestamp
  lastVisitAt: string | null;  // most recent visit timestamp
  // Collected information
  networkInfo: NetworkInfo | null;
  browserInfo: BrowserInfo | null;
  geoInfo: GeoInfo | null;
  location: LocationInfo | null;
  // Permission states
  locationPermission: PermissionStatus;
  cameraPermission: PermissionStatus;
  microphonePermission: PermissionStatus;
  // Captured media references
  capturedPhotoRef: string | null;
  capturedVideoRef: string | null;
  capturedAudioRef: string | null;
  // Meta
  lastActivityAt: string | null;
  durationHours: number;
}

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface CreateUrlRequest {
  mediaType: MediaType;
  contentUrl?: string;
  durationHours: number;
  theme: string;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
}

export interface CreateUrlResponse {
  demoId: string;
  visitorUrl: string;
  expiresAt: string;
  status: DemoStatus;
}

export interface DemoListItem {
  demoId: string;
  mediaType: MediaType;
  mediaFilename: string | null;
  contentUrl: string | null;
  theme: string;
  themeLabel: string;
  themeEmoji: string;
  themeCaption: string;
  themeLinkText: string;
  createdAt: string;
  expiresAt: string;
  status: DemoStatus;
  visitCount: number;
  durationHours: number;
}

export interface VisitorPageInfo {
  demoId: string;
  expiresAt: string;
  status: DemoStatus;
  mediaType: MediaType;
  contentUrl: string | null;  // for image/video URL
  mediaUrl: string | null;    // for PDF file (/api/r/:token/media)
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
}

export interface LocationRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface PermissionUpdateRequest {
  permission: 'camera' | 'microphone' | 'location';
  status: PermissionStatus;
}

export interface ApiError {
  error: string;
  code: string;
}
