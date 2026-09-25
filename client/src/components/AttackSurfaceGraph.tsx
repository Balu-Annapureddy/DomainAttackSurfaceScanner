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

  // Generate node coordinates using layered hierarchical grouping
  const layout = useMemo(() => {
    const width = 960;
    const height = 500;
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
      const radius = 230;
      nodeCoords.set(item.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.9),
      });
    });

    // Place ASN, Org, Geo on outer right arcs
    intel.forEach((item, i) => {
      const count = Math.max(1, intel.length);
      const angle = -Math.PI * 0.2 + (i / count) * (Math.PI * 0.7);
      const radius = 280;
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
    <div className="console-panel overflow-hidden">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>ATTACK SURFACE RELATIONSHIPS</span>
          <span className="text-[11px] text-[#8b9bb0] ml-2">
            {visibleRelationships.length} RELATIONSHIPS / {filteredAssets.length} ASSETS
          </span>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Quick Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#576575]" />
            <input
              type="text"
              placeholder="SEARCH NODE..."
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              className="h-6 w-24 sm:w-32 border border-[#1e2631] bg-[#0c1015] pl-6 pr-1 text-[11px] text-[#e6edf3] placeholder-[#576575] outline-none focus:border-[#58a6ff]"
            />
          </div>

          {/* Type Filter */}
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

          {/* Zoom */}
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

      {/* ─── Graph Canvas & Side Inspector ─────────────────────────── */}
      <div className="relative flex flex-col lg:flex-row bg-[#080b0f] workstation-grid-bg">
        {/* SVG Canvas */}
        <div className="flex-1 relative overflow-hidden p-2">
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="h-[460px] w-full select-none transition-transform duration-150"
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
                    strokeWidth={isHighlighted ? 1.8 : 1}
                    strokeDasharray={rel.type === 'located_approximately_at' ? '3 3' : undefined}
                    markerEnd="url(#arrowhead-retro)"
                    opacity={isHighlighted ? 0.95 : 0.6}
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
              const radius = isTargetDomain ? 20 : 13;
              const label = asset.value.length > 20 ? `${asset.value.slice(0, 18)}…` : asset.value;

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
                    dy={isTargetDomain ? -25 : -17}
                    fill={isSelected ? '#58a6ff' : isHovered ? '#ffffff' : style.text}
                    fontSize={isTargetDomain ? 10.5 : 8.5}
                    fontWeight={isTargetDomain ? 700 : 500}
                    className="pointer-events-none font-mono"
                  >
                    {label}
                  </text>

                  {/* Type Code inside node */}
                  <text
                    textAnchor="middle"
                    dy={3}
                    fill="#ffffff"
                    fontSize={isTargetDomain ? 8.5 : 7}
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
        </div>

        {/* ─── Selected Node Intelligence Panel ───────────────────────── */}
        {activeAsset ? (
          <div className="w-full lg:w-72 bg-[#0c1015] border-t lg:border-t-0 lg:border-l border-[#1e2631] p-3 font-mono text-xs flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2631]">
                <div className="flex items-center gap-1.5 font-bold text-[#e6edf3]">
                  <Info size={12} className="text-[#58a6ff]" />
                  <span>ASSET DOSSIER</span>
                </div>
                <button
                  onClick={() => setActiveAsset(null)}
                  className="text-[#576575] hover:text-[#e6edf3]"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="mt-2.5 space-y-2">
                <div>
                  <div className="text-[10px] text-[#576575] uppercase">TYPE:</div>
                  <div className="text-[#58a6ff] font-bold">{activeAsset.type}</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#576575] uppercase">VALUE:</div>
                  <div className="text-[#e6edf3] font-semibold break-all bg-[#10151b] border border-[#1e2631] p-1.5 mt-0.5">
                    {activeAsset.value}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#576575] uppercase">CONNECTED EDGES:</div>
                  <div className="text-[#3fb950] font-bold">{activeRelationships.length} relationships</div>
                </div>

                {activeRelationships.length > 0 && (
                  <div>
                    <div className="text-[10px] text-[#576575] uppercase mb-1">RELATIONSHIPS:</div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {activeRelationships.map((r, i) => {
                        const targetId = r.fromAssetId === activeAsset.id ? r.toAssetId : r.fromAssetId;
                        const targetAsset = assets.find((a) => a.id === targetId);
                        return (
                          <div key={i} className="text-[10px] p-1 bg-[#10151b] border border-[#1e2631] truncate">
                            <span className="text-[#8b9bb0]">{r.type.replace(/_/g, ' ')}: </span>
                            <span className="text-[#e6edf3] font-semibold">{targetAsset?.value || targetId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e2631] text-[10px] text-[#576575]">
              [CLICK ASSET IN INVENTORY FOR FULL METADATA]
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-72 bg-[#0c1015] border-l border-[#1e2631] p-4 font-mono text-xs items-center justify-center text-center text-[#576575] shrink-0">
            CLICK ANY NODE IN GRAPH TO INSPECT RELATIONSHIPS & ATTRIBUTES
          </div>
        )}
      </div>

      {/* ─── Legend Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2631] bg-[#0c1015] px-3 py-1.5 font-mono text-[10px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#576575]">NODE TYPES:</span>
          {Object.entries(TYPE_COLORS)
            .slice(0, 7)
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
        <span className="text-[#576575] hidden sm:inline">[ANALYST WORKSTATION TOPOLOGY]</span>
      </div>
    </div>
  );
}
