import { useEffect, useRef, useMemo, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import type { Asset, Relationship } from '../../../shared/types';

interface InfrastructureMapProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
  sectionNumber?: string;
}

interface GeoPoint {
  ip: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  asn?: string;
  organization?: string;
  anycastLikely?: boolean;
  hubColor?: string;
  asset: Asset;
}

const REGISTRATION_HUBS: Record<string, string> = {
  ashburn: "Ashburn (Northern Virginia) is the world's most concentrated data center corridor, routing a major share of global cloud traffic.",
  'san francisco': "San Francisco & Silicon Valley serve as the primary Pacific peering and cloud headquarters nexus for US West Coast infrastructure.",
  amsterdam: "Amsterdam (AMS-IX) is one of Europe's largest internet exchange ecosystems and a key transatlantic routing gateway.",
  frankfurt: "Frankfurt (DE-CIX) hosts the highest-throughput internet exchange in mainland Europe and central transit junction.",
  london: "London (LINX) is the primary telecommunications routing and financial network crossroads in the United Kingdom.",
  singapore: "Singapore is the premier subsea cable landing and hyperscaler interchange hub for Southeast Asia.",
  dublin: "Dublin anchors key European cloud availability zone clusters for AWS, Microsoft Azure, and Google Cloud.",
  tokyo: "Tokyo is the primary East Asian peering interconnection point connecting transpacific subsea cables.",
  seattle: "Seattle represents a major Pacific Northwest cloud engineering corridor and transpacific cable gateway.",
  dallas: "Dallas / Fort Worth serves as a central North American telecommunications crossroads and carrier-neutral peering hub.",
  chicago: "Chicago is a high-bandwidth central North American transit nexus and low-latency financial interconnect.",
  sydney: "Sydney anchors Australasia's core cloud availability zones and Southern Cross cable routing.",
  atlanta: "Atlanta serves as the primary telecommunications routing hub for the Southeastern United States.",
  'new york': "New York metro is a primary North American financial exchange center and transatlantic cable terminus.",
  newark: "Newark / Northern NJ is a key regional data center and carrier hotel gateway for the New York metropolitan area.",
};

function getHubColor(city?: string): string | undefined {
  if (!city) return undefined;
  const c = city.toLowerCase().trim();
  for (const [hub, text] of Object.entries(REGISTRATION_HUBS)) {
    if (c.includes(hub) || hub.includes(c)) return text;
  }
  return undefined;
}

function getAnycastNote(organization?: string): string {
  const org = organization || 'a distributed edge provider';
  return `This is part of ${org}'s distributed edge network — the marker shows where this address range is registered, not a single physical server.`;
}

