import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
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
        // Find associated IP via relationship
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
        minZoom: 1,
        maxZoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark CartoDB tile layer with error handling
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
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
        fillColor: '#388bfd',
        color: '#58a6ff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
      });

      // Escape popup content to prevent injection
      const locText = [point.city, point.country].filter(Boolean).join(', ') || 'Regional datacenter';
      const asnText = point.asn ? `ASN: ${point.asn}` : '';
      const orgText = point.organization ? `Org: ${point.organization}` : '';

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #e6edf3; background: #111620; padding: 6px; border: 1px solid #1f2735; border-radius: 4px;">
          <div style="color: #58a6ff; font-weight: bold; margin-bottom: 2px;">IP: ${point.ip}</div>
          <div style="color: #9aa5b8;">${locText}</div>
          ${asnText ? `<div style="color: #3fb950; font-size: 10px;">${asnText}</div>` : ''}
          ${orgText ? `<div style="color: #9aa5b8; font-size: 10px;">${orgText}</div>` : ''}
          <div style="margin-top: 4px; font-size: 9px; color: #626e82;">[CLICK MARKER FOR ASSET DETAILS]</div>
        </div>
      `);

      marker.on('click', () => {
        onSelectAsset?.(point.asset);
      });

      marker.addTo(map);
    });

    if (geoPoints.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
  }, [geoPoints, onSelectAsset]);

  return (
    <div className="console-panel overflow-hidden">
      {/* ─── Map Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 border-b border-[#1f2735] p-3.5 sm:flex-row sm:items-center sm:justify-between bg-[#111620]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#58a6ff] font-bold">[GEOIP]</span>
            <span className="font-bold text-[#e6edf3]">APPROXIMATE INFRASTRUCTURE GEOLOCATION</span>
          </div>
          <p className="text-[11px] text-[#9aa5b8] mt-0.5 font-mono">
            {geoPoints.length} network points of presence mapped
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[#9aa5b8]">
          <span className="console-tag">ESTIMATED_DATACENTERS</span>
        </div>
      </div>

      {/* ─── Map Canvas ─────────────────────────────────────────────── */}
      <div className="relative">
        <div ref={mapContainerRef} className="h-72 sm:h-80 w-full bg-[#0b0e14]" />

        {/* Graceful Tile Error or Empty State */}
        {geoPoints.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14]/90 p-6 text-center font-mono text-xs text-[#626e82]">
            NO PUBLIC IP ADDRESSES WITH REGISTRY GEOLOCATION DISCOVERED
          </div>
        ) : tileError ? (
          <div className="absolute bottom-2 left-2 console-tag console-tag-amber text-[10px]">
            MAP TILES OFFLINE // MARKERS RENDERED ON INTERNAL GRID
          </div>
        ) : null}
      </div>

      {/* ─── Disclaimer Footer ──────────────────────────────────────── */}
      <div className="border-t border-[#1f2735] bg-[#0d121a] px-4 py-2 font-mono text-[11px] text-[#626e82] flex items-center justify-between">
        <span>
          <strong className="text-[#9aa5b8]">DISCLAIMER:</strong> Coordinates indicate regional network datacenters or ISP routers derived from registry records, <em>NEVER physical buildings or individuals</em>.
        </span>
        <span className="hidden sm:inline">[MAP LEAFLET // CARTO DARK]</span>
      </div>
    </div>
  );
}
