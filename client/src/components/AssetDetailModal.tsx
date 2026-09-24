import { X, GitFork, ShieldCheck, Calendar, Info } from 'lucide-react';
import type { Asset, Relationship } from '../../../shared/types';

interface AssetDetailModalProps {
  asset: Asset | null;
  assets: Asset[];
  relationships: Relationship[];
  onClose: () => void;
  onSelectRelatedAsset?: (asset: Asset) => void;
}

export default function AssetDetailModal({
  asset,
  assets,
  relationships,
  onClose,
  onSelectRelatedAsset,
}: AssetDetailModalProps) {
  if (!asset) return null;

  // Find incoming & outgoing relationships
  const outgoing = relationships
    .filter((r) => r.fromAssetId === asset.id)
    .map((r) => ({
      relationship: r,
      targetAsset: assets.find((a) => a.id === r.toAssetId),
    }));

  const incoming = relationships
    .filter((r) => r.toAssetId === asset.id)
    .map((r) => ({
      relationship: r,
      sourceAsset: assets.find((a) => a.id === r.fromAssetId),
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 p-5 bg-slate-950/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {asset.type}
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {asset.id.slice(0, 8)}…</span>
            </div>
            <h2 className="text-lg font-bold text-white font-mono break-all">{asset.value}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Metadata Section if available */}
          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info size={12} className="text-cyan-400" />
                Structured Metadata
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      {key}
                    </span>
                    <span className="font-mono text-slate-200 break-all">
                      {value === null || value === undefined ? 'Not specified' : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Relationships */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <GitFork size={12} className="text-blue-400" />
              Connected Infrastructure Relationships ({incoming.length + outgoing.length})
            </span>

            <div className="space-y-1.5">
              {incoming.map(({ relationship, sourceAsset }, i) => (
                <div
                  key={`in-${i}`}
                  onClick={() => sourceAsset && onSelectRelatedAsset?.(sourceAsset)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Incoming:</span>
                    <span className="font-mono text-white font-medium">{sourceAsset?.value ?? 'Unknown'}</span>
                  </div>
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                    {relationship.type}
                  </span>
                </div>
              ))}

              {outgoing.map(({ relationship, targetAsset }, i) => (
                <div
                  key={`out-${i}`}
                  onClick={() => targetAsset && onSelectRelatedAsset?.(targetAsset)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Outgoing:</span>
                    <span className="font-mono text-white font-medium">{targetAsset?.value ?? 'Unknown'}</span>
                  </div>
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-blue-300">
                    {relationship.type}
                  </span>
                </div>
              ))}

              {incoming.length === 0 && outgoing.length === 0 && (
                <p className="text-xs text-slate-500 italic p-2">No direct relational edges connected.</p>
              )}
            </div>
          </div>

          {/* Evidence Records */}
          <div className="space-y-2 border-t border-slate-800/60 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              Observed Evidence & Discovery Citations ({asset.evidence.length})
            </span>

            <div className="space-y-2">
              {asset.evidence.map((ev, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{ev.source}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        ev.confidence === 'high'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {ev.confidence} confidence
                    </span>
                  </div>
                  <p className="text-slate-300">{ev.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Calendar size={11} />
                    <span>Observed {new Date(ev.observedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800/80 p-4 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
