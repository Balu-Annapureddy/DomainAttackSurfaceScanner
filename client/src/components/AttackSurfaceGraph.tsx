import { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search, X, Info } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AttackSurfaceGraphProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
  sectionNumber?: string;
}

const TYPE_COLORS: Record<Asset['type'], { border: string; text: string }> = {
  DOMAIN: { border: '#0284c7', text: '#0284c7' },
  SUBDOMAIN: { border: '#0ea5e9', text: '#0ea5e9' },
  IP: { border: '#8b5cf6', text: '#8b5cf6' },
  ASN: { border: '#10b981', text: '#10b981' },
  ORGANIZATION: { border: '#14b8a6', text: '#14b8a6' },
  NAMESERVER: { border: '#f59e0b', text: '#f59e0b' },
  MAIL_SERVER: { border: '#f97316', text: '#f97316' },
  CERTIFICATE: { border: '#06b6d4', text: '#06b6d4' },
  GEOLOCATION: { border: '#f43f5e', text: '#f43f5e' },
  TECHNOLOGY: { border: '#6366f1', text: '#6366f1' },
  URL: { border: '#64748b', text: '#64748b' },
};

export default function AttackSurfaceGraph({
  assets,
  relationships,
  onSelectAsset,
  sectionNumber = '03',
}: AttackSurfaceGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [graphSearch, setGraphSearch] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (selectedType !== 'ALL') {
      result = result.filter((a) => a.type === selectedType);
    }
    if (graphSearch.trim()) {
      const q = graphSearch.toLowerCase();
      result = result.filter((a) => a.value.toLowerCase().includes(q) || a.type.toLowerCase().includes(q));
    }
    return result;
  }, [assets, selectedType, graphSearch]);

  // Centered, balanced radial node coordinates across the entire 1300px canvas
  const layout = useMemo(() => {
    const width = 1300;
    const height = 580;
    const centerX = 650;
    const centerY = 290;
    const nodeCoords = new Map<string, { x: number; y: number }>();

    // Central Target Domain
    const domainNode = filteredAssets.find((a) => a.type === 'DOMAIN');
    if (domainNode) {
      nodeCoords.set(domainNode.id, { x: centerX, y: centerY });
    }

    // Categorized asset pools
    const subdomains = filteredAssets.filter((a) => a.type === 'SUBDOMAIN');
    const ips = filteredAssets.filter((a) => a.type === 'IP');
    const nameservers = filteredAssets.filter((a) => a.type === 'NAMESERVER');
    const mailServers = filteredAssets.filter((a) => a.type === 'MAIL_SERVER');
    const certs = filteredAssets.filter((a) => a.type === 'CERTIFICATE');
    const asns = filteredAssets.filter((a) => a.type === 'ASN');
    const orgs = filteredAssets.filter((a) => a.type === 'ORGANIZATION');
    const geos = filteredAssets.filter((a) => a.type === 'GEOLOCATION');

    // 1. Subdomains: Left Arc (X: 180 .. 420)
    subdomains.forEach((item, i) => {
      const count = Math.max(1, subdomains.length);
      const angle = Math.PI * 0.65 + (i / count) * (Math.PI * 0.7);
      const radius = 260;
      nodeCoords.set(item.id, {
        x: Math.max(90, centerX + Math.cos(angle) * radius * 1.35),
        y: Math.min(height - 60, Math.max(60, centerY + Math.sin(angle) * radius * 0.95)),
      });
    });

    // 2. Nameservers, Mail & Certs: Top Region (X: 380 .. 920, Y: 70 .. 150)
    const topInfra = [...nameservers, ...mailServers, ...certs];
    topInfra.forEach((item, i) => {
      const count = Math.max(1, topInfra.length);
      const x = 380 + (i / count) * 540;
      const y = 80 + (i % 2 === 0 ? 0 : 55);
      nodeCoords.set(item.id, { x, y });
    });

    // 3. IPs: Right Arc (X: 880 .. 1120)
    ips.forEach((item, i) => {
      const count = Math.max(1, ips.length);
      const angle = -Math.PI * 0.35 + (i / count) * (Math.PI * 0.7);
      const radius = 260;
      nodeCoords.set(item.id, {
        x: Math.min(width - 90, centerX + Math.cos(angle) * radius * 1.35),
        y: Math.min(height - 60, Math.max(60, centerY + Math.sin(angle) * radius * 0.95)),
      });
    });

    // 4. ASNs & Organizations: Distributed symmetrically on outer flanks
    const rightIntel = [...asns, ...orgs, ...geos];
    rightIntel.forEach((item, i) => {
      const count = Math.max(1, rightIntel.length);
      const isRight = i % 2 === 0;
      const x = isRight ? 1120 + ((i % 4) * 25) : 100 + ((i % 4) * 25);
      const y = 140 + (i / count) * 320;
      nodeCoords.set(item.id, {
        x: Math.min(width - 70, Math.max(70, x)),
        y: Math.min(height - 60, Math.max(60, y)),
      });
    });

    return { nodeCoords, width, height };
  }, [filteredAssets]);

  // Edges connecting visible nodes
  const visibleRelationships = useMemo(() => {
    return relationships.filter(
      (r) => layout.nodeCoords.has(r.fromAssetId) && layout.nodeCoords.has(r.toAssetId),
    );
  }, [relationships, layout.nodeCoords]);

  // Selected node relationships for detail drawer
  const activeRelationships = useMemo(() => {
    if (!activeAsset) return [];
    return relationships.filter(
      (r) => r.fromAssetId === activeAsset.id || r.toAssetId === activeAsset.id,
    );
  }, [activeAsset, relationships]);

  const handleNodeClick = (asset: Asset) => {
    setActiveAsset(asset);
    onSelectAsset?.(asset);
  };

  return (
    <div className="console-panel overflow-hidden w-full rounded-xl shadow-md">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold text-sm">Attack Surface Topology</span>
          <span className="text-xs text-[var(--text-secondary)] ml-2 hidden sm:inline font-mono">
            {visibleRelationships.length} relationships • {filteredAssets.length} nodes
          </span>
        </div>

        {/* Controls Toolbar with Larger, Sleek Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-sans">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search node..."
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              className="h-8 w-32 sm:w-44 border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] pl-8 pr-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] rounded-md shadow-inner"
            />
          </div>

          <div className="flex items-center border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] px-2 h-8 rounded-md shadow-inner">
            <Filter size={12} className="text-[var(--text-muted)] mr-1.5" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">All Types</option>
              <option value="DOMAIN" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">Domains</option>
              <option value="SUBDOMAIN" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">Subdomains</option>
              <option value="IP" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">IP Hosts</option>
              <option value="CERTIFICATE" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">Certificates</option>
              <option value="ASN" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">BGP ASNs</option>
              <option value="ORGANIZATION" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">Organizations</option>
              <option value="GEOLOCATION" className="bg-[var(--bg-panel-elevated)] text-[var(--text-primary)]">Geolocations</option>
            </select>
          </div>

          <div className="flex items-center border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] h-8 px-2 gap-2 rounded-md shadow-inner">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out graph"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono text-[var(--text-muted)] min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in graph"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] ml-1 pl-1.5 border-l border-[var(--border-muted)] p-0.5 cursor-pointer"
              title="Reset zoom"
              aria-label="Reset graph zoom"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Full-Width Canvas Container with Floating Overlay Inspector ─ */}
      <div className="relative w-full overflow-hidden bg-[var(--bg-canvas)] workstation-grid-bg">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[560px] sm:h-[640px] w-full select-none transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <defs>
            <marker
              id="arrowhead-retro"
              markerWidth="6"
              markerHeight="4"
              refX="11"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="currentColor" className="text-[var(--border-technical)]" />
            </marker>
          </defs>

          {/* Relationships / Edges */}
          {visibleRelationships.map((rel, idx) => {
            const from = layout.nodeCoords.get(rel.fromAssetId);
            const to = layout.nodeCoords.get(rel.toAssetId);
            if (!from || !to) return null;

            const isHighlighted =
              hoveredNodeId === rel.fromAssetId ||
              hoveredNodeId === rel.toAssetId ||
              activeAsset?.id === rel.fromAssetId ||
              activeAsset?.id === rel.toAssetId;

            return (
              <g key={`rel-${idx}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isHighlighted ? 'var(--accent-primary)' : 'var(--border-technical)'}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeDasharray={rel.type === 'located_approximately_at' ? '3 3' : undefined}
                  markerEnd="url(#arrowhead-retro)"
                  opacity={isHighlighted ? 1 : 0.65}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {filteredAssets.map((asset) => {
            const coords = layout.nodeCoords.get(asset.id);
            if (!coords) return null;

            const style = TYPE_COLORS[asset.type] || TYPE_COLORS.DOMAIN;
            const isHovered = hoveredNodeId === asset.id;
            const isSelected = activeAsset?.id === asset.id;
            const isTargetDomain = asset.type === 'DOMAIN';
            const radius = isTargetDomain ? 24 : 14;
            const label = asset.value.length > 22 ? `${asset.value.slice(0, 20)}…` : asset.value;

            return (
              <g
                key={asset.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(asset)}
                onMouseEnter={() => setHoveredNodeId(asset.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <circle
                  r={radius}
                  className="fill-[var(--bg-panel)] transition-colors"
                  stroke={isSelected ? 'var(--accent-primary)' : isHovered ? 'var(--text-primary)' : style.border}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy={isTargetDomain ? -28 : -18}
                  fill={isSelected ? 'var(--accent-primary)' : isHovered ? 'var(--text-primary)' : style.text}
                  fontSize={isTargetDomain ? 11 : 9}
                  fontWeight={isTargetDomain ? 700 : 600}
                  className="pointer-events-none font-mono"
                >
                  {label}
                </text>

                {/* Type Code inside node */}
                <text
                  textAnchor="middle"
                  dy={3.5}
                  fill={style.border}
                  fontSize={isTargetDomain ? 9 : 7}
                  fontWeight={800}
                  className="pointer-events-none font-mono tracking-wider uppercase"
                >
                  {asset.type.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>

        {filteredAssets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[var(--text-muted)] text-xs">
            NO ASSETS MATCH CURRENT SEARCH
          </div>
        )}

        {/* ─── Floating Inspector Panel (Only Visible When a Node is Clicked) ── */}
        {activeAsset && (
          <div className="absolute top-3 right-3 w-80 max-w-[calc(100%-24px)] bg-[var(--bg-panel)]/95 border border-[var(--accent-primary)] shadow-2xl p-3.5 font-mono text-xs z-20 backdrop-blur-xs rounded-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-muted)]">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <Info size={13} className="text-[var(--accent-primary)]" />
                <span>INSPECT: {activeAsset.type}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveAsset(null)}
                aria-label="Close asset preview"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">VALUE:</div>
                <div className="text-[var(--text-primary)] font-semibold break-all bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-1.5 mt-0.5 select-all rounded-xs">
                  {activeAsset.value}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">CONNECTED RELATIONSHIPS ({activeRelationships.length}):</div>
                {activeRelationships.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-1">
                    {activeRelationships.map((r, i) => {
                      const targetId = r.fromAssetId === activeAsset.id ? r.toAssetId : r.fromAssetId;
                      const targetAsset = assets.find((a) => a.id === targetId);
                      return (
                        <div key={i} className="text-[10px] p-1.5 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] truncate rounded-xs">
                          <span className="text-[var(--text-secondary)]">{r.type.replace(/_/g, ' ')}: </span>
                          <span className="text-[var(--text-primary)] font-semibold">{targetAsset?.value || targetId}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">No direct relationships mapped</div>
                )}
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border-muted)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
              <span>[ESC / X TO CLOSE]</span>
              <button
                onClick={() => onSelectAsset?.(activeAsset)}
                className="text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                VIEW FULL RAW DATA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Legend Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-3.5 py-1.5 font-mono text-[10px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[var(--text-muted)]">NODE TYPES:</span>
          {Object.entries(TYPE_COLORS)
            .slice(0, 8)
            .map(([type, style]) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: style.border }}
                />
                <span className="text-[var(--text-secondary)]">{type}</span>
              </div>
            ))}
        </div>
        <span className="text-[var(--text-muted)]">[CLICK ANY NODE TO INSPECT ATTRIBUTES]</span>
      </div>
    </div>
  );
}
