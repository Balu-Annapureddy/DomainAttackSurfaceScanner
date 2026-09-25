import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { MapPin, Info, Globe } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface InfrastructureMapProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
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
}: InfrastructureMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Extract geolocated IP nodes
  const geoPoints = useMemo<GeoPoint[]>(() => {
    const points: GeoPoint[] = [];
    const ipAssets = assets.filter((a) => a.type === 'IP');
    const geoAssets = assets.filter((a) => a.type === 'GEOLOCATION');

    for (const geo of geoAssets) {
      const lat = typeof geo.metadata?.latitude === 'number' ? geo.metadata.latitude : null;
      const lng = typeof geo.metadata?.longitude === 'number' ? geo.metadata.longitude : null;

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        // Find associated IP via relationship
        const rel = relationships.find(
          (r) => r.type === 'located_approximately_at' && r.toAssetId === geo.id,
        );
        const ipAsset = rel ? ipAssets.find((ip) => ip.id === rel.fromAssetId) : undefined;

        // Also find ASN and Organization if linked to IP
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
        const adjustedLat = existingCount > 0 ? lat + (existingCount * 0.008) : lat;
        const adjustedLng = existingCount > 0 ? lng + (existingCount * 0.008) : lng;

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
      // Default view center
      const firstPoint = geoPoints[0];
      const initialCenter: [number, number] = firstPoint
        ? [firstPoint.lat, firstPoint.lng]
        : [25, 0];
      const initialZoom = firstPoint ? 4 : 2;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: true,
      });

      // CartoDB Dark Matter tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // Add glowing custom circle markers
    geoPoints.forEach((point) => {
      bounds.extend([point.lat, point.lng]);

      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        fillColor: '#06b6d4',
        color: '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85,
        className: 'infrastructure-marker',
      }).addTo(map);

      const escapeHtml = (str?: string) =>
        (str || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));

      const safeIp = escapeHtml(point.ip);
      const safeCity = escapeHtml(point.city);
      const safeCountry = escapeHtml(point.country ?? 'Unknown Location');
      const safeAsn = escapeHtml(point.asn);
      const safeOrg = escapeHtml(point.organization);

      const popupContent = `
        <div style="font-family: inherit; color: #0f172a; padding: 4px; min-width: 180px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; font-weight: 700; margin-bottom: 2px;">
            Target Infrastructure
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; font-family: monospace;">
            ${safeIp}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">
            📍 ${safeCity ? `${safeCity}, ` : ''}${safeCountry}
          </div>
          ${safeAsn ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">ASN: ${safeAsn}</div>` : ''}
          ${safeOrg ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Org: ${safeOrg}</div>` : ''}
          <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; font-style: italic;">
            Approximate network location
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onSelectAsset?.(point.asset);
      });
    });

    if (geoPoints.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }

    return () => {
      // Map stays alive across renders unless unmounted
    };
  }, [geoPoints, onSelectAsset]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Infrastructure Distribution</h2>
            <p className="text-xs text-slate-400">
              {geoPoints.length} geolocated IP endpoint{geoPoints.length === 1 ? '' : 's'} discovered
            </p>
          </div>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-400">
          <Info size={13} className="text-cyan-400" />
          <span>Approximate network / datacenter location, not an individual location.</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[380px] w-full bg-slate-950"
          style={{ zIndex: 10 }}
        />

        {geoPoints.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center backdrop-blur-sm" style={{ zIndex: 20 }}>
            <MapPin size={32} className="mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No Geolocation Coordinates Reported</p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              IP intelligence geolocation data was either unavailable or omitted for the resolved public addresses.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 bg-slate-950/50 px-5 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>Target IP Infrastructure</span>
          </div>
        </div>
        <span>Click any node to view asset context</span>
      </div>
    </div>
  );
}
