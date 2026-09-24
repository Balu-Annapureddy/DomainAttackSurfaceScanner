import { useState, useMemo } from 'react';
import { GitFork, ZoomIn, ZoomOut, RotateCcw, Filter, Search } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AttackSurfaceGraphProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
}

const TYPE_COLORS: Record<Asset['type'], { bg: string; border: string; text: string; ring: string }> = {
  DOMAIN: { bg: '#083344', border: '#06b6d4', text: '#22d3ee', ring: 'rgba(6,182,212,0.3)' },
  SUBDOMAIN: { bg: '#172554', border: '#3b82f6', text: '#60a5fa', ring: 'rgba(59,130,246,0.3)' },
  IP: { bg: '#2e1065', border: '#8b5cf6', text: '#c084fc', ring: 'rgba(139,92,246,0.3)' },
  ASN: { bg: '#134e4a', border: '#14b8a6', text: '#2dd4bf', ring: 'rgba(20,184,166,0.3)' },
  ORGANIZATION: { bg: '#064e3b', border: '#10b981', text: '#34d399', ring: 'rgba(16,185,129,0.3)' },
  NAMESERVER: { bg: '#713f12', border: '#eab308', text: '#fde047', ring: 'rgba(234,179,8,0.3)' },
  MAIL_SERVER: { bg: '#7c2d12', border: '#f97316', text: '#fb923c', ring: 'rgba(249,115,22,0.3)' },
  CERTIFICATE: { bg: '#042f2e', border: '#2dd4bf', text: '#5eead4', ring: 'rgba(45,212,191,0.3)' },
  GEOLOCATION: { bg: '#831843', border: '#ec4899', text: '#f472b6', ring: 'rgba(236,72,153,0.3)' },
  TECHNOLOGY: { bg: '#312e81', border: '#6366f1', text: '#818cf8', ring: 'rgba(99,102,241,0.3)' },
  URL: { bg: '#1e293b', border: '#64748b', text: '#94a3b8', ring: 'rgba(100,116,139,0.3)' },
};

