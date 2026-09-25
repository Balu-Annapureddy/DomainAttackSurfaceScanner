import { useState, useMemo } from 'react';
import { Globe, Server, Network, Building2, MapPin, ArrowRight, Search } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AssetChainVisualizerProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
}

interface ChainPath {
  domainAsset: Asset;
  ipAsset?: Asset;
  asnAsset?: Asset;
  orgAsset?: Asset;
  geoAsset?: Asset;
}

export default function AssetChainVisualizer({
  assets,
  relationships,
  onSelectAsset,
}: AssetChainVisualizerProps) {
  const [filterSearch, setFilterSearch] = useState('');

  // Compute resolution chains
  const chains = useMemo<ChainPath[]>(() => {
    const domainAndSubdomains = assets.filter((a) => a.type === 'DOMAIN' || a.type === 'SUBDOMAIN');
    const result: ChainPath[] = [];

    for (const host of domainAndSubdomains) {
      // Find resolves_to relationship
      const ipRels = relationships.filter(
        (r) => r.type === 'resolves_to' && (r.fromAssetId === host.id || r.toAssetId === host.id),
      );

      const targetIpAssets = ipRels
        .map((r) => assets.find((a) => a.id === (r.fromAssetId === host.id ? r.toAssetId : r.fromAssetId)))
        .filter((a): a is Asset => Boolean(a && a.type === 'IP'));

      if (targetIpAssets.length === 0) {
        // Unresolved subdomain or pending
        result.push({ domainAsset: host });
        continue;
      }

      for (const ip of targetIpAssets) {
        // Find ASN
        const asnRel = relationships.find(
          (r) => r.type === 'belongs_to_asn' && (r.fromAssetId === ip.id || r.toAssetId === ip.id),
        );
        const asnAsset = asnRel
          ? assets.find((a) => a.id === (asnRel.fromAssetId === ip.id ? asnRel.toAssetId : asnRel.fromAssetId))
          : undefined;

        // Find Organization
        const orgRel = relationships.find(
          (r) => r.type === 'operated_by' && (r.fromAssetId === ip.id || r.toAssetId === ip.id),
        );
        const orgAsset = orgRel
          ? assets.find((a) => a.id === (orgRel.fromAssetId === ip.id ? orgRel.toAssetId : orgRel.fromAssetId))
          : undefined;

        // Find Geolocation
        const geoRel = relationships.find(
          (r) => r.type === 'located_approximately_at' && (r.fromAssetId === ip.id || r.toAssetId === ip.id),
        );
        const geoAsset = geoRel
          ? assets.find((a) => a.id === (geoRel.fromAssetId === ip.id ? geoRel.toAssetId : geoRel.fromAssetId))
          : undefined;

        result.push({
          domainAsset: host,
          ipAsset: ip,
          asnAsset,
          orgAsset,
          geoAsset,
        });
      }
    }

    return result;
  }, [assets, relationships]);

  const filteredChains = useMemo(() => {
    if (!filterSearch) return chains;
    const q = filterSearch.toLowerCase();
    return chains.filter((c) =>
      c.domainAsset.value.toLowerCase().includes(q) ||
      (c.ipAsset?.value && c.ipAsset.value.toLowerCase().includes(q)) ||
      (c.asnAsset?.value && c.asnAsset.value.toLowerCase().includes(q)) ||
      (c.orgAsset?.value && c.orgAsset.value.toLowerCase().includes(q)) ||
      (c.geoAsset?.value && c.geoAsset.value.toLowerCase().includes(q))
    );
  }, [chains, filterSearch]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Network size={15} />
            </span>
            <h3 className="text-base font-bold text-white">Asset Relationship Chains</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end routing hierarchy: <strong className="text-slate-300">Domain → IP → ASN → Organization → Approximate Location</strong>
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter chain targets…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Explanatory Guidance */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 text-xs text-cyan-200/90 flex items-start gap-2.5">
        <span className="text-cyan-400 font-bold text-sm">⛓️</span>
        <div>
          <strong>How this chain works:</strong> Each row traces an observable perimeter asset through DNS resolution down to its physical hosting provider and routing announcement. Click any node in the chain to open its full cryptographic and discovery evidence.
        </div>
      </div>

      {/* Chains List */}
      <div className="space-y-3">
        {filteredChains.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center text-xs text-slate-400">
            No relationship chains match your search filter.
          </div>
        ) : (
          filteredChains.slice(0, 20).map((chain, index) => (
            <div
              key={`${chain.domainAsset.id}-${chain.ipAsset?.id ?? index}`}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* 1. Domain / Subdomain */}
                <button
                  type="button"
                  onClick={() => onSelectAsset?.(chain.domainAsset)}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-cyan-300 font-semibold hover:bg-cyan-500/20 transition"
                  title="Click to view domain evidence"
                >
                  <Globe size={13} />
                  <span>{chain.domainAsset.value}</span>
                </button>

                <ArrowRight size={13} className="text-slate-600 shrink-0" />

                {/* 2. Resolved IP */}
                {chain.ipAsset ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.ipAsset!)}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-blue-300 font-mono text-[11px] hover:bg-blue-500/20 transition"
                    title="Click to view IP evidence"
                  >
                    <Server size={13} />
                    <span>{chain.ipAsset.value}</span>
                  </button>
                ) : (
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-500 text-[11px] italic">
                    Unresolved
                  </span>
                )}

                <ArrowRight size={13} className="text-slate-600 shrink-0" />

                {/* 3. BGP ASN */}
                {chain.asnAsset ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.asnAsset!)}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-indigo-300 text-[11px] hover:bg-indigo-500/20 transition"
                    title="Click to view ASN evidence"
                  >
                    <Network size={13} />
                    <span>{chain.asnAsset.value}</span>
                  </button>
                ) : (
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-600 text-[11px]">
                    ASN unknown
                  </span>
                )}

                <ArrowRight size={13} className="text-slate-600 shrink-0" />

                {/* 4. Organization */}
                {chain.orgAsset ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.orgAsset!)}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-purple-300 text-[11px] hover:bg-purple-500/20 transition max-w-[200px] truncate"
                    title="Click to view Organization evidence"
                  >
                    <Building2 size={13} />
                    <span className="truncate">{chain.orgAsset.value}</span>
                  </button>
                ) : (
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-600 text-[11px]">
                    Org unknown
                  </span>
                )}

                <ArrowRight size={13} className="text-slate-600 shrink-0" />

                {/* 5. Approximate Geolocation */}
                {chain.geoAsset ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.geoAsset!)}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300 text-[11px] hover:bg-emerald-500/20 transition max-w-[220px] truncate"
                    title="Click to view Location details (approximate network datacenter location)"
                  >
                    <MapPin size={13} />
                    <span className="truncate">{chain.geoAsset.value}</span>
                  </button>
                ) : (
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-600 text-[11px]">
                    Location unknown
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filteredChains.length > 20 && (
        <p className="text-center text-xs text-slate-500 pt-2">
          Showing 20 of {filteredChains.length} discovered routing paths. Use search to filter specific hosts.
        </p>
      )}
    </div>
  );
}
