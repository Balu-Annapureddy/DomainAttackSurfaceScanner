import { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AttackSurfaceGraphProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
}

const TYPE_COLORS: Record<Asset['type'], { bg: string; border: string; text: string }> = {
  DOMAIN: { bg: '#102236', border: '#388bfd', text: '#58a6ff' },
  SUBDOMAIN: { bg: '#0e1f38', border: '#2188ff', text: '#79b8ff' },
  IP: { bg: '#1c1538', border: '#8a63d2', text: '#b392f0' },
  ASN: { bg: '#102e26', border: '#2ea043', text: '#3fb950' },
  ORGANIZATION: { bg: '#0e2b20', border: '#34d399', text: '#7ee787' },
  NAMESERVER: { bg: '#2b2110', border: '#d29922', text: '#e3b341' },
  MAIL_SERVER: { bg: '#2e1910', border: '#db6d28', text: '#f0883e' },
  CERTIFICATE: { bg: '#12262a', border: '#38bdf8', text: '#7dd3fc' },
  GEOLOCATION: { bg: '#2e1224', border: '#f43f5e', text: '#fb7185' },
  TECHNOLOGY: { bg: '#1d1936', border: '#6366f1', text: '#a5b4fc' },
  URL: { bg: '#141a24', border: '#64748b', text: '#94a3b8' },
};

