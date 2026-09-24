import { useState, useMemo } from 'react';
import { Layers, Search, Filter, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Asset } from '../../../shared/types';

interface AssetsInventoryTableProps {
  assets: Asset[];
  onSelectAsset?: (asset: Asset) => void;
}

const TYPE_BADGES: Record<Asset['type'], { bg: string; text: string; border: string }> = {
  DOMAIN: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  SUBDOMAIN: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  IP: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  ASN: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  ORGANIZATION: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  NAMESERVER: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  MAIL_SERVER: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  CERTIFICATE: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  GEOLOCATION: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  TECHNOLOGY: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  URL: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Normalized Attack Surface Inventory</h2>
            <p className="text-xs text-slate-400">
              {filteredAssets.length} asset{filteredAssets.length === 1 ? '' : 's'} matching criteria
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/70 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Asset Types</option>
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800/80 bg-slate-950/60 uppercase tracking-wider text-slate-400 text-[10px]">
            <tr>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Identified Value</th>
              <th className="px-5 py-3">Discovery Source</th>
              <th className="px-5 py-3">Confidence</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No assets found matching the query.
                </td>
              </tr>
            ) : (
              paginatedAssets.map((asset) => {
                const badge = TYPE_BADGES[asset.type] || TYPE_BADGES.DOMAIN;
                const primaryEvidence = asset.evidence[0];

                return (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => onSelectAsset?.(asset)}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.border} ${badge.bg} ${badge.text}`}
                      >
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-200">
                      <span className="truncate max-w-md block" title={asset.value}>
                        {asset.value}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {primaryEvidence?.source ?? 'Passive reconnaissance'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          primaryEvidence?.confidence === 'high'
                            ? 'text-emerald-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {primaryEvidence?.confidence ?? 'medium'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset?.(asset);
                        }}
                        className="inline-flex items-center gap-1 text-cyan-400/80 hover:text-cyan-300 font-medium"
                      >
                        Details <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/60 bg-slate-950/50 px-5 py-3 text-xs text-slate-400">
        <span>
          Page {currentPage} of {totalPages} ({filteredAssets.length} total)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded p-1 border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded p-1 border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
