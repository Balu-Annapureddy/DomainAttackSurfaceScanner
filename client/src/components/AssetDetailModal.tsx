import { useEffect } from 'react';
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
  useEffect(() => {
    if (!asset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [asset, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col console-panel shadow-2xl overflow-hidden font-mono rounded-xs">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-muted)] p-4 bg-[var(--bg-panel-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="console-tag console-tag-cyan text-[10px]">
                {asset.type}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">ID: {asset.id.slice(0, 8)}…</span>
            </div>
            <h2 id="asset-modal-title" className="text-sm font-bold text-[var(--text-primary)] break-all font-mono">{asset.value}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close asset details"
            className="console-btn py-1 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-xs bg-[var(--bg-panel)]">
          {/* Metadata Section if available */}
          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
            <div className="console-panel-inset p-3 space-y-2 rounded-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                EXTRACTED ATTRIBUTE METADATA
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(asset.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-[var(--border-muted)]">
                    <span className="text-[var(--text-muted)] font-mono">{k}:</span>
                    <span className="text-[var(--text-primary)] truncate font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships (Connected Edges) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
              TOPOLOGY EDGES &amp; RESOLUTION PATHS ({outgoing.length + incoming.length})
            </span>

            {outgoing.length === 0 && incoming.length === 0 ? (
              <div className="console-panel-inset p-3 text-[var(--text-muted)] text-center rounded-xs">
                NO OBSERVED GRAPH EDGES LINKED TO THIS ENTITY
              </div>
            ) : (
              <div className="space-y-1.5">
                {outgoing.map((item, idx) => (
                  <div
                    key={`out-${idx}`}
                    onClick={() => item.targetAsset && onSelectRelatedAsset?.(item.targetAsset)}
                    className="console-panel p-2 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent-primary)] transition text-xs rounded-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#16a34a] dark:text-[#2ee59d] font-bold">&rarr;</span>
                      <span className="text-[var(--text-muted)]">[{item.relationship.type}]</span>
                      <span className="text-[var(--text-primary)] font-bold truncate">{item.targetAsset?.value ?? 'Unknown Node'}</span>
                    </div>
                    {item.targetAsset && (
                      <span className="console-tag text-[9px] shrink-0">
                        {item.targetAsset.type}
                      </span>
                    )}
                  </div>
                ))}

                {incoming.map((item, idx) => (
                  <div
                    key={`in-${idx}`}
                    onClick={() => item.sourceAsset && onSelectRelatedAsset?.(item.sourceAsset)}
                    className="console-panel p-2 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent-primary)] transition text-xs rounded-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[var(--accent-primary)] font-bold">&larr;</span>
                      <span className="text-[var(--text-muted)]">[{item.relationship.type}]</span>
                      <span className="text-[var(--text-primary)] font-bold truncate">{item.sourceAsset?.value ?? 'Unknown Node'}</span>
                    </div>
                    {item.sourceAsset && (
                      <span className="console-tag text-[9px] shrink-0">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
              OBSERVABLE EVIDENCE SOURCES ({asset.evidence.length})
            </span>
            <div className="space-y-1.5">
              {asset.evidence.map((ev, idx) => (
                <div key={idx} className="console-panel p-3 space-y-1 text-xs rounded-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--accent-primary)] font-bold">{ev.source}</span>
                    <span className="console-tag text-[9px]">
                      {ev.confidence.toUpperCase()}_CONFIDENCE
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] font-sans">{ev.description}</p>
                  <div className="text-[10px] text-[var(--text-muted)] pt-1">
                    TIMESTAMP: {new Date(ev.observedAt).toUTCString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[var(--border-muted)] p-3 bg-[var(--bg-panel-subtle)] flex items-center justify-between text-xs">
          <span className="text-[10px] text-[var(--text-muted)]">CLICK RELATED ASSET TO NAVIGATE GRAPH</span>
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