export default function InfrastructureMap({
  assets,
  relationships,
  onSelectAsset,
  sectionNumber = '05',
}: InfrastructureMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [tileError, setTileError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract geolocated IP nodes
  const geoPoints = useMemo<GeoPoint[]>(() => {
    const points: GeoPoint[] = [];
    const ipAssets = assets.filter((a) => a.type === 'IP');
    const geoAssets = assets.filter((a) => a.type === 'GEOLOCATION');

    for (const geo of geoAssets) {
      const lat = typeof geo.metadata?.latitude === 'number' ? geo.metadata.latitude : null;
      const lng = typeof geo.metadata?.longitude === 'number' ? geo.metadata.longitude : null;

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        const rel = relationships.find(
          (r) => r.type === 'located_approximately_at' && r.toAssetId === geo.id,
        );
        const ipAsset = rel ? ipAssets.find((ip) => ip.id === rel.fromAssetId) : undefined;

        let asnName: string | undefined;
        let orgName: string | undefined;

        if (ipAsset) {
          const asnRel = relationships.find(
            (r) => r.type === 'belongs_to_asn' && r.fromAssetId === ipAsset.id,
          );
          const asnAsset = asnRel ? assets.find((a) => a.id === asnRel.toAssetId) : undefined;
          asnName = asnAsset?.value;

          const orgRel = relationships.find(
            (r) => r.type === 'operated_by' && r.fromAssetId === ipAsset.id,
          );
          const orgAsset = orgRel ? assets.find((a) => a.id === orgRel.toAssetId) : undefined;
          orgName = orgAsset?.value;
        }

        const existingCount = points.filter(
          (p) => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001,
        ).length;
        const adjustedLat = existingCount > 0 ? lat + existingCount * 0.008 : lat;
        const adjustedLng = existingCount > 0 ? lng + existingCount * 0.008 : lng;

        const city = typeof geo.metadata?.city === 'string' ? geo.metadata.city : undefined;
        const region = typeof geo.metadata?.region === 'string' ? geo.metadata.region : undefined;
        const country = typeof geo.metadata?.country === 'string' ? geo.metadata.country : undefined;
        const isAnycast = Boolean(geo.metadata?.anycastLikely || ipAsset?.metadata?.anycastLikely);
        const hubColor = getHubColor(city);

        points.push({
          ip: ipAsset?.value ?? 'Discovered Host',
          lat: adjustedLat,
          lng: adjustedLng,
          city,
          region,
          country,
          asn: asnName,
          organization: orgName,
          anycastLikely: isAnycast,
          hubColor,
          asset: ipAsset ?? geo,
        });
      }
    }
    return points;
  }, [assets, relationships]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const firstPoint = geoPoints[0];
      const initialCenter: [number, number] = firstPoint
        ? [firstPoint.lat, firstPoint.lng]
        : [25, 0];
      const initialZoom = firstPoint ? 4 : 2;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 3,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: false,
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        maxBoundsViscosity: 1.0,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Support OpenStreetMap standard tiles with inverted dark theme,
      // or custom CARTO if API key is provided via environment
      const cartoKey = (import.meta as unknown as { env?: { VITE_CARTO_API_KEY?: string } }).env?.VITE_CARTO_API_KEY;
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey)}`
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        noWrap: true,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
        className: cartoKey ? '' : 'leaflet-dark-tiles',
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (geoPoints.length === 0) return;

    const bounds = L.latLngBounds([]);

    geoPoints.forEach((point) => {
      bounds.extend([point.lat, point.lng]);

      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 7,
        fillColor: '#2563eb',
        color: '#60a5fa',
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.85,
      });

      const locText = [point.city, point.region, point.country].filter(Boolean).join(', ') || 'Approximate Datacenter';
      const asnText = point.asn ? `ASN: ${point.asn}` : '';
      const orgText = point.organization ? `Org: ${point.organization}` : '';
      const anycastHtml = point.anycastLikely ? `<div style="margin-top: 5px; padding: 4px 6px; background: var(--bg-panel-subtle); border: 1px solid var(--border-technical); font-size: 10px; color: var(--text-secondary); line-height: 1.35; border-radius: 2px;">${getAnycastNote(point.organization)}</div>` : '';
      const hubHtml = point.hubColor ? `<div style="margin-top: 5px; padding: 4px 6px; background: var(--bg-panel-subtle); border: 1px solid var(--border-technical); font-size: 10px; color: var(--text-secondary); line-height: 1.35; border-radius: 2px;"><strong>Hub Context:</strong> ${point.hubColor}</div>` : '';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: var(--text-primary); background: var(--bg-panel); padding: 10px 12px; border: 1px solid var(--border-technical); border-radius: 2px; max-width: 280px;">
          <div style="color: var(--accent-primary); font-weight: 700; font-size: 13px; margin-bottom: 2px; font-family: monospace;">IP: ${point.ip}</div>
          <div style="color: var(--text-secondary); margin-bottom: 4px;">${locText}</div>
          ${asnText ? `<div style="color: var(--accent-primary); font-weight: 600; font-size: 11px; font-family: monospace;">${asnText}</div>` : ''}
          ${orgText ? `<div style="color: var(--text-muted); font-size: 11px;">${orgText}</div>` : ''}
          ${anycastHtml}
          ${hubHtml}
          <div style="margin-top: 6px; font-size: 10px; color: var(--text-muted); border-top: 1px solid var(--border-technical); padding-top: 4px; font-family: monospace;">[CLICK FOR ASSET DETAILS]</div>
        </div>
      `);

      marker.on('click', () => {
        onSelectAsset?.(point.asset);
      });

      marker.addTo(map);
    });

    if (geoPoints.length > 0) {
      const first = geoPoints[0];
      if (first && bounds.getNorthEast().equals(bounds.getSouthWest())) {
        map.setView([first.lat, first.lng], 5);
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
      }
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [geoPoints, onSelectAsset]);

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide">INFRASTRUCTURE DISTRIBUTION</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-secondary)] font-semibold hidden sm:inline">{geoPoints.length} ENDPOINTS</span>
          <span className="console-tag">REGISTRY_GEOIP</span>
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
            }}
            className="console-btn py-1 px-2.5 text-xs flex items-center gap-1 cursor-pointer ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Minimize' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ─── Map Canvas ─────────────────────────────────────────────── */}
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-black/80 flex flex-col justify-center backdrop-blur-sm' : ''}`}>
        {isFullscreen && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                setIsFullscreen(false);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
              }}
              className="console-btn-primary py-1 px-3 text-xs font-bold rounded-lg cursor-pointer"
            >
              Close Fullscreen &times;
            </button>
          </div>
        )}
        <div
          ref={mapContainerRef}
          className={`${isFullscreen ? 'h-[80vh] w-full rounded-xl border border-[var(--border-technical)]' : 'h-[260px] sm:h-[460px] md:h-[520px] w-full'} bg-[var(--bg-canvas)] transition-all`}
        />

        {/* Marker Legend Pill */}
        <div className="absolute top-3 left-3 z-[400] bg-[var(--bg-panel)]/90 backdrop-blur-xs border border-[var(--border-technical)] px-3 py-1.5 rounded-lg shadow-sm text-xs font-mono flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] border border-[#60a5fa]" />
          <span>IP Host Endpoint</span>
        </div>

        {/* Graceful Fallback Overlay if no IPs discovered */}
        {geoPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-panel)]/90 p-4 text-center font-mono text-xs text-[var(--text-muted)]">
            NO PUBLIC IP ADDRESSES WITH REGISTRY GEOLOCATION DISCOVERED
          </div>
        )}

        {tileError && (
          <div className="absolute bottom-3 left-3 console-tag console-tag-amber text-xs shadow-md">
            MAP TILES OFFLINE // COORDINATE OVERLAY ACTIVE
          </div>
        )}
      </div>

      {/* ─── Target Infrastructure Dossier ──────────────────────────── */}
      <div className="border-t border-[var(--border-technical)] bg-[var(--bg-panel-inset)] p-4 sm:p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          TARGET INFRASTRUCTURE SUMMARY
        </div>

        {geoPoints.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {geoPoints.slice(0, 4).map((pt, idx) => (
              <div key={idx} className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-3.5 rounded-lg shadow-sm space-y-1">
                <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider font-semibold">ENDPOINT // {pt.ip}</div>
                <div className="text-[var(--text-primary)] font-bold truncate text-sm">
                  {[pt.city, pt.region, pt.country].filter(Boolean).join(', ') || 'Regional Datacenter'}
                </div>
                <div className="text-xs text-[#16a34a] dark:text-[#2ee59d] font-semibold truncate">{pt.asn || 'ASN Unassigned'}</div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                  {pt.organization || 'Hosting Provider'}
                </div>
                {pt.anycastLikely && (
                  <div className="text-[10px] text-[var(--accent-primary)] font-sans leading-tight bg-[var(--accent-active-bg)] px-2 py-1 rounded">
                    Distributed Anycast Edge (registered range)
                  </div>
                )}
                {pt.hubColor && (
                  <div className="text-[10px] text-[var(--text-muted)] font-sans line-clamp-2 leading-tight pt-0.5">
                    {pt.hubColor}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] py-2">
            No public endpoints available for regional network routing analysis.
          </div>
        )}
      </div>

      {/* ─── Disclaimer Footer ──────────────────────────────────────── */}
      <div className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] px-4 py-2.5 text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>
          <strong className="text-[var(--text-secondary)]">DISCLAIMER:</strong> Coordinates designate approximate network/datacenter infrastructure from registry records, <em>not an individual or physical building location</em>.
        </span>
        <span className="text-[var(--text-secondary)] text-[11px]">
          &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-[var(--text-primary)]">OpenStreetMap</a> contributors
        </span>
      </div>
    </div>
  );
}
