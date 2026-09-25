import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0e14]/85 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col console-panel shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#1f2735] p-4 bg-[#111620]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="console-tag console-tag-cyan text-[10px]">
                {asset.type}
              </span>
              <span className="text-[11px] text-[#626e82]">ID: {asset.id.slice(0, 8)}…</span>
            </div>
            <h2 className="text-sm font-bold text-[#e6edf3] break-all">{asset.value}</h2>
          </div>
          <button
            onClick={onClose}
            className="console-btn py-1 px-2 text-[#9aa5b8] hover:text-[#e6edf3]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-xs">
          {/* Metadata Section if available */}
          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
            <div className="console-panel-inset p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] block">
                EXTRACTED ATTRIBUTE METADATA
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(asset.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-[#1f2735]">
                    <span className="text-[#626e82]">{k}:</span>
                    <span className="text-[#e6edf3] truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships (Connected Edges) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9aa5b8] block">
              TOPOLOGY EDGES & RESOLUTION PATHS ({outgoing.length + incoming.length})
            </span>

            {outgoing.length === 0 && incoming.length === 0 ? (
              <div className="console-panel-inset p-3 text-[#626e82] text-center">
                NO OBSERVED GRAPH EDGES LINKED TO THIS ENTITY
              </div>
            ) : (
              <div className="space-y-1.5">
                {outgoing.map((item, idx) => (
                  <div
                    key={`out-${idx}`}
                    onClick={() => item.targetAsset && onSelectRelatedAsset?.(item.targetAsset)}
                    className="console-panel p-2 flex items-center justify-between gap-3 cursor-pointer hover:border-[#388bfd] transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#3fb950] font-bold">→</span>
                      <span className="text-[#626e82]">[{item.relationship.type}]</span>
                      <span className="text-[#e6edf3] font-bold">{item.targetAsset?.value ?? 'Unknown Node'}</span>
                    </div>
                    {item.targetAsset && (
                      <span className="console-tag text-[9px]">
                        {item.targetAsset.type}
                      </span>
                    )}
                  </div>
                ))}

                {incoming.map((item, idx) => (
                  <div
                    key={`in-${idx}`}
                    onClick={() => item.sourceAsset && onSelectRelatedAsset?.(item.sourceAsset)}
                    className="console-panel p-2 flex items-center justify-between gap-3 cursor-pointer hover:border-[#388bfd] transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#58a6ff] font-bold">←</span>
                      <span className="text-[#626e82]">[{item.relationship.type}]</span>
                      <span className="text-[#e6edf3] font-bold">{item.sourceAsset?.value ?? 'Unknown Node'}</span>
                    </div>
                    {item.sourceAsset && (
                      <span className="console-tag text-[9px]">
                        {item.sourceAsset.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence Chains */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9aa5b8] block">
              OBSERVABLE EVIDENCE SOURCES ({asset.evidence.length})
            </span>
            <div className="space-y-1.5">
              {asset.evidence.map((ev, idx) => (
                <div key={idx} className="console-panel p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#58a6ff] font-bold">{ev.source}</span>
                    <span className="console-tag text-[9px]">
                      {ev.confidence.toUpperCase()}_CONFIDENCE
                    </span>
                  </div>
                  <p className="text-[#9aa5b8] font-sans">{ev.description}</p>
                  <div className="text-[10px] text-[#626e82] pt-1">
                    TIMESTAMP: {new Date(ev.observedAt).toUTCString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#1f2735] p-3 bg-[#111620] flex items-center justify-between text-xs">
          <span className="text-[10px] text-[#626e82]">CLICK RELATED ASSET TO NAVIGATE GRAPH</span>
          <button
            onClick={onClose}
            className="console-btn py-1 px-3 text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
