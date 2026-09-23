// ─── ReconLab Shared Types ───────────────────────────────────────────────────
// Shared data structures between server and client

export type DemoStatus = 'active' | 'visited' | 'expired' | 'terminated';
export type MediaType = 'image' | 'pdf' | 'video';
export type PermissionStatus = 'not_requested' | 'granted' | 'denied' | 'unavailable';
export type GeoStatus = 'available' | 'localhost' | 'private' | 'unavailable' | 'failed';

// ─── Geo Information (IP-based) ───────────────────────────────────────────────
export interface GeoInfo {
  ip: string;
  ipVersion: 'IPv4' | 'IPv6' | 'unknown';
  status: GeoStatus;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  provider: string;
  lookupTimestamp: string;
  note: string;
}

// ─── Network / Request Info (Server-observed) ──────────────────────────────────
export interface NetworkInfo {
  ipAddress: string;
  ipVersion?: 'IPv4' | 'IPv6' | 'unknown';
  isLocalhostOrPrivate?: boolean;
  userAgent: string;
  browser: string;
  browserVersion: string;
  engine?: string | null;
  os: string;
  osVersion: string;
  platform: string;
  deviceCategory: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  referrer: string | null;
  timestamp: string;
  accept: string | null;
  acceptLanguage: string | null;
  acceptEncoding: string | null;
  origin: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  secFetchDest: string | null;
  uaClientHint: string | null;
  secChUaPlatform?: string | null;
  secChUaMobile?: string | null;
}

// ─── Browser Environment Info (Client-collected) ──────────────────────────────
export interface BrowserInfo {
  screenWidth: number;
  screenHeight: number;
  availScreenWidth: number;
  availScreenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  pixelDepth: number | null;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number | null;
  cookiesEnabled: boolean;
  doNotTrack: boolean | null;
  touchSupport: boolean;
  maxTouchPoints: number | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  online: boolean | null;
  connectionType?: string | null;
  effectiveConnectionType?: string | null;
  downlink?: number | null;
  rtt?: number | null;
  saveData?: boolean | null;
}

// ─── GPS Location (Browser Geolocation API) ───────────────────────────────────
export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: string;
}

// ─── Timeline Events ──────────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  type:
    | 'visit_received'
    | 'content_requested'
    | 'telemetry_received'
    | 'gps_received'
    | 'photo_captured'
    | 'video_started'
    | 'video_completed'
    | 'audio_started'
    | 'audio_completed'
    | 'permission_denied'
    | 'permission_unavailable'
    | 'session_terminated';
  timestamp: string;
  metadata?: Record<string, any>;
}

// ─── Media Metadata ───────────────────────────────────────────────────────────
export interface MediaItemMetadata {
  ref: string;
  timestamp: string;
  mimeType: string;
  fileSize: number;
  durationSeconds?: number;
}

export interface MediaMetadata {
  photo: MediaItemMetadata | null;
  video: MediaItemMetadata | null;
  audio: MediaItemMetadata | null;
}

// ─── Main Session Object ──────────────────────────────────────────────────────
export interface DemoSession {
  demoId: string;
  createdAt: string;
  expiresAt: string;
  status: DemoStatus;
  mediaType: MediaType;
  contentUrl: string | null;
  mediaId: string | null;
  mediaFilename: string | null;
  theme: string;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
  visitCount: number;
  visitedAt: string | null;
  lastVisitAt: string | null;
  networkInfo: NetworkInfo | null;
  browserInfo: BrowserInfo | null;
  geoInfo: GeoInfo | null;
  location: LocationInfo | null;
  locationPermission: PermissionStatus;
  cameraPermission: PermissionStatus;
  microphonePermission: PermissionStatus;
  capturedPhotoRef: string | null;
  capturedVideoRef: string | null;
  capturedAudioRef: string | null;
  mediaMetadata: MediaMetadata;
  timeline: TimelineEvent[];
  lastActivityAt: string | null;
  durationHours: number;
}

// ─── Structured Detail View for API ───────────────────────────────────────────
export interface StructuredSessionDetail {
  session: {
    demoId: string;
    createdAt: string;
    expiresAt: string;
    status: DemoStatus;
    mediaType: MediaType;
    contentUrl: string | null;
    mediaFilename: string | null;
    theme: string;
    themeLabel: string;
    themeCaption: string;
    themeLinkText: string;
    themeEmoji: string;
    visitCount: number;
    visitedAt: string | null;
    lastVisitAt: string | null;
    durationHours: number;
  };
  location: {
    ip: GeoInfo | null;
    gps: LocationInfo | null;
  };
  browser: {
    name: string | null;
    version: string | null;
    engine: string | null;
    userAgent: string | null;
    language: string | null;
    languages: string[] | null;
    cookiesEnabled: boolean | null;
    doNotTrack: boolean | null;
  };
  device: {
    category: string | null;
    platform: string | null;
    os: string | null;
    osVersion: string | null;
    cores: number | null;
    memoryGb: number | null;
    touchSupport: boolean | null;
    maxTouchPoints: number | null;
  };
  display: {
    screenWidth: number | null;
    screenHeight: number | null;
    availScreenWidth: number | null;
    availScreenHeight: number | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    devicePixelRatio: number | null;
    colorDepth: number | null;
    pixelDepth: number | null;
  };
  network: {
    ipAddress: string | null;
    ipVersion: string | null;
    isLocalhostOrPrivate: boolean | null;
    connectionType: string | null;
    effectiveConnectionType: string | null;
    downlink: number | null;
    rtt: number | null;
    saveData: boolean | null;
    online: boolean | null;
  };
  headers: {
    accept: string | null;
    acceptLanguage: string | null;
    acceptEncoding: string | null;
    origin: string | null;
    referer: string | null;
    secFetchSite: string | null;
    secFetchMode: string | null;
    secFetchDest: string | null;
    uaClientHint: string | null;
    secChUaPlatform: string | null;
    secChUaMobile: string | null;
  };
  permissions: {
    camera: PermissionStatus;
    microphone: PermissionStatus;
    location: PermissionStatus;
  };
  media: MediaMetadata;
  timeline: TimelineEvent[];
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
  contentUrl: string | null;
  mediaUrl: string | null;
  themeLabel: string;
  themeCaption: string;
  themeLinkText: string;
  themeEmoji: string;
}

export interface LocationRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: string;
}

export interface PermissionUpdateRequest {
  permission: 'camera' | 'microphone' | 'location';
  status: PermissionStatus;
}

export interface ApiError {
  error: string;
  code: string;
}
