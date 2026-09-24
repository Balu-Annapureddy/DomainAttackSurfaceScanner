import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  History,
  Radar,
  GitCompare,
  CheckSquare,
  Square,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  AlertTriangle,
  Download,
  Calendar,
} from 'lucide-react';
import IntelligenceTimeline, { type HistoryItem } from '../components/IntelligenceTimeline';
import { getScan } from '../lib/api';
import { exportScanJson, exportAssetsCsv } from '../lib/export';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [timelineDomain, setTimelineDomain] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  let items: HistoryItem[] = [];
  try {
    items = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as HistoryItem[];
  } catch {
    /* corrupted local history is treated as empty */
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
          `Scans must be for the same domain to compare ("${firstItem.domain}" vs "${item.domain}")`
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

  const handleQuickExport = async (scanId: string, format: 'json' | 'csv') => {
    try {
      setDownloadingId(`${scanId}-${format}`);
      const scanData = await getScan(scanId);
      if (format === 'json') {
        exportScanJson(scanData);
      } else {
        exportAssetsCsv(scanData);
      }
    } catch {
      alert('Could not export scan. It may have expired or is still running.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold hover:text-cyan-400 transition">
          <Radar className="text-cyan-400" /> Domain Attack Surface Scanner
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition">
          <ArrowLeft size={17} /> New scan
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <History className="text-cyan-400" />
              <h1 className="text-3xl font-bold">Scan History & Intelligence Logs</h1>
            </div>
            <p className="mt-2 text-slate-400 text-xs sm:text-sm">
              Review saved scans, inspect historical timelines, generate executive reports, or compare drift.
            </p>
          </div>

          {selectedScanIds.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs">
              <span className="text-cyan-300 font-medium">
                {selectedScanIds.length} of 2 selected for comparison
              </span>
              {selectedScanIds.length === 2 && (
                <button
                  type="button"
                  onClick={handleLaunchCompare}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1 font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <GitCompare size={14} /> Compare Scans
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedScanIds([])}
                className="text-slate-400 hover:text-white text-xs underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {compareError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
            <span>{compareError}</span>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-700 p-12 text-center">
            <Clock size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-300 font-medium">No previous scans found in this browser.</p>
            <p className="text-xs text-slate-500 mt-1">Run a scan on any domain to start tracking its attack surface.</p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              Start your first scan
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              const domainKey = item.domain.toLowerCase();
              const hasMultipleScans = (scanCountsByDomain[domainKey] || 0) > 1;

              const score = item.score;
              const hasScore = score !== undefined && score !== null;
              const scoreBadgeColor = !hasScore
                ? 'bg-slate-800 text-slate-400'
                : score >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : score >= 60
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : score >= 40
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';

              return (
                <div
                  key={item.scanId}
                  className={`group relative rounded-2xl border bg-slate-900/80 p-5 transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Domain, Score & Select Checkbox */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white text-base truncate max-w-[200px]" title={item.domain}>
                          {item.domain}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar size={11} />
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasScore && (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${scoreBadgeColor}`}>
                            {score}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSelect(item)}
                          className="p-1 text-slate-400 hover:text-cyan-400 transition"
                          title={isSelected ? 'Deselect' : 'Select for comparison'}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-cyan-400" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Pills: Status, Assets, Findings */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-medium text-slate-400 uppercase">
                        {item.status ? item.status.replace(/_/g, ' ') : 'Completed'}
                      </span>

                      {item.assetCount !== undefined && (
                        <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-slate-300">
                          <Layers size={10} className="text-cyan-400" />
                          {item.assetCount} assets
                        </span>
                      )}

                      {item.findingCount !== undefined && (
                        <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-slate-300">
                          <AlertTriangle size={10} className="text-amber-400" />
                          {item.findingCount} findings
                        </span>
                      )}
                    </div>

                    {/* Timeline Action if multiple scans exist */}
                    {hasMultipleScans && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setTimelineDomain(item.domain)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline"
                        >
                          <GitCompare size={12} />
                          View {item.domain} Timeline ({scanCountsByDomain[domainKey]} scans)
                        </button>
                      </div>
                    )}

                    <p className="font-mono text-[10px] text-slate-600 truncate">{item.scanId}</p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/scan/${item.scanId}`}
                        className="flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 transition"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </Link>

                      <span className="text-slate-700">|</span>

                      <Link
                        to={`/report/${item.scanId}`}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
                        title="View printable dossier"
                      >
                        <FileText size={12} />
                        <span>Report</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickExport(item.scanId, 'json')}
                        disabled={downloadingId === `${item.scanId}-json`}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white transition disabled:opacity-50"
                        title="Download JSON"
                      >
                        <Download size={10} className="inline mr-0.5" />
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickExport(item.scanId, 'csv')}
                        disabled={downloadingId === `${item.scanId}-csv`}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white transition disabled:opacity-50"
                        title="Download CSV"
                      >
                        <Download size={10} className="inline mr-0.5" />
                        CSV
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
