import { useEffect, useRef, useMemo, useState } from 'react';
import { MapPin, Info, Building2 } from 'lucide-react';
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

const REGISTRATION_HUBS: Record<string, { desc: string; role: string }> = {
  ashburn: {
    desc: "Ashburn (Northern Virginia) is the world's highest-density data center corridor, routing a major share of global cloud traffic.",
    role: "Global Hyperscale Cloud Hub (AWS, GCP, Equinix)",
  },
  'san francisco': {
    desc: "San Francisco and Silicon Valley serve as the primary Pacific peering and cloud headquarters nexus for US West Coast infrastructure.",
    role: "Pacific Peering & Cloud Origin Hub",
  },
  amsterdam: {
    desc: "Amsterdam (AMS-IX) is one of Europe's largest internet exchange ecosystems and a key transatlantic routing gateway.",
    role: "Transatlantic Interchange & Transit Gateway",
  },
  frankfurt: {
    desc: "Frankfurt (DE-CIX) hosts the highest-throughput internet exchange in mainland Europe and central transit junction.",
    role: "Central European Internet Exchange (DE-CIX)",
  },
  london: {
    desc: "London (LINX) is the primary telecommunications routing and financial network crossroads in the United Kingdom.",
    role: "UK Core Telecommunications & Peering Crossroads",
  },
  singapore: {
    desc: "Singapore is the premier subsea cable landing and hyperscaler interchange hub for Southeast Asia.",
    role: "Southeast Asian Subsea Cable & Hyperscaler Junction",
  },
  dublin: {
    desc: "Dublin anchors key European cloud availability zone clusters for AWS, Microsoft Azure, and Google Cloud.",
    role: "European Cloud Region Cluster",
  },
  tokyo: {
    desc: "Tokyo is the primary East Asian peering interconnection point connecting transpacific subsea cables.",
    role: "East Asian Subsea Cable Interconnect",
  },
  seattle: {
    desc: "Seattle represents a major Pacific Northwest cloud engineering corridor and transpacific cable gateway.",
    role: "Pacific Northwest Peering Gateway",
  },
  dallas: {
    desc: "Dallas / Fort Worth serves as a central North American telecommunications crossroads and carrier-neutral peering hub.",
    role: "Central North American Transit Hub",
  },
  chicago: {
    desc: "Chicago is a high-bandwidth central North American transit nexus and low-latency financial interconnect.",
    role: "Midwestern Financial Transit Nexus",
  },
  sydney: {
    desc: "Sydney anchors Australasia's core cloud availability zones and Southern Cross cable routing.",
    role: "Australasia Hyperscaler Region Hub",
  },
  atlanta: {
    desc: "Atlanta serves as the primary telecommunications routing hub for the Southeastern United States.",
    role: "Southeastern US Network Gateway",
  },
  'new york': {
    desc: "New York metro is a primary North American financial exchange center and transatlantic cable terminus.",
    role: "Atlantic Financial Exchange Terminus",
  },
};

function getHubInfo(city?: string): { desc: string; role: string } | undefined {
  if (!city) return undefined;
  const c = city.toLowerCase().trim();
  for (const [hub, info] of Object.entries(REGISTRATION_HUBS)) {
    if (c.includes(hub) || hub.includes(c)) return info;
  }
  return undefined;
}

