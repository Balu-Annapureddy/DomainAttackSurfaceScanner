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

    setSelectedScanIds([item.scanId]);
  };

  const handleLaunchCompare = () => {
    if (selectedScanIds.length !== 2) return;
    const item1 = items.find((i) => i.scanId === selectedScanIds[0]);
    const item2 = items.find((i) => i.scanId === selectedScanIds[1]);
    if (!item1 || !item2) return;

    const time1 = new Date(item1.createdAt).getTime();
    const time2 = new Date(item2.createdAt).getTime();
    const [base, target] = time1 <= time2 ? [item1, item2] : [item2, item1];

    navigate(`/compare/${encodeURIComponent(base.scanId)}/${encodeURIComponent(target.scanId)}`);
  };

  return (
    <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] font-mono pb-16">
      {/* ─── Compact Workstation Header ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#1e2631] bg-[#10151b] px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-bold text-[#58a6ff] hover:text-[#e6edf3] transition"
            >
              <span>DAS // WORKSTATION</span>
            </Link>
            <span className="text-[#1e2631]">|</span>
            <div className="flex items-center gap-2 text-[11px] text-[#8b9bb0]">
              <span className="text-[#3fb950] font-semibold">HISTORICAL_ARCHIVE</span>
              <span>•</span>
              <span className="text-[#576575]">{items.length} RECORDS</span>
            </div>
          </div>

          <Link
            to="/"
            className="console-btn console-btn-primary py-0.5 px-2.5 text-[11px]"
          >
            <ArrowLeft size={12} />
            <span>NEW SCAN</span>
          </Link>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 space-y-4">
        {/* Header & Diff Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1e2631] pb-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#e6edf3] sm:text-lg">
              SCAN ARCHIVE & CHRONOLOGICAL HISTORY
            </h1>
            <p className="mt-0.5 text-xs text-[#8b9bb0] font-sans">
              Review stored perimeter scans, launch timeline drift visualizers, generate dossiers, or compare deltas.
            </p>
          </div>

          {selectedScanIds.length > 0 && (
            <div className="flex items-center gap-2.5 bg-[#0c1015] p-2 text-xs border border-[#388bfd]">
              <span className="text-[#58a6ff] font-bold">
                [{selectedScanIds.length}/2 FOR DIFF]
              </span>
              {selectedScanIds.length === 2 && (
                <button
                  type="button"
                  onClick={handleLaunchCompare}
                  className="console-btn console-btn-primary py-0.5 px-2 text-[11px]"
                >
                  <GitCompare size={11} />
                  <span>COMPARE</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedScanIds([])}
                className="text-[#576575] hover:text-[#e6edf3] text-xs underline cursor-pointer"
              >
                CLEAR
              </button>
            </div>
          )}
        </div>

        {compareError && (
          <div className="bg-[#0c1015] border-l-2 border-[#f85149] p-2.5 text-xs text-[#f85149] flex items-center gap-2">
            <AlertCircle size={13} className="shrink-0" />
            <span>[COMPARISON CONFLICT]: {compareError}</span>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="console-panel p-10 text-center space-y-2">
            <Clock size={24} className="mx-auto text-[#576575]" />
            <p className="text-xs font-bold text-[#e6edf3]">NO PREVIOUS SCANS RECORDED</p>
            <p className="text-xs text-[#8b9bb0] font-sans max-w-sm mx-auto">
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
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              const domainKey = item.domain.toLowerCase();
              const hasMultipleScans = (scanCountsByDomain[domainKey] || 0) > 1;

              const score = item.score;
              const hasScore = score !== undefined && score !== null;

              return (
                <div
                  key={item.scanId}
                  className={`bg-[#10151b] border p-3 flex flex-col justify-between transition ${
                    isSelected ? 'border-[#58a6ff] bg-[#15273b]' : 'border-[#1e2631] hover:border-[#58a6ff]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#1e2631] pb-2">
                      <div className="space-y-0.5 truncate">
                        <span className="font-bold text-sm text-[#e6edf3] block truncate" title={item.domain}>
                          {item.domain}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-[#576575]">
                          <Calendar size={10} />
                          <span>{new Date(item.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSelect(item)}
                        className="text-[#576575] hover:text-[#58a6ff] p-0.5 cursor-pointer"
                        title={isSelected ? 'Deselect from comparison' : 'Select for comparison'}
                      >
                        {isSelected ? (
                          <CheckSquare size={15} className="text-[#58a6ff]" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </div>

                    {/* Metadata & Score Tags */}
                    <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                      <span className="console-tag">
                        STATUS: {item.status ? item.status.toUpperCase() : 'UNKNOWN'}
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
                          SCORE: {score}/100
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

                  {/* Actions Bar */}
                  <div className="mt-3 pt-2 border-t border-[#1e2631] flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/scan/${item.scanId}`}
                        className="console-btn py-0.5 px-2 text-[10px] text-[#58a6ff]"
                      >
                        [OPEN]
                      </Link>
                      <Link
                        to={`/report/${item.scanId}`}
                        className="console-btn py-0.5 px-2 text-[10px] text-[#8b9bb0]"
                      >
                        [REPORT]
                      </Link>
                    </div>

                    {hasMultipleScans && (
                      <button
                        type="button"
                        onClick={() => setTimelineDomain(item.domain)}
                        className="console-btn console-btn-phosphor py-0.5 px-2 text-[10px]"
                        title="View chronological drift timeline"
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
