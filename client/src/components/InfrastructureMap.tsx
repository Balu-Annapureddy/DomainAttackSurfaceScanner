import { useEffect, useRef, useMemo, useState } from 'react';
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
  country?: string;
  asn?: string;
  organization?: string;
  asset: Asset;
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

        points.push({
          ip: ipAsset?.value ?? 'Discovered Host',
          lat: adjustedLat,
          lng: adjustedLng,
          city: typeof geo.metadata?.city === 'string' ? geo.metadata.city : undefined,
          country: typeof geo.metadata?.country === 'string' ? geo.metadata.country : undefined,
          asn: asnName,
          organization: orgName,
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
        minZoom: 2,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
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

      const locText = [point.city, point.country].filter(Boolean).join(', ') || 'Approximate Datacenter';
      const asnText = point.asn ? `ASN: ${point.asn}` : '';
      const orgText = point.organization ? `Org: ${point.organization}` : '';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: var(--text-primary); background: var(--bg-panel-elevated); padding: 8px 10px; border: 1px solid var(--border-technical); border-radius: 6px; box-shadow: var(--shadow-card);">
          <div style="color: var(--accent-primary); font-weight: 700; margin-bottom: 2px;">IP: ${point.ip}</div>
          <div style="color: var(--text-secondary); margin-bottom: 3px;">${locText}</div>
          ${asnText ? `<div style="color: #10b981; font-weight: 600; font-size: 11px;">${asnText}</div>` : ''}
          ${orgText ? `<div style="color: var(--text-muted); font-size: 11px;">${orgText}</div>` : ''}
          <div style="margin-top: 6px; font-size: 10px; color: var(--text-muted); border-top: 1px solid var(--border-muted); pt-1;">[CLICK FOR ASSET DETAILS]</div>
        </div>
      `);

      marker.on('click', () => {
        onSelectAsset?.(point.asset);
      });

      marker.addTo(map);
    });

    if (geoPoints.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    }
  }, [geoPoints, onSelectAsset]);

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide">INFRASTRUCTURE DISTRIBUTION</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">{geoPoints.length} GEOLOCATED ENDPOINT{geoPoints.length !== 1 ? 'S' : ''}</span>
          <span className="console-tag">REGISTRY_GEOIP</span>
        </div>
      </div>

      {/* ─── Map Canvas ─────────────────────────────────────────────── */}
      <div className="relative">
        <div ref={mapContainerRef} className="h-80 sm:h-[420px] w-full bg-[var(--bg-canvas)]" />

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
              <div key={idx} className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-3.5 rounded-lg shadow-sm">
                <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider font-semibold">ENDPOINT // {pt.ip}</div>
                <div className="text-[var(--text-primary)] font-bold truncate mt-1 text-sm">
                  {[pt.city, pt.country].filter(Boolean).join(', ') || 'Regional Datacenter'}
                </div>
                <div className="text-xs text-[#16a34a] dark:text-[#2ee59d] font-semibold truncate mt-0.5">{pt.asn || 'ASN Unassigned'}</div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{pt.organization || 'Hosting Provider'}</div>
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
