import { DemoSession } from '../types';

// ─── CSV Generation ───────────────────────────────────────────────────────────
// Properly escapes fields containing commas, quotes, newlines.

function escapeField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const str = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'url_id',
  'theme',
  'theme_label',
  'media_type',
  // Visit info
  'visit_count',
  'first_visit',
  'last_visit',
  'last_activity',
  // Network
  'ip_address',
  'browser',
  'browser_version',
  'operating_system',
  'os_version',
  'platform',
  'device_type',
  'user_agent',
  'referrer',
  // HTTP headers
  'accept_language',
  'accept_encoding',
  'sec_fetch_site',
  'sec_fetch_mode',
  'sec_fetch_dest',
  // Geo (IP-based)
  'geo_country',
  'geo_country_code',
  'geo_region',
  'geo_city',
  'geo_latitude',
  'geo_longitude',
  'geo_timezone',
  'geo_isp',
  'geo_org',
  'geo_asn',
  // Browser environment
  'screen_width',
  'screen_height',
  'avail_screen_width',
  'avail_screen_height',
  'viewport_width',
  'viewport_height',
  'device_pixel_ratio',
  'color_depth',
  'language',
  'languages',
  'timezone',
  'touch_support',
  'cookies_enabled',
  'do_not_track',
  'connection_type',
  // GPS location
  'location_permission',
  'gps_latitude',
  'gps_longitude',
  'gps_accuracy',
  'gps_timestamp',
  // Permissions
  'camera_permission',
  'microphone_permission',
  // Media refs (present/absent indicator)
  'has_photo',
  'has_video',
  'has_audio',
];

export function generateCsv(session: DemoSession): string {
  const n = session.networkInfo;
  const b = session.browserInfo;
  const l = session.location;
  const g = session.geoInfo;

  const row = [
    session.demoId,
    session.theme,
    session.themeLabel,
    session.mediaType,
    // Visit info
    session.visitCount,
    session.visitedAt ?? '',
    session.lastVisitAt ?? '',
    session.lastActivityAt ?? '',
    // Network
    n?.ipAddress ?? '',
    n?.browser ?? '',
    n?.browserVersion ?? '',
    n?.os ?? '',
    n?.osVersion ?? '',
    n?.platform ?? '',
    n?.deviceCategory ?? '',
    n?.userAgent ?? '',
    n?.referrer ?? '',
    // HTTP headers
    n?.acceptLanguage ?? '',
    n?.acceptEncoding ?? '',
    n?.secFetchSite ?? '',
    n?.secFetchMode ?? '',
    n?.secFetchDest ?? '',
    // Geo
    g?.country ?? '',
    g?.countryCode ?? '',
    g?.region ?? '',
    g?.city ?? '',
    g?.latitude ?? '',
    g?.longitude ?? '',
    g?.timezone ?? '',
    g?.isp ?? '',
    g?.org ?? '',
    g?.asn ?? '',
    // Browser env
    b?.screenWidth ?? '',
    b?.screenHeight ?? '',
    b?.availScreenWidth ?? '',
    b?.availScreenHeight ?? '',
    b?.viewportWidth ?? '',
    b?.viewportHeight ?? '',
    b?.devicePixelRatio ?? '',
    b?.colorDepth ?? '',
    b?.language ?? '',
    b?.languages?.join(';') ?? '',
    b?.timezone ?? '',
    b?.touchSupport ?? '',
    b?.cookiesEnabled ?? '',
    b?.doNotTrack ?? '',
    b?.connectionType ?? '',
    // GPS
    session.locationPermission,
    l?.latitude ?? '',
    l?.longitude ?? '',
    l?.accuracy ?? '',
    l?.timestamp ?? '',
    // Permissions
    session.cameraPermission,
    session.microphonePermission,
    // Media
    session.capturedPhotoRef ? 'yes' : 'no',
    session.capturedVideoRef ? 'yes' : 'no',
    session.capturedAudioRef ? 'yes' : 'no',
  ];

  const headerLine = CSV_HEADERS.join(',');
  const dataLine = row.map(escapeField).join(',');
  return `${headerLine}\r\n${dataLine}\r\n`;
}
