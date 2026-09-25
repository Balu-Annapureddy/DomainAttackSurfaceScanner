import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitCompare,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Calendar,
  Terminal,
} from 'lucide-react';
import IntelligenceTimeline, { type HistoryItem } from '../components/IntelligenceTimeline';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [timelineDomain, setTimelineDomain] = useState<string | null>(null);

  let items: HistoryItem[] = [];
  try {
    items = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as HistoryItem[];
  } catch {
    /* corrupted local history */
  }

  // Count scans by domain
  const scanCountsByDomain = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.domain.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const toggleSelect = (item: HistoryItem) => {
    setCompareError(null);
    if (selectedScanIds.includes(item.scanId)) {
      setSelectedScanIds(selectedScanIds.filter((id) => id !== item.scanId));
      return;
    }

    if (selectedScanIds.length === 0) {
      setSelectedScanIds([item.scanId]);
      return;
    }

    if (selectedScanIds.length === 1) {
      const firstItem = items.find((i) => i.scanId === selectedScanIds[0]);
      if (firstItem && firstItem.domain.toLowerCase() !== item.domain.toLowerCase()) {
        setCompareError(
          `Scans must be for the same domain to compare ("${firstItem.domain}" vs "${item.domain}")`,
        );
        return;
      }
      setSelectedScanIds([...selectedScanIds, item.scanId]);
      return;
    }

    // If 2 already selected, replace selection with newly clicked one
    setSelectedScanIds([item.scanId]);
  };

  const handleLaunchCompare = () => {
    if (selectedScanIds.length !== 2) return;
    const item1 = items.find((i) => i.scanId === selectedScanIds[0]);
    const item2 = items.find((i) => i.scanId === selectedScanIds[1]);
    if (!item1 || !item2) return;

    // Sort chronologically: older scan is baseline, newer is target
    const time1 = new Date(item1.createdAt).getTime();
    const time2 = new Date(item2.createdAt).getTime();
    const [base, target] = time1 <= time2 ? [item1, item2] : [item2, item1];

    navigate(`/compare/${encodeURIComponent(base.scanId)}/${encodeURIComponent(target.scanId)}`);
  };

  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] font-mono">
      {/* ─── Top Console Header ───────────────────────────────────── */}
      <header className="border-b border-[#1f2735] bg-[#111620]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-tight text-[#e6edf3] hover:text-[#58a6ff] transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#388bfd]/40 bg-[#162030] text-[#58a6ff]">
              <Terminal size={15} />
            </div>
            <span>DOMAIN ATTACK SURFACE SCANNER</span>
          </Link>

          <Link
            to="/"
            className="console-btn console-btn-primary py-1.5 px-3 text-xs"
          >
            <ArrowLeft size={13} />
            <span>NEW SCAN</span>
          </Link>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1f2735] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="console-tag console-tag-cyan">LOGS // HISTORICAL_ARCHIVE</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[#e6edf3] sm:text-2xl">
              SCAN HISTORY & INTELLIGENCE ARCHIVE
            </h1>
            <p className="mt-0.5 text-xs text-[#9aa5b8] font-sans">
              Review stored perimeter scans, launch timeline drift visualizers, generate dossiers, or compare delta.
            </p>
          </div>

          {selectedScanIds.length > 0 && (
            <div className="flex items-center gap-3 console-panel-inset p-2.5 text-xs border border-[#388bfd]/40">
              <span className="text-[#58a6ff]">
                [{selectedScanIds.length}/2 SELECTED FOR DIFF]
              </span>
              {selectedScanIds.length === 2 && (
                <button
                  type="button"
                  onClick={handleLaunchCompare}
                  className="console-btn console-btn-primary py-1 px-2.5 text-xs"
                >
                  <GitCompare size={12} />
                  <span>COMPARE SCANS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedScanIds([])}
                className="text-[#626e82] hover:text-[#e6edf3] text-xs underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {compareError && (
          <div className="console-panel-inset border-l-2 border-l-[#f85149] p-3 text-xs text-[#f85149] flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>[COMPARISON CONFLICT]: {compareError}</span>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="console-panel p-12 text-center space-y-3">
            <Clock size={28} className="mx-auto text-[#626e82]" />
            <p className="text-sm font-bold text-[#e6edf3]">NO PREVIOUS SCANS RECORDED</p>
            <p className="text-xs text-[#9aa5b8] font-sans max-w-sm mx-auto">
              Initiate a scan on any domain to start tracking public perimeter telemetry and drift over time.
            </p>
            <Link
              to="/"
              className="console-btn console-btn-primary inline-flex text-xs mt-2"
            >
              <span>START SCAN</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              const domainKey = item.domain.toLowerCase();
              const hasMultipleScans = (scanCountsByDomain[domainKey] || 0) > 1;

              const score = item.score;
              const hasScore = score !== undefined && score !== null;

              return (
                <div
                  key={item.scanId}
                  className={`console-panel p-4 flex flex-col justify-between transition ${
                    isSelected ? 'border-[#388bfd] bg-[#162030]' : 'hover:border-[#388bfd]/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#1f2735] pb-2.5">
                      <div className="space-y-0.5 truncate">
                        <span className="font-bold text-sm text-[#e6edf3] block truncate" title={item.domain}>
                          {item.domain}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-[#626e82]">
                          <Calendar size={10} />
                          <span>{new Date(item.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                        </div>
                      </div>

                      {/* Select Checkbox for Comparison */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(item)}
                        className="text-[#626e82] hover:text-[#58a6ff] p-1 transition"
                        title={isSelected ? 'Deselect from comparison' : 'Select for comparison'}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-[#58a6ff]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </div>

                    {/* Metadata & Score Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                      <span className="console-tag">
                        STATUS // {item.status ? item.status.toUpperCase() : 'UNKNOWN'}
                      </span>
                      {hasScore && (
                        <span
                          className={`console-tag ${
                            score >= 80
                              ? 'console-tag-phosphor'
                              : score >= 60
                              ? 'console-tag-cyan'
                              : score >= 40
                              ? 'console-tag-amber'
                              : 'console-tag-coral'
                          }`}
                        >
                          SCORE // {score}/100
                        </span>
                      )}
                      {item.assetCount !== undefined && (
                        <span className="console-tag">
                          {item.assetCount} ASSETS
                        </span>
                      )}
                      {item.findingCount !== undefined && (
                        <span className="console-tag">
                          {item.findingCount} FINDINGS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#1f2735] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/scan/${item.scanId}`}
                        className="console-btn py-1 px-2 text-[10px] text-[#58a6ff]"
                      >
                        [OPEN]
                      </Link>
                      <Link
                        to={`/report/${item.scanId}`}
                        className="console-btn py-1 px-2 text-[10px] text-[#9aa5b8]"
                      >
                        [REPORT]
                      </Link>
                    </div>

                    {hasMultipleScans && (
                      <button
                        type="button"
                        onClick={() => setTimelineDomain(item.domain)}
                        className="console-btn console-btn-phosphor py-1 px-2 text-[10px]"
                        title="View chronological drift timeline across multiple scans of this domain"
                      >
                        [TIMELINE]
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Intelligence Timeline Modal */}
      {timelineDomain && (
        <IntelligenceTimeline
          domain={timelineDomain}
          scans={items.filter((i) => i.domain.toLowerCase() === timelineDomain.toLowerCase())}
          onClose={() => setTimelineDomain(null)}
        />
      )}
    </main>
  );
}
