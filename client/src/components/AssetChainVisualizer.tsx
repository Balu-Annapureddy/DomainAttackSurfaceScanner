import { useState, useMemo } from 'react';
import { Search, Globe, Server, MapPin } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AssetChainVisualizerProps {
  assets: Asset[];
  relationships: Relationship[];
  onSelectAsset?: (asset: Asset) => void;
  sectionNumber?: string;
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
  sectionNumber = '04',
}: AssetChainVisualizerProps) {
  const [filterSearch, setFilterSearch] = useState('');

  // Compute resolution chains
  const chains = useMemo<ChainPath[]>(() => {
    const domainAndSubdomains = assets.filter((a) => a.type === 'DOMAIN' || a.type === 'SUBDOMAIN');
    const result: ChainPath[] = [];

    for (const host of domainAndSubdomains) {
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
        const asnRel = relationships.find(
          (r) => r.type === 'belongs_to_asn' && (r.fromAssetId === ip.id || r.toAssetId === ip.id),
        );
        const asnAsset = asnRel
          ? assets.find((a) => a.id === (asnRel.fromAssetId === ip.id ? asnRel.toAssetId : asnRel.fromAssetId))
          : undefined;

        const orgRel = relationships.find(
          (r) => r.type === 'operated_by' && (r.fromAssetId === ip.id || r.toAssetId === ip.id),
        );
        const orgAsset = orgRel
          ? assets.find((a) => a.id === (orgRel.fromAssetId === ip.id ? orgRel.toAssetId : orgRel.fromAssetId))
          : undefined;

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
    <div className="console-panel">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>ASSET ROUTING CHAINS</span>
          <span className="text-[11px] text-[#8b9bb0] ml-2">
            TRACE: DOMAIN → IP → ASN → ORG → LOCATION
          </span>
        </div>

        {/* Filter Search */}
        <div className="relative font-mono text-xs">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#576575]" />
          <input
            type="text"
            placeholder="FILTER TRACE..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-6 w-36 sm:w-48 border border-[#1e2631] bg-[#0c1015] pl-6 pr-2 text-[11px] text-[#e6edf3] placeholder-[#576575] outline-none focus:border-[#58a6ff]"
          />
        </div>
      </div>

      {/* ─── Trace Rows (Network Tracing Console) ───────────────────── */}
      <div className="p-3 bg-[#080b0f] space-y-2">
        {filteredChains.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-[#576575]">
            NO RESOLUTION CHAINS MATCH QUERY
          </div>
        ) : (
          filteredChains.map((chain, idx) => (
            <div
              key={idx}
              className="bg-[#10151b] border border-[#1e2631] p-2.5 font-mono text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* 01: Host */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#576575] font-bold">01</span>
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.domainAsset)}
                    className="border border-[#388bfd]/40 bg-[#15273b] text-[#58a6ff] px-2 py-0.5 text-xs font-semibold hover:border-[#58a6ff] cursor-pointer max-w-[210px] truncate flex items-center gap-1"
                    title="Target Host / Subdomain"
                  >
                    <Globe size={10} className="shrink-0" />
                    <span className="truncate">{chain.domainAsset.value}</span>
                  </button>
                </div>

                <span className="text-[#576575] text-xs font-bold">→</span>

                {/* 02: IP Address */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#576575] font-bold">02</span>
                  {chain.ipAsset ? (
                    <button
                      type="button"
                      onClick={() => onSelectAsset?.(chain.ipAsset!)}
                      className="border border-[#1e2631] bg-[#0c1015] text-[#e6edf3] px-2 py-0.5 text-xs font-medium hover:border-[#58a6ff] cursor-pointer flex items-center gap-1"
                      title="Resolved IP"
                    >
                      <Server size={10} className="text-[#8a63d2] shrink-0" />
                      <span>{chain.ipAsset.value}</span>
                    </button>
                  ) : (
                    <span className="border border-[#1e2631] bg-[#0c1015] text-[#576575] px-2 py-0.5 text-xs">
                      UNRESOLVED
                    </span>
                  )}
                </div>

                {/* 03: ASN */}
                {chain.asnAsset && (
                  <>
                    <span className="text-[#576575] text-xs font-bold">→</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#576575] font-bold">03</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.asnAsset!)}
                        className="border border-[#2ea043]/40 bg-[#0f2214] text-[#3fb950] px-2 py-0.5 text-xs font-semibold hover:border-[#3fb950] cursor-pointer"
                        title="BGP ASN"
                      >
                        <span>{chain.asnAsset.value}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* 04: Organization */}
                {chain.orgAsset && (
                  <>
                    <span className="text-[#576575] text-xs font-bold">→</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#576575] font-bold">04</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.orgAsset!)}
                        className="border border-[#1e2631] bg-[#0c1015] text-[#8b9bb0] px-2 py-0.5 text-xs hover:border-[#e6edf3] cursor-pointer max-w-[180px] truncate"
                        title="Operating Network / Cloud Provider"
                      >
                        <span className="truncate">{chain.orgAsset.value}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* 05: Location */}
                {chain.geoAsset && (
                  <>
                    <span className="text-[#576575] text-xs font-bold">→</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#576575] font-bold">05</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.geoAsset!)}
                        className="border border-[#bb8009]/40 bg-[#251a08] text-[#d29922] px-2 py-0.5 text-xs hover:border-[#d29922] cursor-pointer flex items-center gap-1"
                        title="Approximate Datacenter"
                      >
                        <MapPin size={9} className="shrink-0" />
                        <span>
                          {String(chain.geoAsset.metadata?.city || chain.geoAsset.metadata?.country || chain.geoAsset.value)}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <div className="border-t border-[#1e2631] bg-[#0c1015] px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#576575]">
        <span>{filteredChains.length} of {chains.length} resolution traces</span>
        <span>[CLICK ASSET IN TRACE TO INSPECT RAW DETAILS]</span>
      </div>
    </div>
  );
}
