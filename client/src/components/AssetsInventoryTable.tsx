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
    <div className="console-panel">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>ASSET INVENTORY</span>
          <span className="text-[11px] text-[#8b9bb0] ml-2">
            {filteredAssets.length} NORMALIZED ENTITIES
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#576575]" />
            <input
              type="text"
              placeholder="SEARCH ASSET..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-6 w-32 sm:w-44 border border-[#1e2631] bg-[#0c1015] pl-6 pr-2 text-[11px] text-[#e6edf3] placeholder-[#576575] outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="flex items-center border border-[#1e2631] bg-[#0c1015] px-1.5 h-6 text-[11px]">
            <Filter size={10} className="text-[#576575] mr-1" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[#e6edf3] outline-none cursor-pointer"
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
                <td colSpan={5} className="py-6 text-center text-[#576575]">
                  NO ASSET RECORDS MATCHING FILTER
                </td>
              </tr>
            ) : (
              paginatedAssets.map((asset) => {
                const isGeo = asset.type === 'GEOLOCATION';
                const statusLabel = isGeo ? 'APPROXIMATE' : 'OBSERVED';
                const statusColor = isGeo ? 'text-[#d29922]' : 'text-[#3fb950]';
                const sources = asset.evidence.map((e) => e.source).join(', ') || 'DNS / CT';

                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset?.(asset)}
                    className="cursor-pointer hover:bg-[#151c23] transition-colors"
                  >
                    <td>
                      <span className="text-[10px] text-[#58a6ff] font-bold">
                        {asset.type}
                      </span>
                    </td>
                    <td className="text-[#e6edf3] font-semibold">
                      <span className="truncate block max-w-xs sm:max-w-md" title={asset.value}>
                        {asset.value}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="text-[#8b9bb0] text-[11px] truncate max-w-xs">
                      {sources}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset?.(asset);
                        }}
                        className="text-[#58a6ff] hover:underline text-[10px] cursor-pointer"
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
      <div className="flex items-center justify-between border-t border-[#1e2631] bg-[#0c1015] px-3 py-1.5 font-mono text-[10px] text-[#8b9bb0]">
        <span>
          PAGE {currentPage} OF {totalPages} ({filteredAssets.length} TOTAL)
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="border border-[#1e2631] bg-[#10151b] px-1.5 py-0.5 disabled:opacity-30 text-[#e6edf3] hover:border-[#58a6ff]"
          >
            <ChevronLeft size={11} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="border border-[#1e2631] bg-[#10151b] px-1.5 py-0.5 disabled:opacity-30 text-[#e6edf3] hover:border-[#58a6ff]"
          >
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
