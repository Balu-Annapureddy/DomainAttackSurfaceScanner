import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Shield,
  Layers,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { DomainScan, Finding } from '../../../shared/types';
import { getScan } from '../lib/api';
import { exportScanJson, exportAssetsCsv, exportFindingsCsv } from '../lib/export';
import ExecutiveSummary from '../components/ExecutiveSummary';

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!scanId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getScan(scanId);
        if (!isCancelled) {
          setScan(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load scan');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Compiling attack surface intelligence report…</p>
        </div>
      </main>
    );
  }

  if (error || !scan) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
          <h1 className="text-xl font-bold">Report Unavailable</h1>
          <p className="text-xs text-slate-400">{error || 'Scan not found or expired.'}</p>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <ArrowLeft size={14} /> Back to History
          </Link>
        </div>
      </main>
    );
  }

  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;
  const findings = scan.findings || [];
  const assets = scan.assets || [];

  const tlsData = scan.categories.tls?.data as {
    available?: boolean;
    protocol?: string;
    validTo?: string;
    validFrom?: string;
    issuer?: string;
    subject?: string;
    fingerprint256?: string;
    subjectAltNames?: string[];
  } | undefined;

  const dnsData = scan.categories.dns?.data as {
    addresses?: string[];
    aaaa?: string[];
    mx?: Array<{ exchange: string; priority: number }>;
    ns?: string[];
    spf?: { record?: string };
    dmarc?: { record?: string };
  } | undefined;

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-20 print:bg-white print:text-slate-900 print:pb-0">
      {/* Top Action Bar (hidden during print) */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to={`/scan/${scan.scanId}`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={15} />
            Back to Interactive Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition shadow-sm"
              title="Print document or Save as PDF"
            >
              <Printer size={14} />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 transition"
            >
              <Download size={13} />
              JSON
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 transition"
            >
              <Download size={13} />
              Assets CSV
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 transition"
            >
              <Download size={13} />
              Findings CSV
            </button>
          </div>
        </div>
      </nav>

      {/* Printable Report Container */}
      <article className="mx-auto max-w-5xl px-6 pt-8 space-y-8 print:p-0 print:space-y-6">
        {/* Report Document Header */}
        <header className="border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 print:text-cyan-700 font-semibold text-xs uppercase tracking-widest">
                <Shield size={16} />
                <span>External Attack Surface Intelligence Dossier</span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white print:text-slate-900 sm:text-4xl">
                {scan.domain}
              </h1>
              <p className="mt-1 text-xs text-slate-400 print:text-slate-600">
                Non-intrusive public perimeter reconnaissance and configuration hygiene assessment.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-slate-400 print:text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Calendar size={13} /> {new Date(scan.createdAt).toUTCString()}
              </span>
              <span className="font-mono text-[10px] text-slate-500 print:text-slate-500">
                Scan ID: {scan.scanId}
              </span>
              <span className="rounded bg-slate-800 print:bg-slate-100 print:text-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                Status: {scan.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* Executive Summary Section */}
        <section>
          <ExecutiveSummary scan={scan} />
        </section>

        {/* Security Posture Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 print:border-slate-300 print:bg-white space-y-4">
          <h2 className="text-base font-bold text-white print:text-slate-900 flex items-center gap-2">
            <Shield size={16} className="text-cyan-400 print:text-cyan-700" />
            Security Posture & Hygiene Rating
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-slate-800 bg-slate-950/60 print:border-slate-200 print:bg-slate-50">
            <div className="text-center sm:text-left">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-cyan-400 print:text-cyan-700">
                  {hasScore ? score : '—'}
                </span>
                <span className="text-sm font-semibold text-slate-500">/ 100</span>
              </div>
              <span className="text-xs font-semibold text-slate-300 print:text-slate-700 uppercase tracking-wider block mt-1">
                Observable Configuration Hygiene
              </span>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-6 pt-3 sm:pt-0 text-xs text-slate-400 print:text-slate-600 space-y-1">
              <p>
                The posture score reflects observable defensive configuration: verified HTTP-to-HTTPS redirect
                enforcement, valid and modern TLS encryption, email anti-spoofing controls (SPF, DMARC), and critical
                defensive HTTP response headers.
              </p>
              <p className="text-[11px] text-slate-500 print:text-slate-500 italic">
                Informational reconnaissance signals (such as high subdomain count or registrar privacy) are cataloged
                as intelligence assets and are not penalized as weaknesses.
              </p>
            </div>
          </div>
        </section>

        {/* Security Findings Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 print:border-slate-300 print:bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-slate-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400 print:text-amber-600" />
              Observable Posture Findings ({findings.length})
            </h2>
            <span className="text-xs text-slate-500 print:text-slate-600">
              Ranked by severity and defensive impact
            </span>
          </div>

          {findings.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">
              No defensive configuration weaknesses or security gaps were observed.
            </p>
          ) : (
            <div className="space-y-3">
              {findings.map((f: Finding) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-100 print:text-slate-900">{f.title}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        f.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-300 print:bg-rose-100 print:text-rose-800'
                          : f.severity === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 print:bg-amber-100 print:text-amber-800'
                          : f.severity === 'low'
                          ? 'bg-cyan-500/20 text-cyan-300 print:bg-cyan-100 print:text-cyan-800'
                          : 'bg-slate-800 text-slate-400 print:bg-slate-200 print:text-slate-700'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 print:text-slate-700">{f.description}</p>

                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs text-slate-400 print:border-slate-200 print:bg-white print:text-slate-700">
                    <strong className="text-cyan-400 print:text-cyan-700 font-semibold block text-[11px] mb-0.5">
                      Recommended Remediation:
                    </strong>
                    {f.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cryptography & TLS Certificate Dossier */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 print:border-slate-300 print:bg-white space-y-4">
          <h2 className="text-base font-bold text-white print:text-slate-900 flex items-center gap-2">
            <Lock size={16} className="text-purple-400 print:text-purple-700" />
            TLS Certificate & Cryptography Dossier
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2">
              <span className="font-semibold text-slate-400 block text-[11px]">Certificate Subject & Issuer</span>
              <p className="text-slate-200 print:text-slate-900">
                <strong>Subject:</strong> {tlsData?.subject || 'N/A'}
              </p>
              <p className="text-slate-200 print:text-slate-900">
                <strong>Issuer:</strong> {tlsData?.issuer || 'N/A'}
              </p>
              <p className="text-slate-200 print:text-slate-900">
                <strong>Protocol:</strong> {tlsData?.protocol || 'N/A'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2">
              <span className="font-semibold text-slate-400 block text-[11px]">Validity & SHA-256 Fingerprint</span>
              <p className="text-slate-200 print:text-slate-900">
                <strong>Valid From:</strong> {tlsData?.validFrom ? new Date(tlsData.validFrom).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-slate-200 print:text-slate-900">
                <strong>Valid To:</strong> {tlsData?.validTo ? new Date(tlsData.validTo).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-slate-200 print:text-slate-900 font-mono text-[10px] break-all">
                <strong>SHA-256:</strong> {tlsData?.fingerprint256 || 'N/A'}
              </p>
            </div>
          </div>

          {tlsData?.subjectAltNames && tlsData.subjectAltNames.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2">
              <span className="font-semibold text-slate-400 block text-[11px]">
                Subject Alternative Names (SANs) ({tlsData.subjectAltNames.length})
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {tlsData.subjectAltNames.map((san) => (
                  <span
                    key={san}
                    className="rounded bg-slate-800 print:bg-slate-200 px-2 py-0.5 text-slate-300 print:text-slate-800"
                  >
                    {san}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* DNS & Mail Infrastructure Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 print:border-slate-300 print:bg-white space-y-4">
          <h2 className="text-base font-bold text-white print:text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-blue-400 print:text-blue-700" />
            DNS & Mail Routing Infrastructure
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2">
              <span className="font-semibold text-slate-400 block text-[11px]">Email Anti-Spoofing Policies</span>
              <div>
                <span className="text-slate-500 block text-[10px]">SPF Policy:</span>
                <p className="font-mono text-[10px] text-slate-300 print:text-slate-800 break-all">
                  {dnsData?.spf?.record || 'No SPF record published'}
                </p>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 block text-[10px]">DMARC Policy:</span>
                <p className="font-mono text-[10px] text-slate-300 print:text-slate-800 break-all">
                  {dnsData?.dmarc?.record || 'No DMARC policy published'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50 space-y-2">
              <span className="font-semibold text-slate-400 block text-[11px]">Authoritative Nameservers & Mail Servers</span>
              <div>
                <span className="text-slate-500 block text-[10px]">Nameservers:</span>
                <p className="font-mono text-[11px] text-slate-300 print:text-slate-800">
                  {dnsData?.ns?.join(', ') || 'None recorded'}
                </p>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 block text-[10px]">MX Mail Exchangers:</span>
                <p className="font-mono text-[11px] text-slate-300 print:text-slate-800">
                  {dnsData?.mx?.map((m) => `${m.exchange} (${m.priority})`).join(', ') || 'None recorded'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Normalized Asset Inventory Sample */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 print:border-slate-300 print:bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-slate-900 flex items-center gap-2">
              <Layers size={16} className="text-cyan-400 print:text-cyan-700" />
              Normalized Asset Inventory ({assets.length} Assets)
            </h2>
            <span className="text-xs text-slate-500 print:text-slate-600">
              Evidence-backed network nodes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-slate-800">
              <thead>
                <tr className="border-b border-slate-800 print:border-slate-300 text-[10px] uppercase font-semibold text-slate-500">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 px-3">Value</th>
                  <th className="py-2 px-3">Source</th>
                  <th className="py-2 pl-3">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 font-mono text-[11px]">
                {assets.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3">
                      <span className="rounded bg-slate-800 print:bg-slate-200 px-1.5 py-0.5 text-[9px] uppercase font-sans text-slate-400 print:text-slate-700">
                        {a.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 truncate max-w-[280px]">{a.value}</td>
                    <td className="py-2 px-3 font-sans text-[10px] text-slate-400">
                      {a.evidence?.[0]?.source || 'scanner'}
                    </td>
                    <td className="py-2 pl-3 text-slate-500 text-[10px]">
                      {new Date(a.discoveredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {assets.length > 50 && (
            <p className="text-[11px] text-slate-500 print:text-slate-600 text-center pt-2">
              Showing first 50 of {assets.length} assets. Use CSV export for full catalog.
            </p>
          )}
        </section>

        {/* Footer Disclaimer */}
        <footer className="border-t border-slate-800 pt-6 text-xs text-slate-500 print:border-slate-300 print:text-slate-600 space-y-1">
          <p>
            <strong>Confidentiality & Usage Notice:</strong> This dossier was generated automatically by
            DomainAttackSurfaceScanner using passive observation techniques.
          </p>
          <p>
            Datacenter geolocations represent approximate network points of presence and do not designate physical or
            individual addresses. No unauthorized probing or credential attacks were executed.
          </p>
        </footer>
      </article>
    </main>
  );
}
