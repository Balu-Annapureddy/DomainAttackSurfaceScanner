import { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Asset } from '../../../shared/types';

interface AssetsInventoryTableProps {
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
}

export default function AssetsInventoryTable({ assets, onSelectAsset }: AssetsInventoryTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

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
    <div className="console-panel overflow-hidden space-y-0">
      {/* ─── Header & Filters ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-[#1f2735] p-3.5 sm:flex-row sm:items-center sm:justify-between bg-[#111620]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#58a6ff] font-bold">[INVENTORY]</span>
            <span className="font-bold text-[#e6edf3]">NORMALIZED ATTACK SURFACE ASSETS</span>
          </div>
          <p className="text-xs text-[#9aa5b8] mt-0.5">
            {filteredAssets.length} normalized entity records matching criteria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#626e82]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 w-36 sm:w-48 rounded border border-[#1f2735] bg-[#0d121a] pl-7 pr-3 text-xs text-[#e6edf3] placeholder-[#626e82] outline-none focus:border-[#388bfd]"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 rounded border border-[#1f2735] bg-[#0d121a] px-2 py-1 text-xs">
            <Filter size={11} className="text-[#626e82]" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[#e6edf3] outline-none cursor-pointer text-xs"
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

      {/* ─── Inventory Table ────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="console-table">
          <thead>
            <tr>
              <th className="w-12">TYPE</th>
              <th>IDENTIFIED ASSET VALUE</th>
              <th>EVIDENCE SOURCES</th>
              <th>CONFIDENCE</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171e2b] font-mono text-xs">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#626e82]">
                  NO ASSETS MATCHING QUERY
                </td>
              </tr>
            ) : (
              paginatedAssets.map((asset) => {
                const highConf = asset.evidence.some((e) => e.confidence === 'high');

                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset?.(asset)}
                    className="cursor-pointer hover:bg-[#161c28] transition"
                  >
                    <td>
                      <span className="console-tag text-[10px]">
                        {asset.type}
                      </span>
                    </td>
                    <td className="font-bold text-[#e6edf3]">
                      <span className="truncate block max-w-sm sm:max-w-md" title={asset.value}>
                        {asset.value}
                      </span>
                    </td>
                    <td className="text-[#9aa5b8] text-[11px]">
                      {asset.evidence.map((e) => e.source).join(', ')}
                    </td>
                    <td>
                      <span
                        className={`console-tag text-[9px] ${
                          highConf ? 'console-tag-phosphor' : 'console-tag-cyan'
                        }`}
                      >
                        {highConf ? 'HIGH' : 'MEDIUM'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset?.(asset);
                        }}
                        className="console-btn py-1 px-2 text-[10px] text-[#58a6ff]"
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
      <div className="flex items-center justify-between border-t border-[#1f2735] bg-[#0d121a] px-4 py-2.5 font-mono text-xs text-[#9aa5b8]">
        <span>
          PAGE {currentPage} OF {totalPages} ({filteredAssets.length} TOTAL)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="console-btn py-1 px-2 text-xs"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="console-btn py-1 px-2 text-xs"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
