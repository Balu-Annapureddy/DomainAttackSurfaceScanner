import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GitCompare,
  CheckSquare,
  Square,
  AlertCircle,
  Calendar,
  Trash2,
  Database,
  User,
  ArrowRight,
} from 'lucide-react';
import IntelligenceTimeline, { type HistoryItem } from '../components/IntelligenceTimeline';
import WorkstationNav from '../components/WorkstationNav';
import { useAuth } from '../context/AuthContext';
import { getUserScanHistory, deleteSavedScan } from '../lib/api';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [timelineDomain, setTimelineDomain] = useState<string | null>(null);
  const [serverScans, setServerScans] = useState<HistoryItem[]>([]);
  const [loadingServerScans, setLoadingServerScans] = useState(false);

  // Load persistent history if user is authenticated
  useEffect(() => {
    let isCancelled = false;
    async function loadHistory() {
      if (!user) return;
      try {
        setLoadingServerScans(true);
        const data = await getUserScanHistory();
        if (!isCancelled) {
          setServerScans(
            data.map((s) => ({
              scanId: s.scanId,
              domain: s.domain,
              createdAt: s.createdAt,
              status: s.status,
              score: s.score,
              assetCount: s.assetCount,
              findingCount: s.findingCount,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load server history:', err);
      } finally {
        if (!isCancelled) setLoadingServerScans(false);
      }
    }
    void loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Fallback to local storage for guest / anonymous users
  let localItems: HistoryItem[] = [];
  try {
    localItems = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as HistoryItem[];
  } catch {
    /* corrupted local history */
  }

  const items = user ? serverScans : localItems;

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

  const handleDelete = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan record?')) return;
    try {
      if (user) {
        await deleteSavedScan(scanId);
        setServerScans((prev) => prev.filter((s) => s.scanId !== scanId));
      } else {
        const next = localItems.filter((s) => s.scanId !== scanId);
        localStorage.setItem('domain_scanner_scans', JSON.stringify(next));
        window.location.reload();
      }
      setSelectedScanIds((prev) => prev.filter((id) => id !== scanId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to delete scan');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono pb-16 flex flex-col transition-colors duration-150">
      <WorkstationNav />

      <main className="flex-1 mx-auto max-w-7xl px-4 py-6 w-full space-y-5">
        {/* Page Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-technical)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)] font-bold">
              <Database size={13} />
              <span>RECONNAISSANCE ARCHIVE</span>
              <span>•</span>
              <span className="text-[var(--text-secondary)]">{items.length} SAVED SCANS</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight mt-0.5">
              {user ? `PERSISTENT DOSSIER ARCHIVE (${user.email})` : 'LOCAL BROWSER SCAN HISTORY'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" className="console-btn console-btn-primary py-1 px-3 text-xs">
              + NEW RECON SCAN
            </Link>
          </div>
        </div>

        {/* Guest Mode Informational Banner */}
        {!user && (
          <div className="console-panel p-3.5 bg-[var(--bg-panel-subtle)] border-l-2 border-l-[var(--accent-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <User size={13} className="text-[var(--accent-primary)]" />
                <span>GUEST SESSION ACTIVE</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Scan records are stored locally in your browser and limited to 5 scans/hour. Register for free to persist scans in the database, compare chronologically across devices, and unlock 50 scans/hour.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/register" className="console-btn console-btn-primary py-1 px-3 text-xs flex items-center gap-1">
                <span>REGISTER FREE</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        )}

        {/* Comparison Action Bar */}
        {selectedScanIds.length > 0 && (
          <div className="console-panel p-3 flex flex-wrap items-center justify-between gap-3 bg-[var(--accent-active-bg)] border-[var(--accent-primary)]">
            <div className="flex items-center gap-2 text-xs">
              <GitCompare size={14} className="text-[var(--accent-primary)]" />
              <span className="font-bold text-[var(--text-primary)]">
                {selectedScanIds.length} OF 2 SCANS SELECTED FOR COMPARISON
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedScanIds([])}
                className="console-btn py-1 px-2.5 text-xs text-[var(--text-secondary)]"
              >
                CLEAR SELECTION
              </button>
              <button
                type="button"
                disabled={selectedScanIds.length !== 2}
                onClick={handleLaunchCompare}
                className="console-btn console-btn-primary py-1 px-3 text-xs"
              >
                COMPARE SELECTED SCANS
              </button>
            </div>
          </div>
        )}

        {compareError && (
          <div className="p-2.5 border border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444] flex items-center gap-2 text-xs">
            <AlertCircle size={14} />
            <span>{compareError}</span>
          </div>
        )}

        {/* Scan Records Listing */}
        {loadingServerScans ? (
          <div className="console-panel p-8 text-center text-xs text-[var(--text-secondary)]">
            RETRIEVING ENCRYPTED ARCHIVE RECORDS…
          </div>
        ) : items.length === 0 ? (
          <div className="console-panel p-10 text-center space-y-3">
            <Database size={24} className="mx-auto text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">NO RECONNAISSANCE DOSSIERS FOUND</h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Initiate a passive reconnaissance assessment from the main console to begin building perimeter intelligence.
            </p>
            <Link to="/" className="console-btn console-btn-primary inline-flex text-xs py-1 px-3 mt-2">
              LAUNCH FIRST SCAN
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              const hasMultipleScans = (scanCountsByDomain[item.domain.toLowerCase()] || 0) > 1;

              return (
                <div
                  key={item.scanId}
                  className={`console-panel p-3.5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-active-bg)] shadow-md'
                      : 'hover:border-[var(--border-technical)]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item)}
                          className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer"
                          title={isSelected ? 'Deselect for comparison' : 'Select for comparison'}
                          aria-label={`Select ${item.domain} for comparison`}
                        >
                          {isSelected ? (
                            <CheckSquare size={14} className="text-[var(--accent-primary)]" />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                        <h2 className="text-xs font-bold text-[var(--text-primary)] truncate" title={item.domain}>
                          {item.domain}
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(item.scanId)}
                        className="text-[var(--text-muted)] hover:text-[#ef4444] p-0.5 cursor-pointer transition-colors"
                        title="Delete scan record"
                        aria-label={`Delete scan record for ${item.domain}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Metadata Strip */}
                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                      <Calendar size={11} className="text-[var(--text-muted)]" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>

                    {/* Telemetry pill row */}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      {item.score !== undefined && (
                        <span className="console-tag console-tag-phosphor">
                          SCORE: {item.score}/100
                        </span>
                      )}
                      <span className="console-tag">
                        {item.assetCount || 0} ASSETS
                      </span>
                      <span className="console-tag">
                        {item.findingCount || 0} FINDINGS
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-2 border-t border-[var(--border-muted)] flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/scan/${encodeURIComponent(item.scanId)}`}
                        className="console-btn py-0.5 px-2 text-[10px] text-[var(--accent-primary)]"
                      >
                        [OPEN CONSOLE]
                      </Link>
                      <Link
                        to={`/report/${encodeURIComponent(item.scanId)}`}
                        className="console-btn py-0.5 px-2 text-[10px] text-[var(--text-secondary)]"
                      >
                        [DOSSIER]
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
      </main>

      {/* Legal Footer */}
      <footer className="mt-auto border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] py-3 px-4 text-center text-[11px] text-[var(--text-muted)] flex flex-wrap justify-center items-center gap-4">
        <span>DOMAIN ATTACK SURFACE SCANNER</span>
        <span>&middot;</span>
        <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition-colors">Privacy Policy</Link>
        <span>&middot;</span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)] transition-colors">Terms of Use</Link>
        <span>&middot;</span>
        <Link to="/security" className="hover:text-[var(--accent-primary)] transition-colors">Security &amp; Vulnerability Disclosure</Link>
      </footer>

      {/* Intelligence Timeline Modal */}
      {timelineDomain && (
        <IntelligenceTimeline
          domain={timelineDomain}
          scans={items.filter((i) => i.domain.toLowerCase() === timelineDomain.toLowerCase())}
          onClose={() => setTimelineDomain(null)}
        />
      )}
    </div>
  );
}
