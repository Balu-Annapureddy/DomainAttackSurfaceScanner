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
    <div className="console-panel p-5 space-y-4">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2735] pb-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Shield className="text-[#58a6ff]" size={14} />
            <span className="font-bold text-[#e6edf3]">EXECUTIVE INTELLIGENCE SYNTHESIS</span>
          </div>
          <p className="mt-0.5 text-xs text-[#9aa5b8]">
            Synthesized assessment of observable perimeter footprint, cryptographic posture, and email anti-spoofing controls.
          </p>
        </div>

        <span className="console-tag console-tag-cyan text-[10px]">
          PASSIVE_TELEMETRY_ONLY
        </span>
      </div>

      {/* ─── Discovered Footprint & Configuration Observations Grid ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
        {/* Footprint Discovered */}
        <div className="console-panel-inset p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[#9aa5b8] pb-1 border-b border-[#171e2b]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Surface Footprint</span>
            <Layers size={13} className="text-[#58a6ff]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#626e82]">Subdomains:</span>
              <span className="font-bold text-[#e6edf3]">{summary.stats.subdomains}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">IP Endpoints:</span>
              <span className="font-bold text-[#e6edf3]">{summary.stats.ipAddresses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">BGP ASNs:</span>
              <span className="font-bold text-[#e6edf3]">{summary.stats.asns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">Hosting Orgs:</span>
              <span className="font-bold text-[#e6edf3]">{summary.stats.organizations}</span>
            </div>
          </div>
        </div>

        {/* Cryptography & Transport */}
        <div className="console-panel-inset p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[#9aa5b8] pb-1 border-b border-[#171e2b]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Transport Security</span>
            <Lock size={13} className="text-[#8a63d2]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">HTTPS Enforced:</span>
              <span className="font-bold">
                {summary.observations.httpsEnforced ? (
                  <span className="text-[#3fb950] flex items-center gap-1">
                    <CheckCircle size={11} /> YES
                  </span>
                ) : (
                  <span className="text-[#d29922] flex items-center gap-1">
                    <XCircle size={11} /> NO
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">TLS Encryption:</span>
              <span className="font-bold text-[#e6edf3]">
                {summary.observations.tlsActive ? summary.observations.tlsProtocol || 'ACTIVE' : 'UNAVAILABLE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">Cert Expiry:</span>
              <span className="font-bold text-[#9aa5b8]">
                {typeof summary.observations.certExpiresDays === 'number'
                  ? `${summary.observations.certExpiresDays}d remaining`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">Defense Headers:</span>
              <span className="font-bold text-[#e6edf3]">
                {summary.observations.presentHeadersCount} observed / {summary.observations.missingHeadersCount} absent
              </span>
            </div>
          </div>
        </div>

        {/* Mail & Anti-Spoofing */}
        <div className="console-panel-inset p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[#9aa5b8] pb-1 border-b border-[#171e2b]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Mail Security</span>
            <Mail size={13} className="text-[#58a6ff]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">Routes Email:</span>
              <span className="font-bold text-[#e6edf3]">
                {summary.stats.mailServers > 0 ? `${summary.stats.mailServers} MX Records` : 'No MX Observed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">SPF Policy:</span>
              <span className={summary.observations.hasSpf ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                {summary.observations.hasSpf ? 'CONFIGURED' : 'NOT OBSERVED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">DMARC Policy:</span>
              <span className={summary.observations.hasDmarc ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                {summary.observations.hasDmarc ? 'CONFIGURED' : 'NOT OBSERVED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#626e82]">Exposed Files:</span>
              <span className="font-bold text-[#9aa5b8]">
                {summary.observations.exposedFiles.length > 0
                  ? summary.observations.exposedFiles.join(', ')
                  : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Perimeter Hygiene Takeaways */}
        <div className="console-panel-inset p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[#9aa5b8] pb-1 border-b border-[#171e2b]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hygiene Summary</span>
            <span className="font-bold text-[#d29922]">{summary.findingsSummary.total} Findings</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#626e82]">High Severity:</span>
              <span className={summary.findingsSummary.high > 0 ? 'text-[#f85149] font-bold' : 'text-[#e6edf3]'}>
                {summary.findingsSummary.high}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">Medium Consideration:</span>
              <span className={summary.findingsSummary.medium > 0 ? 'text-[#d29922] font-bold' : 'text-[#e6edf3]'}>
                {summary.findingsSummary.medium}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">Low / Hygiene:</span>
              <span className="text-[#58a6ff] font-bold">
                {summary.findingsSummary.low}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626e82]">Info Signals:</span>
              <span className="text-[#626e82]">
                {summary.findingsSummary.informational}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
