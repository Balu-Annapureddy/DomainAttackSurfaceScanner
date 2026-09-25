import { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="console-panel rounded-xs">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>ASSET INVENTORY</span>
          <span className="text-[11px] text-[var(--text-secondary)] ml-2">
            {filteredAssets.length} NORMALIZED ENTITIES
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="SEARCH ASSET..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-6 w-32 sm:w-44 border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] pl-6 pr-2 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] rounded-xs"
            />
          </div>

          <div className="flex items-center border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-1.5 h-6 text-[11px] rounded-xs">
            <Filter size={10} className="text-[var(--text-muted)] mr-1" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="ALL">ALL TYPES ({assets.length})</option>
              {assetTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({assets.filter((a) => a.type === t).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── High-Density Technical Table ───────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="console-table font-mono">
          <thead>
            <tr>
              <th className="w-24">TYPE</th>
              <th>VALUE</th>
              <th className="w-28">STATUS</th>
              <th>OBSERVED EVIDENCE / SOURCE</th>
              <th className="w-16 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">
                  NO ASSET RECORDS MATCHING FILTER
                </td>
              </tr>
            ) : (
              paginatedAssets.map((asset) => {
                const isGeo = asset.type === 'GEOLOCATION';
                const statusLabel = isGeo ? 'APPROXIMATE' : 'OBSERVED';
                const statusColor = isGeo ? 'text-[#d97706] dark:text-[#f59e0b]' : 'text-[#16a34a] dark:text-[#2ee59d]';
                const sources = asset.evidence.map((e) => e.source).join(', ') || 'DNS / CT';

                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset?.(asset)}
                    className="cursor-pointer transition-colors"
                  >
                    <td>
                      <span className="text-[10px] text-[var(--accent-primary)] font-bold">
                        {asset.type}
                      </span>
                    </td>
                    <td className="text-[var(--text-primary)] font-semibold">
                      <span className="truncate block max-w-xs sm:max-w-md font-mono" title={asset.value}>
                        {asset.value}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)] text-[11px] truncate max-w-xs">
                      {sources}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset?.(asset);
                        }}
                        className="text-[var(--accent-primary)] hover:underline text-[10px] cursor-pointer"
                      >
                        [INSPECT]
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination Footer ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-3 py-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
        <span>
          PAGE {currentPage} OF {totalPages} ({filteredAssets.length} TOTAL)
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="border border-[var(--border-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 disabled:opacity-30 text-[var(--text-primary)] hover:border-[var(--accent-primary)] rounded-xs cursor-pointer"
          >
            <ChevronLeft size={11} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="border border-[var(--border-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 disabled:opacity-30 text-[var(--text-primary)] hover:border-[var(--accent-primary)] rounded-xs cursor-pointer"
          >
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
