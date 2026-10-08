import { useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Terminal,
  BookOpen,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';
import { formatConfidence, getConfidenceBadgeClass } from '../lib/confidence';

interface FindingDetailPanelProps {
  finding: Finding | null;
  onClose: () => void;
  onOpenGlossary?: (termKey: string) => void;
}

const SEVERITY_BADGES: Record<
  FindingSeverity,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  high: {
    label: 'HIGH SEVERITY',
    bg: 'bg-[#fee2e2]/60 dark:bg-[#ef4444]/20',
    text: 'text-[#dc2626] dark:text-[#ef4444]',
    border: 'border-[#dc2626]/40 dark:border-[#ef4444]/40',
    icon: ShieldAlert,
  },
  medium: {
    label: 'MEDIUM SEVERITY',
    bg: 'bg-[#fef3c7]/60 dark:bg-[#eab308]/20',
    text: 'text-[#d97706] dark:text-[#f59e0b]',
    border: 'border-[#d97706]/40 dark:border-[#eab308]/40',
    icon: AlertTriangle,
  },
  low: {
    label: 'LOW SEVERITY',
    bg: 'bg-[var(--accent-active-bg)]',
    text: 'text-[var(--accent-primary)]',
    border: 'border-[var(--accent-primary)]/40',
    icon: Info,
  },
  informational: {
    label: 'INFORMATIONAL',
    bg: 'bg-[var(--bg-panel-inset)]',
    text: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border-muted)]',
    icon: HelpCircle,
  },
};

