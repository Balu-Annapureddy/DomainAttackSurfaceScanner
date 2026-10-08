import { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search, Info, List, Network } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';
import { generateGraphNarrative } from '../lib/graphNarrative';

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
  PORT: { border: '#eab308', text: '#eab308' },
  VULNERABILITY: { border: '#ef4444', text: '#ef4444' },
  DNSSEC: { border: '#10b981', text: '#10b981' },
  CLOUD_STORAGE: { border: '#0284c7', text: '#0284c7' },
  DOCUMENT_METADATA: { border: '#8b5cf6', text: '#8b5cf6' },
  BREACH_EXPOSURE: { border: '#f97316', text: '#f97316' },
};

export default function AttackSurfaceGraph({
  assets,
  relationships,
  onSelectAsset,
  sectionNumber = '02',
}: AttackSurfaceGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
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

  // Centered, balanced radial node coordinates
  const layout = useMemo(() => {
    const width = 1100;
    const height = 620;
    const centerX = 550;
    const centerY = 310;
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
    const others = filteredAssets.filter(
      (a) => !['DOMAIN', 'SUBDOMAIN', 'IP', 'NAMESERVER', 'MAIL_SERVER', 'CERTIFICATE', 'ASN', 'ORGANIZATION'].includes(a.type),
    );

    const placeRing = (items: Asset[], radius: number, startAngle = 0, angleSpan = 2 * Math.PI) => {
      const step = items.length > 0 ? angleSpan / items.length : 0;
      items.forEach((item, index) => {
        const angle = startAngle + index * step;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        nodeCoords.set(item.id, { x, y });
      });
    };

    placeRing(subdomains, 150, 0, Math.PI);
    placeRing(ips, 190, Math.PI, Math.PI);
    placeRing(nameservers, 230, -Math.PI / 4, Math.PI / 2);
    placeRing(mailServers, 230, Math.PI / 4, Math.PI / 2);
    placeRing(certs, 260, Math.PI * 0.75, Math.PI / 2);
    placeRing(asns, 280, Math.PI * 1.25, Math.PI / 2);
    placeRing(orgs, 290, 0, 2 * Math.PI);
    placeRing(others, 300, Math.PI / 6, 2 * Math.PI);

    return { width, height, nodeCoords };
  }, [filteredAssets]);

  const visibleRelationships = useMemo(() => {
    const visibleIds = new Set(filteredAssets.map((a) => a.id));
    return relationships.filter((r) => visibleIds.has(r.fromAssetId) && visibleIds.has(r.toAssetId));
  }, [relationships, filteredAssets]);

  const activeRelationships = useMemo(() => {
    if (!activeAsset) return [];
    return relationships.filter((r) => r.fromAssetId === activeAsset.id || r.toAssetId === activeAsset.id);
  }, [activeAsset, relationships]);

  const graphNarrative = useMemo(() => {
    return generateGraphNarrative(assets, relationships);
  }, [assets, relationships]);

  const counts = useMemo(() => {
    return {
      ips: assets.filter((a) => a.type === 'IP').length,
      subdomains: assets.filter((a) => a.type === 'SUBDOMAIN').length,
      asns: assets.filter((a) => a.type === 'ASN').length,
      orgs: assets.filter((a) => a.type === 'ORGANIZATION').length,
      nameservers: assets.filter((a) => a.type === 'NAMESERVER').length,
      mailServers: assets.filter((a) => a.type === 'MAIL_SERVER').length,
      certs: assets.filter((a) => a.type === 'CERTIFICATE').length,
    };
  }, [assets]);

  const handleNodeClick = (asset: Asset) => {
    setActiveAsset(asset);
    onSelectAsset?.(asset);
  };

  return (
    <div className="w-full space-y-4">
      {/* ─── Section Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--border-technical)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              [{sectionNumber}] Infrastructure Network Topology
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
              {assets.length} Nodes • {relationships.length} Connections
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-0.5">
            How This Domain Is Connected
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] max-w-md">
          A visual map showing how the target domain connects to public IP addresses, certificate authorities, mail servers, and cloud networks.
        </p>
      </div>

      {/* ─── Two-Column Layout (Desktop) / Stacked (Mobile) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Interactive Topology Graph (7 Cols) */}
        <div className="lg:col-span-7 bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl overflow-hidden shadow-xs flex flex-col">
          {/* Graph Controls Toolbar */}
          <div className="p-3 bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter node..."
                  value={graphSearch}
                  onChange={(e) => setGraphSearch(e.target.value)}
                  className="h-7 w-28 sm:w-36 border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] pl-7 pr-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none rounded-md"
                />
              </div>

              <div className="flex items-center border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] px-2 h-7 rounded-md">
                <Filter size={12} className="text-[var(--text-muted)] mr-1" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-[var(--text-primary)] outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">All Types</option>
                  <option value="DOMAIN">Domains</option>
                  <option value="SUBDOMAIN">Subdomains</option>
                  <option value="IP">IP Addresses</option>
                  <option value="CERTIFICATE">Certificates</option>
                  <option value="ASN">BGP ASNs</option>
                  <option value="ORGANIZATION">Organizations</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] h-7 px-1.5 gap-1.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono text-[var(--text-muted)] min-w-[28px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l border-[var(--border-muted)] pl-1 p-0.5 cursor-pointer"
                  title="Reset zoom"
                >
                  <RotateCcw size={11} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'graph' ? 'list' : 'graph')}
                className="console-btn py-1 px-2.5 text-xs font-semibold flex items-center gap-1.5"
              >
                {viewMode === 'graph' ? <List size={12} /> : <Network size={12} />}
                <span>{viewMode === 'graph' ? 'List' : 'Graph'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Graph Canvas */}
          {viewMode === 'graph' ? (
            <div className="relative bg-[var(--bg-canvas)] min-h-[460px] sm:min-h-[520px] overflow-hidden flex items-center justify-center">
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="w-full h-full select-none"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--border-strong)" opacity={0.6} />
                  </marker>
                </defs>

                {/* Relationship Lines */}
                {visibleRelationships.map((rel, idx) => {
                  const from = layout.nodeCoords.get(rel.fromAssetId);
                  const to = layout.nodeCoords.get(rel.toAssetId);
                  if (!from || !to) return null;
                  const isHighlighted = hoveredNodeId === rel.fromAssetId || hoveredNodeId === rel.toAssetId || activeAsset?.id === rel.fromAssetId || activeAsset?.id === rel.toAssetId;

                  return (
                    <line
                      key={`${rel.fromAssetId}-${rel.toAssetId}-${idx}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isHighlighted ? 'var(--accent-primary)' : 'var(--border-technical)'}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeDasharray={rel.type.includes('observed') ? '4 2' : undefined}
                      opacity={isHighlighted ? 0.9 : 0.4}
                      markerEnd="url(#arrow)"
                    />
                  );
                })}

                {/* Nodes */}
                {filteredAssets.map((asset) => {
                  const coords = layout.nodeCoords.get(asset.id);
                  if (!coords) return null;
                  const isTargetDomain = asset.type === 'DOMAIN';
                  const isSelected = activeAsset?.id === asset.id;
                  const isHovered = hoveredNodeId === asset.id;
                  const style = TYPE_COLORS[asset.type] || { border: '#64748b', text: '#64748b' };
                  const radius = isTargetDomain ? 24 : 15;
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
                      {(isSelected || isHovered) && (
                        <circle
                          r={radius + 5}
                          fill="none"
                          stroke={isSelected ? 'var(--accent-primary)' : style.border}
                          strokeWidth={1.5}
                          strokeDasharray="3 2"
                        />
                      )}
                      <circle
                        r={radius}
                        className="fill-[var(--bg-panel-elevated)]"
                        stroke={isSelected ? 'var(--accent-primary)' : isHovered ? 'var(--text-primary)' : style.border}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        textAnchor="middle"
                        dy={isTargetDomain ? -28 : -18}
                        fill={isSelected ? 'var(--accent-primary)' : 'var(--text-primary)'}
                        fontSize={isTargetDomain ? 11 : 9}
                        fontWeight={isTargetDomain ? 700 : 500}
                        className="pointer-events-none font-mono"
                      >
                        {label}
                      </text>
                      <text
                        textAnchor="middle"
                        dy={3.5}
                        fill={style.border}
                        fontSize={isTargetDomain ? 9 : 7}
                        fontWeight={700}
                        className="pointer-events-none font-mono uppercase"
                      >
                        {asset.type.slice(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="p-4 bg-[var(--bg-panel)] divide-y divide-[var(--border-muted)] max-h-[520px] overflow-y-auto text-xs">
              {filteredAssets.map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleNodeClick(a)}
                  className="py-2.5 px-3 flex items-center justify-between hover:bg-[var(--bg-panel-subtle)] cursor-pointer rounded-md transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border bg-[var(--bg-panel-inset)]">
                      {a.type}
                    </span>
                    <span className="font-mono text-[var(--text-primary)] truncate">{a.value}</span>
                  </div>
                  <span className="text-[11px] text-[var(--accent-primary)] font-semibold shrink-0">Inspect →</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend Strip */}
          <div className="p-3 bg-[var(--bg-panel-subtle)] border-t border-[var(--border-muted)] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-muted)]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span>TYPES:</span>
              {['DOMAIN', 'IP', 'SUBDOMAIN', 'ASN', 'CERTIFICATE'].map((t) => (
                <span key={t} className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t as Asset['type']]?.border }} />
                  <span>{t}</span>
                </span>
              ))}
            </div>
            <span>Click any node to inspect details</span>
          </div>
        </div>

        {/* Right Column: Detailed Explanation Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                Topology Explanation
              </span>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Understanding This Infrastructure Map
              </h3>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)]">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Servers (IPs)</div>
                <div className="text-xl font-display italic text-[var(--text-primary)]">{counts.ips}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)]">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Subdomains</div>
                <div className="text-xl font-display italic text-[var(--text-primary)]">{counts.subdomains}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)]">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Networks (ASNs)</div>
                <div className="text-xl font-display italic text-[var(--text-primary)]">{counts.asns}</div>
              </div>
            </div>

            {/* Dynamic Narrative Prose */}
            <div className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>{graphNarrative}</p>
            </div>

            {/* What the connections mean in plain English */}
            <div className="pt-3 border-t border-[var(--border-muted)] space-y-2 text-xs">
              <span className="font-bold text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider block">
                What The Connection Lines Mean:
              </span>
              <ul className="space-y-1.5 text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)] font-bold shrink-0">•</span>
                  <span><strong>Domain → IP:</strong> Indicates that visitor web traffic resolving to this domain is routed to that public server address.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)] font-bold shrink-0">•</span>
                  <span><strong>IP → ASN:</strong> Identifies which internet routing network (Autonomous System) operates that physical server.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)] font-bold shrink-0">•</span>
                  <span><strong>Domain → Certificate:</strong> Shows which public cryptographic certificate secures connections to this domain.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Active Node Inspector (when an asset is selected) */}
          {activeAsset && (
            <div className="bg-[var(--bg-panel)] border border-[var(--accent-primary)]/40 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)]">
                  <Info size={14} />
                  <span>Selected Node: {activeAsset.type}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAsset(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Clear Selection
                </button>
              </div>

              <div className="p-2.5 bg-[var(--bg-panel-inset)] rounded-md border border-[var(--border-muted)] font-mono text-xs break-all font-semibold text-[var(--text-primary)] select-all">
                {activeAsset.value}
              </div>

              {activeRelationships.length > 0 && (
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Direct Relationships ({activeRelationships.length}):</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {activeRelationships.map((r, i) => {
                      const targetId = r.fromAssetId === activeAsset.id ? r.toAssetId : r.fromAssetId;
                      const targetAsset = assets.find((a) => a.id === targetId);
                      return (
                        <div key={i} className="p-1.5 bg-[var(--bg-panel-inset)] rounded border border-[var(--border-muted)] text-[11px] flex justify-between">
                          <span className="text-[var(--text-muted)]">{r.type.replace(/_/g, ' ')}</span>
                          <span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[180px]">{targetAsset?.value || targetId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