export default function InfrastructureMap({
  assets,
  relationships,
  onSelectAsset,
  sectionNumber = '03',
}: InfrastructureMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [tileError, setTileError] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);

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

        points.push({
          ip: ipAsset?.value || geo.value,
          lat,
          lng,
          city: typeof geo.metadata?.city === 'string' ? geo.metadata.city : undefined,
          region: typeof geo.metadata?.region === 'string' ? geo.metadata.region : undefined,
          country: typeof geo.metadata?.country === 'string' ? geo.metadata.country : undefined,
          asn: asnName,
          organization: orgName,
          anycastLikely: geo.metadata?.anycastLikely === true,
          asset: ipAsset || geo,
        });
      }
    }

    return points;
  }, [assets, relationships]);

  // Set default selected point on load
  useEffect(() => {
    if (geoPoints.length > 0 && !selectedPoint) {
      setSelectedPoint(geoPoints[0] ?? null);
    }
  }, [geoPoints, selectedPoint]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 2,
        minZoom: 1,
        maxZoom: 10,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    if (geoPoints.length > 0) {
      const bounds = L.latLngBounds([]);

      geoPoints.forEach((pt) => {
        const isSelected = selectedPoint?.ip === pt.ip;
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: isSelected ? 9 : 6,
          fillColor: isSelected ? '#B5471B' : '#3D5A80',
          color: '#FAF8F3',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.on('click', () => {
          setSelectedPoint(pt);
          onSelectAsset?.(pt.asset);
        });

        marker.addTo(map);
        bounds.extend([pt.lat, pt.lng]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
      }
    }
  }, [geoPoints, selectedPoint, onSelectAsset]);

  const activeHub = useMemo(() => {
    return getHubInfo(selectedPoint?.city);
  }, [selectedPoint]);

  return (
    <div className="w-full space-y-4">
      {/* ─── Section Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--border-technical)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              [{sectionNumber}] Geographic Presence
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
              {geoPoints.length} Mapped Endpoint{geoPoints.length === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-0.5">
            Infrastructure Locations
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] max-w-md">
          Approximate geographic registrations of public servers associated with this domain based on IP routing records.
        </p>
      </div>

      {/* ─── Two-Column Desktop / Stacked Mobile Layout ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Interactive World Map (~60% = 7 Cols) */}
        <div className="lg:col-span-7 bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-3 bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)] flex items-center justify-between text-xs">
            <span className="font-mono text-xs text-[var(--text-primary)] font-bold">
              Global Network Point-of-Presence Map
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Click any marker to inspect location
            </span>
          </div>

          <div className="relative min-h-[380px] sm:min-h-[460px] bg-[var(--bg-canvas)]">
            <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

            {tileError && (
              <div className="absolute bottom-3 left-3 z-10 bg-[var(--bg-panel)]/90 backdrop-blur-xs p-2 text-[11px] text-[var(--text-muted)] border rounded-md">
                Map tiles running in offline mode.
              </div>
            )}
          </div>

          {/* Quick Location Pills Strip */}
          <div className="p-3 bg-[var(--bg-panel-subtle)] border-t border-[var(--border-muted)] flex flex-wrap gap-2 text-xs">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase self-center mr-1">Locations:</span>
            {geoPoints.slice(0, 5).map((pt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedPoint(pt)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition cursor-pointer border ${
                  selectedPoint?.ip === pt.ip
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white font-bold'
                    : 'border-[var(--border-muted)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pt.city || pt.country || pt.ip}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Detailed Location Context Panel (~40% = 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                Location Details &amp; Network Context
              </span>
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MapPin size={18} className="text-[var(--accent-primary)] shrink-0" />
                <span>
                  {selectedPoint ? [selectedPoint.city, selectedPoint.region, selectedPoint.country].filter(Boolean).join(', ') : 'Select a Location'}
                </span>
              </h3>
            </div>

            {selectedPoint ? (
              <div className="space-y-4 text-xs sm:text-sm">
                {/* Visual Context Box for City / Region */}
                <div className="p-4 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Building2 size={14} className="text-[var(--accent-primary)]" />
                      <span>{selectedPoint.city || 'Regional Infrastructure Center'}</span>
                    </span>
                    <span>{selectedPoint.country || 'Global'}</span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {activeHub
                      ? activeHub.desc
                      : `This endpoint is registered to ${selectedPoint.city || selectedPoint.country || 'a regional routing center'} according to public IP intelligence records.`}
                  </p>

                  {activeHub && (
                    <div className="text-[11px] font-mono text-[var(--accent-primary)] font-bold pt-1 border-t border-[var(--border-muted)]">
                      Primary Role: {activeHub.role}
                    </div>
                  )}
                </div>

                {/* Technical Coordinates & IP details */}
                <div className="space-y-2 bg-[var(--bg-panel-subtle)] p-3.5 rounded-lg border border-[var(--border-muted)] text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-muted)]">
                    <span className="text-[var(--text-muted)]">Server IP Address:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{selectedPoint.ip}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-muted)]">
                    <span className="text-[var(--text-muted)]">Network Provider (ASN):</span>
                    <span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                      {selectedPoint.asn || 'Not documented'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-muted)]">
                    <span className="text-[var(--text-muted)]">Operating Organization:</span>
                    <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                      {selectedPoint.organization || 'Direct Origin'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Approximate Coordinates:</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Important Plain-Language Note */}
                <div className="p-3 bg-[var(--accent-active-bg)] rounded-lg border border-[var(--accent-primary)]/20 text-xs text-[var(--text-primary)] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[var(--accent-primary)] font-mono text-[11px] uppercase">
                    <Info size={13} />
                    <span>Important Geographic Context</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    This represents an approximate network registration location based on public BGP routing databases. It does <strong>not</strong> identify the physical location of a person or the exact street address of a datacenter building.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                No geolocated IP addresses were identified for this domain.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