export default function AttackSurfaceGraph({
  assets,
  relationships,
  onSelectAsset,
}: AttackSurfaceGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [nodeLimit, setNodeLimit] = useState<number>(50);
  const [graphSearch, setGraphSearch] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (selectedType !== 'ALL') {
      result = result.filter((a) => a.type === selectedType);
    }
    if (graphSearch.trim()) {
      const q = graphSearch.toLowerCase();
      result = result.filter((a) => a.value.toLowerCase().includes(q) || a.type.toLowerCase().includes(q));
    }
    return nodeLimit === 0 ? result : result.slice(0, nodeLimit);
  }, [assets, selectedType, graphSearch, nodeLimit]);

  // Generate node coordinates using layered radial/hierarchical grouping
  const layout = useMemo(() => {
    const width = 900;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodeCoords = new Map<string, { x: number; y: number }>();

    // Central target domain
    const domainNode = filteredAssets.find((a) => a.type === 'DOMAIN');
    if (domainNode) {
      nodeCoords.set(domainNode.id, { x: centerX, y: centerY });
    }

    // Rings by type
    const subdomains = filteredAssets.filter((a) => a.type === 'SUBDOMAIN');
    const ips = filteredAssets.filter((a) => a.type === 'IP');
    const infra = filteredAssets.filter(
      (a) => ['NAMESERVER', 'MAIL_SERVER', 'CERTIFICATE'].includes(a.type),
    );
    const intel = filteredAssets.filter(
      (a) => ['ASN', 'ORGANIZATION', 'GEOLOCATION'].includes(a.type),
    );

    // Place subdomains in inner-left ring
    subdomains.forEach((item, i) => {
      const angle = (Math.PI * 0.8) + (i / Math.max(1, subdomains.length)) * (Math.PI * 0.8);
      const radius = 170;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.8),
      });
    });

    // Place IPs in inner-right ring
    ips.forEach((item, i) => {
      const angle = (-Math.PI * 0.3) + (i / Math.max(1, ips.length)) * (Math.PI * 0.6);
      const radius = 160;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.8),
      });
    });

    // Place Nameservers, Mail, Certs on top & bottom arcs
    infra.forEach((item, i) => {
      const angle = (-Math.PI * 0.8) + (i / Math.max(1, infra.length)) * (Math.PI * 0.7);
      const radius = 230;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    // Place ASN, Org, Geo on outer arcs connected to IPs
    intel.forEach((item, i) => {
      const angle = (-Math.PI * 0.15) + (i / Math.max(1, intel.length)) * (Math.PI * 0.7);
      const radius = 280;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
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

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <GitFork size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Attack Surface Relationship Graph</h2>
            <p className="text-xs text-slate-400">
              {visibleRelationships.length} relationships across {filteredAssets.length} nodes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Find node..."
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              className="h-7 w-28 sm:w-36 rounded-lg border border-slate-800 bg-slate-950/70 pl-7 pr-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Filter Type */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Asset Types</option>
              <option value="DOMAIN">Domains</option>
              <option value="SUBDOMAIN">Subdomains</option>
              <option value="IP">IP Addresses</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="ASN">ASNs</option>
              <option value="ORGANIZATION">Organizations</option>
              <option value="GEOLOCATION">Geolocations</option>
            </select>
          </div>

          {/* Limit Selector */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-xs">
            <select
              value={nodeLimit}
              onChange={(e) => setNodeLimit(Number(e.target.value))}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value={30}>30 nodes</option>
              <option value={50}>50 nodes</option>
              <option value={100}>100 nodes</option>
              <option value={0}>All nodes</option>
            </select>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/70 p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="rounded p-1 text-slate-400 hover:text-white transition"
              title="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              className="rounded p-1 text-slate-400 hover:text-white transition"
              title="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="border-l border-slate-800 ml-1 pl-1 pr-1 text-slate-400 hover:text-white transition"
              title="Reset view"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative overflow-hidden bg-slate-950 p-4">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[520px] w-full select-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#475569" opacity="0.8" />
            </marker>
          </defs>

          {/* Render Lines / Relationships */}
          {visibleRelationships.map((rel, idx) => {
            const from = layout.nodeCoords.get(rel.fromAssetId);
            const to = layout.nodeCoords.get(rel.toAssetId);
            if (!from || !to) return null;

            const isHighlighted =
              hoveredNodeId === rel.fromAssetId || hoveredNodeId === rel.toAssetId;

            return (
              <g key={`rel-${idx}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isHighlighted ? '#06b6d4' : '#1e293b'}
                  strokeWidth={isHighlighted ? 2.5 : 1.2}
                  strokeDasharray={rel.type === 'located_approximately_at' ? '4 4' : undefined}
                  markerEnd="url(#arrowhead)"
                  opacity={isHighlighted ? 0.9 : 0.6}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {filteredAssets.map((asset) => {
            const coords = layout.nodeCoords.get(asset.id);
            if (!coords) return null;

            const style = TYPE_COLORS[asset.type] || TYPE_COLORS.DOMAIN;
            const isHovered = hoveredNodeId === asset.id;
            const isTargetDomain = asset.type === 'DOMAIN';
            const radius = isTargetDomain ? 24 : 16;
            const label = asset.value.length > 20 ? `${asset.value.slice(0, 18)}…` : asset.value;

            return (
              <g
                key={asset.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectAsset?.(asset)}
                onMouseEnter={() => setHoveredNodeId(asset.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke={style.border}
                    strokeWidth={2}
                    opacity={0.4}
                    className="animate-pulse"
                  />
                )}

                <circle
                  r={radius}
                  fill={style.bg}
                  stroke={style.border}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />

                <text
                  textAnchor="middle"
                  dy={isTargetDomain ? -28 : -20}
                  fill={isHovered ? '#ffffff' : style.text}
                  fontSize={isTargetDomain ? 12 : 10}
                  fontWeight={isTargetDomain ? 700 : 500}
                  className="pointer-events-none font-mono"
                >
                  {label}
                </text>

                <text
                  textAnchor="middle"
                  dy={4}
                  fill="#ffffff"
                  fontSize={isTargetDomain ? 10 : 8}
                  fontWeight={600}
                  className="pointer-events-none uppercase tracking-wider"
                >
                  {asset.type.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>

        {filteredAssets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            No assets match the selected filter.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-950/50 px-5 py-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(TYPE_COLORS)
            .slice(0, 6)
            .map(([type, style]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: style.border }}
                />
                <span className="text-[11px] text-slate-400">{type}</span>
              </div>
            ))}
        </div>
        <span className="text-[11px] text-slate-500">Click node for asset details</span>
      </div>
    </div>
  );
}
