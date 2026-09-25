import { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search, X, Info } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AttackSurfaceGraphProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
  sectionNumber?: string;
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

  // Generate wide, balanced node coordinates across the entire 1300px canvas
  const layout = useMemo(() => {
    const width = 1300;
    const height = 580;
    const nodeCoords = new Map<string, { x: number; y: number }>();

    // Central Target Domain
    const domainNode = filteredAssets.find((a) => a.type === 'DOMAIN');
    if (domainNode) {
      nodeCoords.set(domainNode.id, { x: 500, y: 290 });
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

    // 1. Subdomains: Left Column / Semi-circle (X: 120 .. 320)
    subdomains.forEach((item, i) => {
      const count = Math.max(1, subdomains.length);
      const angle = Math.PI * 0.6 + (i / count) * (Math.PI * 0.8);
      const radius = 240;
      nodeCoords.set(item.id, {
        x: Math.max(80, 500 + Math.cos(angle) * radius * 1.3),
        y: Math.min(height - 60, Math.max(60, 290 + Math.sin(angle) * radius * 0.9)),
      });
    });

    // 2. Nameservers & Mail: Top Region (X: 300 .. 700, Y: 70 .. 150)
    const topInfra = [...nameservers, ...mailServers, ...certs];
    topInfra.forEach((item, i) => {
      const count = Math.max(1, topInfra.length);
      const x = 320 + (i / count) * 360;
      const y = 80 + (i % 2 === 0 ? 0 : 50);
      nodeCoords.set(item.id, { x, y });
    });

    // 3. IPs: Right-Center Region (X: 740 .. 920)
    ips.forEach((item, i) => {
      const count = Math.max(1, ips.length);
      const angle = -Math.PI * 0.35 + (i / count) * (Math.PI * 0.7);
      const radius = 260;
      nodeCoords.set(item.id, {
        x: 500 + Math.cos(angle) * radius * 1.25,
        y: Math.min(height - 60, Math.max(60, 290 + Math.sin(angle) * radius * 0.85)),
      });
    });

    // 4. ASNs & Organizations: Far Right Region (X: 1000 .. 1220)
    const rightIntel = [...asns, ...orgs, ...geos];
    rightIntel.forEach((item, i) => {
      const count = Math.max(1, rightIntel.length);
      const x = 1040 + (i % 2 === 0 ? 0 : 70);
      const y = 120 + (i / count) * 340;
      nodeCoords.set(item.id, {
        x: Math.min(width - 80, x),
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
    <div className="console-panel overflow-hidden w-full">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold">ATTACK SURFACE RELATIONSHIPS</span>
          <span className="text-[11px] text-[#8b9bb0] ml-2">
            {visibleRelationships.length} RELATIONSHIPS · {filteredAssets.length} ASSETS
          </span>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#576575]" />
            <input
              type="text"
              placeholder="SEARCH NODE..."
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              className="h-6 w-28 sm:w-36 border border-[#1e2631] bg-[#0c1015] pl-6 pr-1 text-[11px] text-[#e6edf3] placeholder-[#576575] outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="flex items-center border border-[#1e2631] bg-[#0c1015] px-1.5 h-6 text-[11px]">
            <Filter size={10} className="text-[#576575] mr-1" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-[#e6edf3] outline-none cursor-pointer"
            >
              <option value="ALL">ALL TYPES</option>
              <option value="DOMAIN">DOMAINS</option>
              <option value="SUBDOMAIN">SUBDOMAINS</option>
              <option value="IP">IP HOSTS</option>
              <option value="CERTIFICATE">CERTIFICATES</option>
              <option value="ASN">BGP ASNS</option>
              <option value="ORGANIZATION">ORGANIZATIONS</option>
              <option value="GEOLOCATION">GEOLOCATIONS</option>
            </select>
          </div>

          <div className="flex items-center border border-[#1e2631] bg-[#0c1015] h-6 px-1 gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="text-[#8b9bb0] hover:text-[#e6edf3]"
              title="Zoom out"
            >
              <ZoomOut size={11} />
            </button>
            <span className="text-[10px] text-[#576575]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              className="text-[#8b9bb0] hover:text-[#e6edf3]"
              title="Zoom in"
            >
              <ZoomIn size={11} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-[#8b9bb0] hover:text-[#e6edf3] ml-1 pl-1 border-l border-[#1e2631]"
              title="Reset zoom"
            >
              <RotateCcw size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Full-Width Canvas Container with Floating Overlay Inspector ─ */}
      <div className="relative w-full overflow-hidden bg-[#080b0f] workstation-grid-bg">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[520px] sm:h-[580px] w-full select-none transition-transform duration-150"
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
              <polygon points="0 0, 6 2, 0 4" fill="#2a3749" />
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
                  stroke={isHighlighted ? '#58a6ff' : '#1e2631'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={rel.type === 'located_approximately_at' ? '3 3' : undefined}
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
                  fill={style.bg}
                  stroke={isSelected ? '#58a6ff' : isHovered ? '#ffffff' : style.border}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy={isTargetDomain ? -28 : -18}
                  fill={isSelected ? '#58a6ff' : isHovered ? '#ffffff' : style.text}
                  fontSize={isTargetDomain ? 11 : 9}
                  fontWeight={isTargetDomain ? 700 : 500}
                  className="pointer-events-none font-mono"
                >
                  {label}
                </text>

                {/* Type Code inside node */}
                <text
                  textAnchor="middle"
                  dy={3.5}
                  fill="#ffffff"
                  fontSize={isTargetDomain ? 9 : 7}
                  fontWeight={700}
                  className="pointer-events-none font-mono tracking-wider uppercase opacity-90"
                >
                  {asset.type.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>

        {filteredAssets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[#576575] text-xs">
            NO ASSETS MATCH CURRENT SEARCH
          </div>
        )}

        {/* ─── Floating Inspector Panel (Only Visible When a Node is Clicked) ── */}
        {activeAsset && (
          <div className="absolute top-3 right-3 w-80 max-w-[calc(100%-24px)] bg-[#0c1015]/95 border border-[#58a6ff] shadow-2xl p-3.5 font-mono text-xs z-20 backdrop-blur-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2631]">
              <div className="flex items-center gap-1.5 font-bold text-[#e6edf3]">
                <Info size={13} className="text-[#58a6ff]" />
                <span>INSPECT: {activeAsset.type}</span>
              </div>
              <button
                onClick={() => setActiveAsset(null)}
                className="text-[#8b9bb0] hover:text-[#e6edf3] p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              <div>
                <div className="text-[10px] text-[#576575] uppercase">VALUE:</div>
                <div className="text-[#e6edf3] font-semibold break-all bg-[#10151b] border border-[#1e2631] p-1.5 mt-0.5 select-all">
                  {activeAsset.value}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#576575] uppercase">CONNECTED RELATIONSHIPS ({activeRelationships.length}):</div>
                {activeRelationships.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-1">
                    {activeRelationships.map((r, i) => {
                      const targetId = r.fromAssetId === activeAsset.id ? r.toAssetId : r.fromAssetId;
                      const targetAsset = assets.find((a) => a.id === targetId);
                      return (
                        <div key={i} className="text-[10px] p-1.5 bg-[#10151b] border border-[#1e2631] truncate">
                          <span className="text-[#8b9bb0]">{r.type.replace(/_/g, ' ')}: </span>
                          <span className="text-[#e6edf3] font-semibold">{targetAsset?.value || targetId}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-[#576575] mt-0.5">No direct relationships mapped</div>
                )}
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[#1e2631] flex justify-between items-center text-[10px] text-[#576575]">
              <span>[ESC / X TO CLOSE]</span>
              <button
                onClick={() => onSelectAsset?.(activeAsset)}
                className="text-[#58a6ff] hover:underline"
              >
                VIEW FULL RAW DATA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Legend Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2631] bg-[#0c1015] px-3.5 py-1.5 font-mono text-[10px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#576575]">NODE TYPES:</span>
          {Object.entries(TYPE_COLORS)
            .slice(0, 8)
            .map(([type, style]) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5"
                  style={{ backgroundColor: style.border }}
                />
                <span className="text-[#8b9bb0]">{type}</span>
              </div>
            ))}
        </div>
        <span className="text-[#576575]">[CLICK ANY NODE TO INSPECT ATTRIBUTES]</span>
      </div>
    </div>
  );
}