export default function FindingDetailPanel({ finding, onClose, onOpenGlossary }: FindingDetailPanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!finding) return null;

  const sev = SEVERITY_BADGES[finding.severity] || SEVERITY_BADGES.informational;
  const SevIcon = sev.icon;
  const analysis = finding.analysis;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={finding.title}
        className="relative w-full max-w-2xl bg-[var(--bg-panel)] border-l border-[var(--border-technical)] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 border text-xs font-bold font-mono rounded-md flex items-center gap-1.5 ${sev.bg} ${sev.text} ${sev.border}`}>
                <SevIcon size={13} />
                {sev.label}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] border border-[var(--border-muted)] px-2 py-0.5 rounded-md bg-[var(--bg-panel-inset)]">
                CATEGORY: {finding.category.toUpperCase()}
              </span>
              <span className={`text-xs font-mono font-bold border px-2 py-0.5 rounded-md ${getConfidenceBadgeClass(finding.confidence)}`}>
                {formatConfidence(finding.confidence)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] leading-snug">
              {finding.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg transition shrink-0"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content: 12-Section Analysis */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm divide-y divide-[var(--border-muted)]">
          {/* [01] WHAT IS THIS? */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
              <span>[01] WHAT IS THIS?</span>
            </div>
            <p className="text-[var(--text-primary)] leading-relaxed">
              {analysis?.whatIsThis || finding.description}
            </p>
          </section>

          {/* [02] WHAT DID DASS OBSERVE? */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#d97706] dark:text-[#f59e0b] uppercase tracking-wider">
              <span>[02] WHAT DID DASS OBSERVE?</span>
            </div>
            <div className="p-3 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg text-[var(--text-primary)] font-mono text-xs leading-relaxed">
              {analysis?.whatWasObserved || finding.description}
            </div>
          </section>

          {/* [03] HOW WAS IT DISCOVERED? */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <Layers size={13} />
              <span>[03] HOW WAS IT DISCOVERED?</span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed">
              {analysis?.howDiscovered || 'Discovered passively by inspecting non-invasive public protocol artifacts and response telemetry.'}
            </p>
          </section>

          {/* [04] RAW EVIDENCE */}
          <section className="pt-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <Terminal size={13} />
              <span>[04] RAW EVIDENCE &amp; PROBES</span>
            </div>
            {finding.evidence && finding.evidence.length > 0 ? (
              <div className="space-y-2">
                {finding.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg text-xs space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="font-bold text-[var(--accent-primary)]">{ev.source}</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${getConfidenceBadgeClass(ev.confidence)}`}>
                        {formatConfidence(ev.confidence)}
                      </span>
                    </div>
                    <div className="text-[var(--text-primary)]">{ev.description}</div>
                    {ev.observedAt && (
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(ev.observedAt).toISOString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] font-mono">No raw probe payload attached.</p>
            )}
          </section>

          {/* [05] TECHNICAL EXPLANATION */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
              <span>[05] TECHNICAL EXPLANATION</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {analysis?.technicalExplanation || finding.whyItMatters || 'Technical configuration hygiene observation.'}
            </p>
          </section>

          {/* [06] WHY DOES IT MATTER? */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#d97706] dark:text-[#f59e0b] uppercase tracking-wider">
              <span>[06] WHY DOES IT MATTER?</span>
            </div>
            <p className="text-[var(--text-primary)] leading-relaxed">
              {analysis?.whyItMatters || finding.whyItMatters || 'Observing public configuration posture helps harden defensive attack surfaces before attackers discover them.'}
            </p>
          </section>

          {/* [07] REALISTIC SECURITY IMPACT */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#dc2626] dark:text-[#ef4444] uppercase tracking-wider">
              <span>[07] REALISTIC SECURITY IMPACT</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {analysis?.securityImpact || 'Absence of defense-in-depth controls increases risk surface without providing direct exploitation proof.'}
            </p>
          </section>

          {/* [08] POTENTIAL ABUSE SCENARIO */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>[08] POTENTIAL ABUSE SCENARIO</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed italic text-xs sm:text-sm">
              {analysis?.potentialAbuse || 'An adversary scanning the public internet can record this posture to target users or spoof communications.'}
            </p>
          </section>

          {/* [09] RECOMMENDED REMEDIATION */}
          <section className="pt-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#16a34a] dark:text-[#2ee59d] uppercase tracking-wider">
              <CheckCircle2 size={14} />
              <span>[09] RECOMMENDED REMEDIATION</span>
            </div>
            <div className="p-3.5 bg-[var(--bg-panel-inset)] border border-[#16a34a]/30 rounded-lg text-xs sm:text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
              {analysis?.remediation || finding.recommendation}
            </div>
            {finding.investigationSteps && finding.investigationSteps.length > 0 && (
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4 mt-2">
                {finding.investigationSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            )}
          </section>

          {/* [10] SAFE VALIDATION */}
          <section className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
              <Terminal size={13} />
              <span>[10] SAFE VALIDATION</span>
            </div>
            <div className="p-3 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg text-xs font-mono text-[var(--text-primary)] leading-relaxed">
              {analysis?.safeValidation || 'Verify using passive curl, dig, or openssl commands against the target endpoint.'}
            </div>
          </section>

          {/* [11] REFERENCES & STANDARDS */}
          {analysis?.references && analysis.references.length > 0 && (
            <section className="pt-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <BookOpen size={13} />
                <span>[11] STANDARDS &amp; CITATIONS</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {analysis.references.map((ref, idx) => (
                  <li key={idx}>
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 font-mono break-all"
                    >
                      <ExternalLink size={12} className="shrink-0" />
                      <span>{ref}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* [12] EPISTEMOLOGY & TELEMETRY */}
          <section className="pt-5 space-y-2 text-xs text-[var(--text-muted)] font-mono">
            <div className="font-bold uppercase tracking-wider">[12] TELEMETRY RECORD</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg">
              <div>FINDING ID: <span className="text-[var(--text-primary)]">{finding.id.slice(0, 8)}…</span></div>
              <div>STATUS: <span className="text-[var(--text-primary)]">{finding.observationStatus || 'OBSERVED'}</span></div>
              <div>KIND: <span className="text-[var(--text-primary)]">{finding.kind || 'OBSERVATION'}</span></div>
              <div>DISCOVERY: <span className="text-[var(--text-primary)]">PASSIVE OSINT</span></div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] flex items-center justify-between">
          {onOpenGlossary && (
            <button
              onClick={() => onOpenGlossary('passive_osint')}
              className="text-xs text-[var(--accent-primary)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>FIELD MANUAL</span>
              <ArrowRight size={12} />
            </button>
          )}
          <button
            onClick={onClose}
            className="console-btn console-btn-primary py-1 px-4 text-xs font-bold ml-auto"
          >
            DISMISS
          </button>
        </div>
      </aside>
    </div>
  );
}