export default function AttackSurfaceGraph({
  assets,
  relationships,
  onSelectAsset,
}: AttackSurfaceGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [nodeLimit, setNodeLimit] = useState<number>(60);
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

  // Generate node coordinates using layered hierarchical grouping
  const layout = useMemo(() => {
    const width = 960;
    const height = 540;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodeCoords = new Map<string, { x: number; y: number }>();

    // Central target domain
    const domainNode = filteredAssets.find((a) => a.type === 'DOMAIN');
    if (domainNode) {
      nodeCoords.set(domainNode.id, { x: centerX, y: centerY });
    }

    // Categorized groups
    const subdomains = filteredAssets.filter((a) => a.type === 'SUBDOMAIN');
    const ips = filteredAssets.filter((a) => a.type === 'IP');
    const infra = filteredAssets.filter(
      (a) => ['NAMESERVER', 'MAIL_SERVER', 'CERTIFICATE'].includes(a.type),
    );
    const intel = filteredAssets.filter(
      (a) => ['ASN', 'ORGANIZATION', 'GEOLOCATION'].includes(a.type),
    );

    // Place subdomains in left semi-circle
    subdomains.forEach((item, i) => {
      const count = Math.max(1, subdomains.length);
      const angle = Math.PI * 0.65 + (i / count) * (Math.PI * 0.7);
      const radius = 175;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.85),
      });
    });

    // Place IPs in right semi-circle
    ips.forEach((item, i) => {
      const count = Math.max(1, ips.length);
      const angle = -Math.PI * 0.35 + (i / count) * (Math.PI * 0.7);
      const radius = 175;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.85),
      });
    });

    // Place Nameservers, Mail, Certs on top & bottom arcs
    infra.forEach((item, i) => {
      const count = Math.max(1, infra.length);
      const angle = -Math.PI * 0.85 + (i / count) * (Math.PI * 0.7);
      const radius = 245;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.9),
      });
    });

    // Place ASN, Org, Geo on outer right arcs
    intel.forEach((item, i) => {
      const count = Math.max(1, intel.length);
      const angle = -Math.PI * 0.2 + (i / count) * (Math.PI * 0.7);
      const radius = 295;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.9),
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
    <div className="console-panel overflow-hidden">
      {/* ─── Graph Header Bar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-[#1f2735] p-3.5 sm:flex-row sm:items-center sm:justify-between bg-[#111620]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#58a6ff] font-bold">[GRAPH]</span>
            <span className="font-bold text-[#e6edf3]">ATTACK SURFACE RELATIONSHIP TOPOLOGY</span>
          </div>
          <p className="text-[11px] text-[#9aa5b8] mt-0.5 font-mono">
            {visibleRelationships.length} relationships active · {filteredAssets.length} nodes rendered
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Quick Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#626e82]" />
            <input
              type="text"
              placeholder="Filter node..."
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              className="h-7 w-28 sm:w-36 rounded border border-[#1f2735] bg-[#0d121a] pl-7 pr-2 text-xs text-[#e6edf3] placeholder-[#626e82] outline-none focus:border-[#388bfd]"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 rounded border border-[#1f2735] bg-[#0d121a] px-2 py-1 text-xs">
            <Filter size={11} className="text-[#626e82]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-[#e6edf3] outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Asset Types</option>
              <option value="DOMAIN">Domains</option>
              <option value="SUBDOMAIN">Subdomains</option>
              <option value="IP">IP Endpoints</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="ASN">BGP ASNs</option>
              <option value="ORGANIZATION">Organizations</option>
              <option value="GEOLOCATION">Geolocations</option>
            </select>
          </div>

          {/* Node Limit */}
          <div className="flex items-center rounded border border-[#1f2735] bg-[#0d121a] px-2 py-1 text-xs">
            <select
              value={nodeLimit}
              onChange={(e) => setNodeLimit(Number(e.target.value))}
              className="bg-transparent text-[#e6edf3] outline-none cursor-pointer text-xs"
            >
              <option value={30}>30 nodes</option>
              <option value={60}>60 nodes</option>
              <option value={100}>100 nodes</option>
              <option value={0}>All nodes</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center rounded border border-[#1f2735] bg-[#0d121a] p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="rounded p-1 text-[#9aa5b8] hover:text-[#e6edf3] transition"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-[#626e82]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              className="rounded p-1 text-[#9aa5b8] hover:text-[#e6edf3] transition"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="border-l border-[#1f2735] ml-0.5 pl-1 pr-1 text-[#9aa5b8] hover:text-[#e6edf3] transition"
              title="Reset view"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SVG Canvas with Console Grid ───────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0a0d13] p-4 console-grid-bg">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[500px] w-full select-none transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <defs>
            <marker
              id="arrowhead-retro"
              markerWidth="7"
              markerHeight="5"
              refX="13"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 7 2.5, 0 5" fill="#303c50" />
            </marker>
          </defs>

          {/* Relationships / Edges */}
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
                  stroke={isHighlighted ? '#388bfd' : '#1f2937'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={rel.type === 'located_approximately_at' ? '4 3' : undefined}
                  markerEnd="url(#arrowhead-retro)"
                  opacity={isHighlighted ? 0.95 : 0.65}
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
            const isTargetDomain = asset.type === 'DOMAIN';
            const radius = isTargetDomain ? 24 : 16;
            const label = asset.value.length > 22 ? `${asset.value.slice(0, 20)}…` : asset.value;

            return (
              <g
                key={asset.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectAsset?.(asset)}
                onMouseEnter={() => setHoveredNodeId(asset.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Node Box */}
                <circle
                  r={radius}
                  fill={style.bg}
                  stroke={isHovered ? '#ffffff' : style.border}
                  strokeWidth={isHovered ? 2 : 1.2}
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy={isTargetDomain ? -28 : -20}
                  fill={isHovered ? '#ffffff' : style.text}
                  fontSize={isTargetDomain ? 11 : 9.5}
                  fontWeight={isTargetDomain ? 700 : 500}
                  className="pointer-events-none font-mono"
                >
                  {label}
                </text>

                {/* Type Code */}
                <text
                  textAnchor="middle"
                  dy={3.5}
                  fill="#ffffff"
                  fontSize={isTargetDomain ? 9.5 : 7.5}
                  fontWeight={600}
                  className="pointer-events-none font-mono tracking-wider uppercase opacity-90"
                >
                  {asset.type.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>

        {filteredAssets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[#626e82] text-xs">
            NO ASSETS MATCH CURRENT FILTER
          </div>
        )}
      </div>

      {/* ─── Legend Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1f2735] bg-[#0d121a] px-4 py-2.5 font-mono text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#626e82]">NODE TYPES:</span>
          {Object.entries(TYPE_COLORS)
            .slice(0, 7)
            .map(([type, style]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: style.border }}
                />
                <span className="text-[#9aa5b8]">{type}</span>
              </div>
            ))}
        </div>
        <span className="text-[#626e82]">[CLICK NODE FOR RAW EVIDENCE DRAWER]</span>
      </div>
    </div>
  );
}
