import { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Asset } from '../../../shared/types';

interface AssetsInventoryTableProps {
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
  sectionNumber?: string;
}

export default function AssetsInventoryTable({
  assets,
  onSelectAsset,
  sectionNumber = '06',
}: AssetsInventoryTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      const matchesSearch =
        search === '' ||
        item.value.toLowerCase().includes(search.toLowerCase()) ||
        item.evidence.some((e) => e.description.toLowerCase().includes(search.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [assets, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const assetTypes = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.type))).sort();
  }, [assets]);

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide">ASSET INVENTORY</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono ml-2">
            {filteredAssets.length} ENTITIES
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto font-sans text-xs">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Filter assets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full sm:w-56 border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] rounded-lg shadow-inner"
            />
          </div>

          <div className="flex items-center border border-[var(--border-technical)] bg-[var(--bg-panel-inset)] px-2.5 h-9 rounded-lg shadow-inner">
            <Filter size={13} className="text-[var(--text-muted)] mr-1.5" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[var(--text-primary)] outline-none cursor-pointer text-xs font-medium"
            >
              <option value="ALL">All Types ({assets.length})</option>
              {assetTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({assets.filter((a) => a.type === t).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Desktop View: Sticky Header + Zebra Striped Table ─────── */}
      <div className="hidden md:block overflow-x-auto max-h-[620px] overflow-y-auto">
        <table className="console-table w-full">
          <thead className="sticky top-0 z-10 bg-[var(--bg-panel-subtle)] backdrop-blur-xs border-b border-[var(--border-technical)]">
            <tr>
              <th className="w-32">TYPE</th>
              <th>VALUE / IDENTIFIER</th>
              <th className="w-32">STATUS</th>
              <th>OBSERVED EVIDENCE / SOURCE</th>
              <th className="w-24 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] text-sm">
                  No asset records match the current filter query
                </td>
              </tr>
            ) : (
              paginatedAssets.map((asset, idx) => {
                const isGeo = asset.type === 'GEOLOCATION';
                const statusLabel = isGeo ? 'APPROXIMATE' : 'OBSERVED';
                const statusClass = isGeo
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
                
                const uniqueSources = Array.from(new Set(asset.evidence.map((e) => e.source).filter(Boolean)));
                const sources = uniqueSources.length > 0 ? uniqueSources.join(' • ') : 'DNS / CT Logs';

                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset?.(asset)}
                    className={`cursor-pointer transition-colors hover:bg-[var(--accent-active-bg)] ${
                      idx % 2 === 1 ? 'bg-[var(--bg-panel-subtle)]/40' : ''
                    }`}
                  >
                    <td>
                      <span className="console-tag console-tag-phosphor">
                        {asset.type}
                      </span>
                    </td>
                    <td className="text-[var(--text-primary)] font-medium">
                      <span className="truncate block max-w-sm lg:max-w-md font-mono text-xs select-all" title={asset.value}>
                        {asset.value}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)] text-xs truncate max-w-xs lg:max-w-sm">
                      {sources}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset?.(asset);
                        }}
                        className="text-[var(--accent-primary)] hover:underline text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>INSPECT</span>
                        <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile View: High-Impact Stacked Cards (No Side-Scroll!) ── */}
      <div className="md:hidden divide-y divide-[var(--border-muted)] bg-[var(--bg-panel)]">
        {paginatedAssets.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm px-4">
            No asset records match the current filter query
          </div>
        ) : (
          paginatedAssets.map((asset) => {
            const isGeo = asset.type === 'GEOLOCATION';
            const statusLabel = isGeo ? 'APPROXIMATE' : 'OBSERVED';
            const statusClass = isGeo
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

            const uniqueSources = Array.from(new Set(asset.evidence.map((e) => e.source).filter(Boolean)));
            const sources = uniqueSources.length > 0 ? uniqueSources.join(' • ') : 'DNS / CT Logs';

            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset?.(asset)}
                className="p-4 space-y-2.5 active:bg-[var(--accent-active-bg)] transition-colors cursor-pointer"
              >
                {/* Header row: Type badge + Status badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="console-tag console-tag-phosphor">
                    {asset.type}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Main identifier */}
                <div className="font-mono text-sm font-bold text-[var(--text-primary)] break-all select-all">
                  {asset.value}
                </div>

                {/* Evidence source & inspect button */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-muted)] text-xs">
                  <span className="text-[var(--text-secondary)] text-[11px] truncate max-w-[200px]">
                    {sources}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsset?.(asset);
                    }}
                    className="text-[var(--accent-primary)] font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>INSPECT</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Pagination Footer ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
        <span>
          PAGE {currentPage} OF {totalPages} ({filteredAssets.length} TOTAL)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="console-btn py-1 px-2.5 text-xs disabled:opacity-30 rounded-lg cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="console-btn py-1 px-2.5 text-xs disabled:opacity-30 rounded-lg cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
