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
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header px-4 sm:px-5 py-3.5 flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide text-sm">ASSET ROUTING CHAINS</span>
          <span className="text-xs text-[var(--text-secondary)] ml-1 font-sans">
            TRACE: DOMAIN &rarr; IP &rarr; ASN &rarr; ORG &rarr; LOCATION
          </span>
        </div>

        {/* Filter Search */}
        <div className="relative font-sans text-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Filter trace nodes..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-8 w-44 sm:w-64 border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] rounded-lg transition"
          />
        </div>
      </div>

      {/* ─── Trace Rows (Network Tracing Console) ───────────────────── */}
      <div className="p-4 sm:p-5 bg-[var(--bg-canvas)] space-y-3">
        {filteredChains.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            NO RESOLUTION CHAINS MATCH QUERY
          </div>
        ) : (
          filteredChains.map((chain, idx) => (
            <div
              key={idx}
              className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-3.5 text-xs rounded-xl shadow-xs transition hover:border-[var(--border-technical)]"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* 01: Host */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">01</span>
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(chain.domainAsset)}
                    className="border border-[var(--accent-primary)]/40 bg-[var(--accent-active-bg)] text-[var(--accent-primary)] px-2.5 py-1 text-xs font-bold hover:border-[var(--accent-primary)] cursor-pointer max-w-[240px] truncate flex items-center gap-1.5 rounded-lg transition"
                    title="Target Host / Subdomain"
                  >
                    <Globe size={12} className="shrink-0" />
                    <span className="truncate">{chain.domainAsset.value}</span>
                  </button>
                </div>

                <span className="text-[var(--text-muted)] text-xs font-bold">&rarr;</span>

                {/* 02: IP Address */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">02</span>
                  {chain.ipAsset ? (
                    <button
                      type="button"
                      onClick={() => onSelectAsset?.(chain.ipAsset!)}
                      className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-primary)] px-2.5 py-1 text-xs font-semibold hover:border-[var(--accent-primary)] cursor-pointer flex items-center gap-1.5 rounded-lg transition"
                      title="Resolved IP"
                    >
                      <Server size={12} className="text-[#8b5cf6] shrink-0" />
                      <span>{chain.ipAsset.value}</span>
                    </button>
                  ) : (
                    <span className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-muted)] px-2.5 py-1 text-xs rounded-lg">
                      UNRESOLVED
                    </span>
                  )}
                </div>

                {/* 03: ASN */}
                {chain.asnAsset && (
                  <>
                    <span className="text-[var(--text-muted)] text-xs font-bold">&rarr;</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">03</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.asnAsset!)}
                        className="border border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] dark:text-[#2ee59d] px-2.5 py-1 text-xs font-semibold hover:border-[#16a34a] cursor-pointer rounded-lg transition"
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
                    <span className="text-[var(--text-muted)] text-xs font-bold">&rarr;</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">04</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.orgAsset!)}
                        className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-secondary)] px-2.5 py-1 text-xs font-medium hover:border-[var(--text-primary)] cursor-pointer max-w-[200px] truncate rounded-lg transition"
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
                    <span className="text-[var(--text-muted)] text-xs font-bold">&rarr;</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">05</span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset?.(chain.geoAsset!)}
                        className="border border-[#d97706]/40 bg-[#d97706]/10 text-[#d97706] dark:text-[#f59e0b] px-2.5 py-1 text-xs font-medium hover:border-[#d97706] cursor-pointer flex items-center gap-1 rounded-lg transition"
                        title="Approximate Datacenter"
                      >
                        <MapPin size={11} className="shrink-0" />
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
      <div className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-2.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{filteredChains.length} of {chains.length} resolution traces</span>
        <span className="text-[11px]">[CLICK ASSET IN TRACE TO INSPECT EVIDENCE]</span>
      </div>
    </div>
  );
}
