import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, History, Radar, GitCompare, CheckSquare, Square, AlertCircle } from 'lucide-react';

interface HistoryItem {
  scanId: string;
  domain: string;
  createdAt: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);

  let items: HistoryItem[] = [];
  try {
    items = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as HistoryItem[];
  } catch {
    /* corrupted local history is treated as empty */
  }

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

    // If 2 already selected, replace selection with the newly clicked one
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <Radar className="text-cyan-400" /> Domain Attack Surface Scanner
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft size={17} /> New scan
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <History className="text-cyan-400" />
              <h1 className="text-3xl font-bold">Scan history</h1>
            </div>
            <p className="mt-2 text-slate-400">
              Recent scans saved in this browser. Select any two scans of the same domain to inspect drift.
            </p>
          </div>

          {selectedScanIds.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs">
              <span className="text-cyan-300 font-medium">
                {selectedScanIds.length} of 2 selected
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
            <AlertCircle size={15} className="text-rose-400" />
            <span>{compareError}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-700 p-12 text-center">
            <p className="text-slate-300">No scans yet.</p>
            <Link to="/" className="mt-4 inline-block text-cyan-400 hover:underline">
              Start your first scan
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              return (
                <div
                  key={item.scanId}
                  className={`group relative rounded-2xl border bg-slate-900 p-5 transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="pr-2">
                        <p className="font-semibold text-white">{item.domain}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(item);
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-400 transition"
                        title={isSelected ? 'Deselect for comparison' : 'Select for comparison'}
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-cyan-400" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </div>
                    <p className="mt-4 truncate font-mono text-xs text-slate-600">
                      {item.scanId}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <Link
                      to={`/scan/${item.scanId}`}
                      className="flex items-center gap-1 text-cyan-400/80 hover:text-cyan-300 transition"
                    >
                      <span>View scan</span>
                      <ExternalLink size={13} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleSelect(item)}
                      className={`text-xs font-medium transition ${
                        isSelected ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select to compare'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
