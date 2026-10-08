import {
  Shield,
  Layers,
  Lock,
  Mail,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { generateExecutiveSummary } from '../lib/executiveSummary';

interface ExecutiveSummaryProps {
  scan: DomainScan;
  compact?: boolean;
}

export default function ExecutiveSummary({ scan }: ExecutiveSummaryProps) {
  const summary = generateExecutiveSummary(scan);

  return (
    <div className="console-panel p-5 space-y-4 rounded-xs">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-technical)] pb-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Shield className="text-[var(--accent-primary)]" size={14} />
            <span className="font-bold text-[var(--text-primary)]">EXECUTIVE INTELLIGENCE SYNTHESIS</span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Synthesized assessment of observable perimeter footprint, cryptographic posture, and email anti-spoofing controls.
          </p>
        </div>

        <span className="console-tag text-[10px]">
          PASSIVE_TELEMETRY_ONLY
        </span>
      </div>

      {/* ─── Discovered Footprint & Configuration Observations Grid ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
        {/* Footprint Discovered */}
        <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] pb-1 border-b border-[var(--border-technical)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Surface Footprint</span>
            <Layers size={13} className="text-[var(--accent-primary)]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Subdomains:</span>
              <span className="font-bold text-[var(--text-primary)]">{summary.stats.subdomains}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">IP Endpoints:</span>
              <span className="font-bold text-[var(--text-primary)]">{summary.stats.ipAddresses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">BGP ASNs:</span>
              <span className="font-bold text-[var(--text-primary)]">{summary.stats.asns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Hosting Orgs:</span>
              <span className="font-bold text-[var(--text-primary)]">{summary.stats.organizations}</span>
            </div>
          </div>
        </div>

        {/* Cryptography & Transport */}
        <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] pb-1 border-b border-[var(--border-technical)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Transport Security</span>
            <Lock size={13} className="text-[var(--accent-primary)]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">HTTPS Enforced:</span>
              <span className="font-bold">
                {summary.observations.httpsEnforced ? (
                  <span className="text-[var(--accent-primary)] flex items-center gap-1">
                    <CheckCircle size={11} /> YES
                  </span>
                ) : (
                  <span className="text-[var(--sev-medium)] flex items-center gap-1">
                    <XCircle size={11} /> NO
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">TLS Encryption:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {summary.observations.tlsActive ? summary.observations.tlsProtocol || 'ACTIVE' : 'UNAVAILABLE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Cert Expiry:</span>
              <span className="font-bold text-[var(--text-secondary)]">
                {typeof summary.observations.certExpiresDays === 'number'
                  ? `${summary.observations.certExpiresDays}d remaining`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Defense Headers:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {summary.observations.presentHeadersCount} observed / {summary.observations.missingHeadersCount} absent
              </span>
            </div>
          </div>
        </div>

        {/* Mail & Anti-Spoofing */}
        <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] pb-1 border-b border-[var(--border-technical)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Mail Security</span>
            <Mail size={13} className="text-[var(--accent-primary)]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Routes Email:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {summary.stats.mailServers > 0 ? `${summary.stats.mailServers} MX Records` : 'No MX Observed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">SPF Policy:</span>
              <span className={summary.observations.hasSpf ? 'text-[var(--accent-primary)] font-bold' : 'text-[var(--sev-medium)] font-bold'}>
                {summary.observations.hasSpf ? 'CONFIGURED' : 'NOT OBSERVED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">DMARC Policy:</span>
              <span className={summary.observations.hasDmarc ? 'text-[var(--accent-primary)] font-bold' : 'text-[var(--sev-medium)] font-bold'}>
                {summary.observations.hasDmarc ? 'CONFIGURED' : 'NOT OBSERVED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Exposed Files:</span>
              <span className="font-bold text-[var(--text-secondary)]">
                {summary.observations.exposedFiles.length > 0
                  ? summary.observations.exposedFiles.join(', ')
                  : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Perimeter Hygiene Takeaways */}
        <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] pb-1 border-b border-[var(--border-technical)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hygiene Summary</span>
            <span className="font-bold text-[var(--sev-medium)]">{summary.findingsSummary.total} Findings</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">High Severity:</span>
              <span className={summary.findingsSummary.high > 0 ? 'text-[var(--sev-high)] font-bold' : 'text-[var(--text-primary)]'}>
                {summary.findingsSummary.high}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Medium Consideration:</span>
              <span className={summary.findingsSummary.medium > 0 ? 'text-[var(--sev-medium)] font-bold' : 'text-[var(--text-primary)]'}>
                {summary.findingsSummary.medium}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Low / Hygiene:</span>
              <span className="text-[var(--sev-low)] font-bold">
                {summary.findingsSummary.low}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Info Signals:</span>
              <span className="text-[var(--sev-info)]">
                {summary.findingsSummary.informational}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
