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
  const { user, deleteAccount } = useAuth();
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [timelineDomain, setTimelineDomain] = useState<string | null>(null);
  const [serverScans, setServerScans] = useState<HistoryItem[]>([]);
  const [loadingServerScans, setLoadingServerScans] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

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

  const handleConfirmDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      setDeleteAccountError(null);
      await deleteAccount();
      setShowDeleteModal(false);
      navigate('/');
    } catch (err) {
      setDeleteAccountError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteModal) {
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans pb-20 flex flex-col transition-colors duration-150">
      <WorkstationNav />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-8">
        {/* Page Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-technical)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)] font-bold">
              <Database size={15} />
              <span>RECONNAISSANCE ARCHIVE</span>
              <span>•</span>
              <span className="text-[var(--text-secondary)]">{items.length} Saved Scans</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
              {user ? `Persistent Scan Archive (${user.email})` : 'Local Browser Scan History'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="console-btn-primary py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
              <span>+ NEW RECON SCAN</span>
            </Link>
          </div>
        </div>

        {/* Guest Mode Informational Banner */}
        {!user && (
          <div className="console-panel p-5 bg-[var(--bg-panel-subtle)] border-l-4 border-l-[var(--accent-primary)] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <User size={15} className="text-[var(--accent-primary)]" />
                <span>Guest Session Active</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                Scan records are stored locally in your browser and limited to 5 scans/hour. Register for free to persist scans in the database, compare chronologically across devices, and unlock 50 scans/hour.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/register" className="console-btn-primary py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <span>REGISTER FREE</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Comparison Action Bar */}
        {selectedScanIds.length > 0 && (
          <div className="console-panel p-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--accent-active-bg)] border-[var(--accent-primary)] rounded-xl shadow-md">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <GitCompare size={16} className="text-[var(--accent-primary)]" />
              <span className="font-bold text-[var(--text-primary)]">
                {selectedScanIds.length} of 2 scans selected for differencing
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedScanIds([])}
                className="console-btn py-1.5 px-3 text-xs text-[var(--text-secondary)] rounded-md"
              >
                Clear Selection
              </button>
              <button
                type="button"
                disabled={selectedScanIds.length !== 2}
                onClick={handleLaunchCompare}
                className="console-btn-primary py-1.5 px-4 text-xs rounded-md font-bold shadow-xs cursor-pointer"
              >
                Compare Selected Scans
              </button>
            </div>
          </div>
        )}

        {compareError && (
          <div className="p-3 border border-red-400 bg-red-500/10 text-red-500 rounded-lg flex items-center gap-2 text-xs sm:text-sm">
            <AlertCircle size={16} />
            <span>{compareError}</span>
          </div>
        )}

        {/* Scan Records Listing */}
        {loadingServerScans ? (
          <div className="console-panel p-12 text-center text-sm text-[var(--text-secondary)] rounded-xl">
            <div className="inline-block w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-2" />
            <p>Retrieving encrypted archive records…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="console-panel p-12 text-center space-y-4 rounded-xl">
            <Database size={32} className="mx-auto text-[var(--text-muted)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">No Reconnaissance Dossiers Found</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Initiate a passive reconnaissance assessment from the main console to begin building perimeter intelligence.
            </p>
            <Link to="/" className="console-btn-primary inline-flex text-xs font-bold py-2 px-4 rounded-lg mt-2">
              Launch First Scan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const isSelected = selectedScanIds.includes(item.scanId);
              const hasMultipleScans = (scanCountsByDomain[item.domain.toLowerCase()] || 0) > 1;

              return (
                <div
                  key={item.scanId}
                  className={`console-panel p-5 rounded-xl transition-all flex flex-col justify-between hover:shadow-lg ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-active-bg)] shadow-md'
                      : 'hover:border-[var(--border-technical)]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item)}
                          className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer shrink-0"
                          title={isSelected ? 'Deselect for comparison' : 'Select for comparison'}
                          aria-label={`Select ${item.domain} for comparison`}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[var(--accent-primary)]" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                        <h2 className="text-sm sm:text-base font-bold font-mono text-[var(--text-primary)] truncate" title={item.domain}>
                          {item.domain}
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(item.scanId)}
                        className="text-[var(--text-muted)] hover:text-red-500 p-1 cursor-pointer transition-colors shrink-0"
                        title="Delete scan record"
                        aria-label={`Delete scan record for ${item.domain}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Metadata Strip */}
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                      <Calendar size={13} className="text-[var(--text-muted)]" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>

                    {/* Telemetry pill row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
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
                  <div className="mt-4 pt-3 border-t border-[var(--border-muted)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/scan/${encodeURIComponent(item.scanId)}`}
                        className="console-btn py-1 px-2.5 text-xs text-[var(--accent-primary)] font-semibold rounded-md"
                      >
                        Console
                      </Link>
                      <Link
                        to={`/report/${encodeURIComponent(item.scanId)}`}
                        className="console-btn py-1 px-2.5 text-xs text-[var(--text-secondary)] font-medium rounded-md"
                      >
                        Dossier
                      </Link>
                    </div>

                    {hasMultipleScans && (
                      <button
                        type="button"
                        onClick={() => setTimelineDomain(item.domain)}
                        className="console-btn console-btn-phosphor py-1 px-2.5 text-xs font-semibold rounded-md cursor-pointer"
                        title="View chronological drift timeline"
                      >
                        Timeline
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Authenticated Account Privacy & Erasure Control */}
        <div className="pt-8 border-t border-[var(--border-muted)] mt-12">
        {user && (
          <div className="console-panel p-4 border-l-2 border-l-[var(--border-technical)] space-y-2 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  ACCOUNT DATA MANAGEMENT &amp; PRIVACY RIGHTS (GDPR / DPDP)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Logged in as <span className="text-[var(--text-primary)] font-semibold">{user.email}</span> &middot; ID: {user.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="console-btn py-1 px-3 text-[11px] text-[#ef4444] border-[#ef4444]/40 hover:bg-[#ef4444]/10 transition"
              >
                <Trash2 size={12} className="inline mr-1" />
                DELETE ACCOUNT &amp; ALL DATA
              </button>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Legal Footer */}
      <footer className="mt-auto border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] py-3 px-4 text-center text-[11px] text-[var(--text-muted)] flex flex-wrap justify-center items-center gap-4">
        <span>DOMAIN ATTACK SURFACE SCANNER</span>
        <span>&middot;</span>
        <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition-colors">Privacy Policy</Link>
        <span>&middot;</span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)] transition-colors">Terms of Use</Link>
        <span>&middot;</span>
        <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition-colors">Cookie Policy</Link>
        <span>&middot;</span>
        <Link to="/billing" className="hover:text-[var(--accent-primary)] transition-colors">Billing &amp; Refunds</Link>
        <span>&middot;</span>
        <Link to="/security" className="hover:text-[var(--accent-primary)] transition-colors">Security &amp; Vulnerability Disclosure</Link>
      </footer>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="console-panel max-w-lg w-full p-6 space-y-4 border-l-4 border-l-[#ef4444] animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-[#ef4444] font-bold text-sm">
              <AlertCircle size={16} />
              <h2 id="delete-account-title">PERMANENT ACCOUNT &amp; DATA DELETION</h2>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This action exercises your right to erasure (GDPR Article 17 / DPDP data minimization). It will immediately and irreversibly delete:
            </p>

            <ul className="text-xs text-[var(--text-secondary)] list-disc pl-5 space-y-1 font-mono">
              <li>Your account profile and login credentials</li>
              <li>All active authentication sessions and session cookies</li>
              <li>All saved scans, normalized assets, findings, and relationships</li>
              <li>All historical usage and sliding-window quota records</li>
            </ul>

            <div className="console-panel-inset p-3 border border-[#ef4444]/30 text-xs text-[#ef4444]">
              <strong>WARNING:</strong> This action cannot be undone. All data will be purged from the database immediately.
            </div>

            {deleteAccountError && (
              <div className="text-xs text-[#ef4444] font-bold">
                Error: {deleteAccountError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="console-btn py-1.5 px-4 text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="console-btn py-1.5 px-4 text-xs text-[#ef4444] border-[#ef4444] hover:bg-[#ef4444]/10 font-bold"
              >
                {isDeletingAccount ? 'DELETING ALL DATA…' : '[ PERMANENTLY DELETE MY ACCOUNT ]'}
              </button>
            </div>
          </div>
        </div>
      )}

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
