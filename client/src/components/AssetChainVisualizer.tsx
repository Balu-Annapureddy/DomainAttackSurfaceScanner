import { useState, useMemo } from 'react';
import { ArrowRight, Search, Globe, Server, MapPin } from 'lucide-react';
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
    if (!filterSearch.trim()) return chains;
    const q = filterSearch.toLowerCase();
    return chains.filter(
      (c) =>
        c.domainAsset.value.toLowerCase().includes(q) ||
        (c.ipAsset?.value && c.ipAsset.value.toLowerCase().includes(q)) ||
        (c.asnAsset?.value && c.asnAsset.value.toLowerCase().includes(q)) ||
        (c.orgAsset?.value && c.orgAsset.value.toLowerCase().includes(q)) ||
        (c.geoAsset?.value && c.geoAsset.value.toLowerCase().includes(q)),
    );
  }, [chains, filterSearch]);

  return (
    <div className="console-panel p-5 space-y-4">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2735] pb-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#3fb950] font-bold">[TRACE ROUTE]</span>
            <span className="font-bold text-[#e6edf3]">ASSET RESOLUTION & INFRASTRUCTURE CHAINS</span>
          </div>
          <p className="text-xs text-[#9aa5b8] mt-0.5">
            End-to-end telemetry paths: <strong className="text-[#e6edf3]">Domain → IP Address → BGP ASN → Organization → Geolocation</strong>
          </p>
        </div>

        {/* Filter Search */}
        <div className="relative font-mono text-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#626e82]" />
          <input
            type="text"
            placeholder="Search chains..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-8 w-44 sm:w-56 rounded border border-[#1f2735] bg-[#0d121a] pl-7 pr-3 text-xs text-[#e6edf3] placeholder-[#626e82] outline-none focus:border-[#388bfd]"
          />
        </div>
      </div>

      {/* ─── Chain Trace Records ────────────────────────────────────── */}
      <div className="space-y-2.5">
        {filteredChains.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#626e82]">
            NO RESOLUTION CHAINS MATCH QUERY
          </div>
        ) : (
          filteredChains.map((chain, idx) => (
            <div
              key={idx}
              className="console-panel-inset p-3 border border-[#1f2735] hover:border-[#388bfd]/50 transition"
            >
              {/* Chain Steps Horizontal Flow */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {/* Step 1: Host */}
                <button
                  type="button"
                  onClick={() => onSelectAsset?.(chain.domainAsset)}
                  className="console-tag console-tag-cyan hover:brightness-125 cursor-pointer max-w-[200px] truncate"
                  title="Target Domain / Subdomain - Click to inspect"
                >
                  <Globe size={11} className="shrink-0" />
                  <span className="truncate">{chain.domainAsset.value}</span>
                </button>

                <ArrowRight size={12} className="text-[#626e82] shrink-0" />

                {/* Step 2: IP Address */}
                {chain.ipAsset ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.ipAsset!)}
                    className="console-tag hover:border-[#58a6ff] cursor-pointer"
                    title="Resolved IP Endpoint - Click to inspect"
                  >
                    <Server size={11} className="text-[#8a63d2] shrink-0" />
                    <span>{chain.ipAsset.value}</span>
                  </button>
                ) : (
                  <span className="console-tag text-[#626e82]">
                    [UNRESOLVED]
                  </span>
                )}

                {/* Step 3: ASN */}
                {chain.asnAsset && (
                  <>
                    <ArrowRight size={12} className="text-[#626e82] shrink-0" />
                    <button
                      type="button"
                      onClick={() => onSelectAsset?.(chain.asnAsset!)}
                      className="console-tag console-tag-phosphor hover:brightness-125 cursor-pointer"
                      title="BGP Autonomous System Number"
                    >
                      <span>{chain.asnAsset.value}</span>
                    </button>
                  </>
                )}

                {/* Step 4: Hosting Organization */}
                {chain.orgAsset && (
                  <>
                    <ArrowRight size={12} className="text-[#626e82] shrink-0" />
                    <button
                      type="button"
                      onClick={() => onSelectAsset?.(chain.orgAsset!)}
                      className="console-tag hover:border-[#3fb950] cursor-pointer max-w-[180px] truncate text-[#9aa5b8]"
                      title="Operating Network / Cloud Provider"
                    >
                      <span className="truncate">{chain.orgAsset.value}</span>
                    </button>
                  </>
                )}

                {/* Step 5: Approximate Geolocation */}
                {chain.geoAsset && (
                  <>
                    <ArrowRight size={12} className="text-[#626e82] shrink-0" />
                    <button
                      type="button"
                      onClick={() => onSelectAsset?.(chain.geoAsset!)}
                      className="console-tag console-tag-amber hover:brightness-125 cursor-pointer"
                      title="Approximate Datacenter Geolocation"
                    >
                      <MapPin size={10} className="shrink-0" />
                      <span>
                        {String(chain.geoAsset.metadata?.city || chain.geoAsset.metadata?.country || chain.geoAsset.value)}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-[#1f2735] flex items-center justify-between text-[11px] font-mono text-[#626e82]">
        <span>Showing {filteredChains.length} of {chains.length} infrastructure resolution paths</span>
        <span>[CLICK ASSET PILL FOR RAW METADATA]</span>
      </div>
    </div>
  );
}
