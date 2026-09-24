import {
  Shield,
  Layers,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  Info,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { generateExecutiveSummary } from '../lib/executiveSummary';

interface ExecutiveSummaryProps {
  scan: DomainScan;
  compact?: boolean;
}

export default function ExecutiveSummary({ scan, compact = false }: ExecutiveSummaryProps) {
  const summary = generateExecutiveSummary(scan);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
      {/* Title & Scope Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-cyan-400" size={18} />
            <h2 className="text-lg font-bold text-white">Executive Intelligence Summary</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Synthesized assessment of observable attack surface, perimeter configurations, and hygiene posture.
          </p>
        </div>

        <span className="self-start sm:self-auto rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
          Passive Reconnaissance Only
        </span>
      </div>

      {/* Discovered Footprint & Configuration Observations Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Footprint Discovered */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Surface Footprint</span>
            <Layers size={15} className="text-cyan-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Subdomains:</span>
              <span className="font-semibold text-white">{summary.stats.subdomains}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">IPv4/IPv6 Addresses:</span>
              <span className="font-semibold text-white">{summary.stats.ipAddresses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Autonomous Systems:</span>
              <span className="font-semibold text-white">{summary.stats.asns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hosting Organizations:</span>
              <span className="font-semibold text-white">{summary.stats.organizations}</span>
            </div>
          </div>
        </div>

        {/* Cryptography & Transport */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Transport Security</span>
            <Lock size={15} className="text-purple-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">HTTPS Enforced:</span>
              <span className="flex items-center gap-1 font-semibold">
                {summary.observations.httpsEnforced ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Yes
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <XCircle size={12} /> No
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">TLS Encryption:</span>
              <span className="font-semibold text-white">
                {summary.observations.tlsActive ? summary.observations.tlsProtocol || 'Active' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cert Expiry:</span>
              <span className="font-semibold text-slate-300">
                {typeof summary.observations.certExpiresDays === 'number'
                  ? `${summary.observations.certExpiresDays} days`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Certificates Found:</span>
              <span className="font-semibold text-white">{summary.stats.certificates}</span>
            </div>
          </div>
        </div>

        {/* Perimeter & Mail Authentication */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Mail & Perimeter</span>
            <Mail size={15} className="text-blue-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">SPF Record:</span>
              <span className="font-semibold">
                {summary.observations.hasSpf ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Present
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <XCircle size={12} /> Missing
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">DMARC Policy:</span>
              <span className="font-semibold">
                {summary.observations.hasDmarc ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Configured
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <XCircle size={12} /> Missing
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mail Exchangers:</span>
              <span className="font-semibold text-white">{summary.stats.mailServers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Exposed Files:</span>
              <span className="font-semibold text-slate-300">
                {summary.observations.exposedFiles.length > 0
                  ? summary.observations.exposedFiles.join(', ')
                  : 'None detected'}
              </span>
            </div>
          </div>
        </div>

        {/* Posture Findings Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Hygiene Observations</span>
            <AlertTriangle size={15} className="text-amber-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-rose-400">High Priority:</span>
              <span className="font-bold text-rose-400">{summary.findingsSummary.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400">Medium Priority:</span>
              <span className="font-bold text-amber-400">{summary.findingsSummary.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400">Low Priority:</span>
              <span className="font-bold text-cyan-400">{summary.findingsSummary.low}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Informational:</span>
              <span className="font-bold text-slate-300">{summary.findingsSummary.informational}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Takeaways */}
      {!compact && summary.keyTakeaways.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Info size={14} className="text-cyan-400" />
            Key Observations & Actionable Takeaways
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            {summary.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Methodology & Passive Boundaries Note */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 text-xs text-slate-400">
        <Globe size={15} className="mt-0.5 text-slate-500 flex-shrink-0" />
        <p>
          <strong className="text-slate-300">Methodology & Scope Notice:</strong> This analysis represents an external,
          passive examination of public records (DNS, RDAP, Certificate Transparency logs) and unauthenticated web
          service responses. No active intrusion, fuzzing, port sweeps, or authentication bypasses were conducted.
          Infrastructure geolocations correspond to approximate network datacenters or ISP points of presence.
        </p>
      </div>
    </div>
  );
}
