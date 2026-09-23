import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Gauge, Globe2, ShieldX, Wifi, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getScan } from '../lib/api';
import type { DomainScan, ScanCategory } from '../../../shared/types';

const labels: Record<ScanCategory, string> = {
  whois: 'WHOIS Summary',
  dns: 'DNS Records',
  subdomains: 'Subdomains Found',
  tls: 'TLS Certificate',
  http: 'HTTP & Security Headers',
  exposure: 'Exposure Checks',
  scoring: 'Exposure Score',
};

function formatHeaderKey(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function renderArray(values: unknown): ReactNode {
  if (!values || (Array.isArray(values) && values.length === 0)) return <span className="text-slate-500">No values reported.</span>;
  const list = Array.isArray(values) ? values : [values];
  return (
    <ul className="space-y-2">
      {list.map((item, index) => (
        <li key={`${String(item)}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200">
          {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
        </li>
      ))}
    </ul>
  );
}

function renderObject(value: Record<string, unknown>): ReactNode {
  return (
    <div className="space-y-3"> 
      {Object.entries(value).map(([key, entry]) => (
        <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">{formatHeaderKey(key)}</p>
          {entry === null || entry === undefined ? (
            <span className="text-slate-500">Not reported</span>
          ) : typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean' ? (
            <span className="font-mono text-xs text-slate-200">{String(entry)}</span>
          ) : Array.isArray(entry) ? (
            renderArray(entry)
          ) : typeof entry === 'object' ? (
            renderObject(entry as Record<string, unknown>)
          ) : null}
        </div>
      ))}
    </div>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20';
    case 'running':
      return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20';
    case 'failed':
      return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20';
    default:
      return 'bg-slate-800 text-slate-300 ring-1 ring-slate-700';
  }
}

function safeValue(data: unknown): unknown {
  return data ?? 'Not reported';
}

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) {
      setError('Missing scan id.');
      setLoading(false);
      return;
    }

    let active = true;
    const poll = async () => {
      try {
        const current = await getScan(scanId);
        if (!active) return;
        setScan(current);
        setLoading(false);
        setError(null);
        if (current.status === 'completed' || current.status === 'failed') return;
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load scan');
        setLoading(false);
      }
    };

    void poll();
    const timer = window.setInterval(() => { void poll(); }, 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [scanId]);

  const scoreText = useMemo(() => {
    if (!scan?.score && scan?.score !== 0) return 'Waiting for scoring';
    if (scan.score >= 80) return 'Healthy external posture';
    if (scan.score >= 60) return 'Moderate hygiene';
    if (scan.score >= 40) return 'Needs attention';
    return 'High exposure risk';
  }, [scan?.score]);

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 animate-spin items-center justify-center rounded-full border border-cyan-400/30 border-t-cyan-400" />
          <p className="text-lg font-medium">Loading scan results…</p>
        </div>
      </main>
    );
  }

  if (error || !scan) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/20 bg-slate-900 p-8 text-center">
          <div className="mb-3 flex justify-center text-rose-400"><XCircle size={28} /></div>
          <h1 className="text-2xl font-semibold">Unable to load scan</h1>
          <p className="mt-3 text-slate-400">{error ?? 'The scan could not be found or has expired.'}</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-cyan-400 hover:underline">
            <ArrowLeft size={16} /> Back to the scanner
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold"><Globe2 className="text-cyan-400" /> Domain Attack Surface Scanner</Link>
        <Link to="/history" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><Clock3 size={17} /> History</Link>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-400">Scan results</p>
            <h1 className="mt-2 text-3xl font-bold">{scan.domain}</h1>
            <p className="mt-2 text-sm text-slate-400">{new Date(scan.createdAt).toLocaleString()} · {scan.status === 'completed' ? 'Completed' : scan.status === 'running' ? 'In progress' : 'Failed'}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Exposure score</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-cyan-400">{scan.score ?? 0}</span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Assessment</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">{scoreText}</h2>
            </div>
            <div className="rounded-full px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
              {scan.status}
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            This score blends the presence of security headers, HTTPS configuration, certificate validity, discovered subdomains, and WHOIS privacy signals into one simple external hygiene heuristic.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {(Object.keys(labels) as ScanCategory[]).map(category => {
            const categoryState = scan.categories[category];
            const data = categoryState.data;
            const isCompleted = categoryState.status === 'completed';
            const isFailed = categoryState.status === 'failed';

            const content = (() => {
              if (category === 'scoring') {
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <Gauge size={16} />
                      <span className="font-medium">Score: {scan.score ?? 0}/100</span>
                    </div>
                    <p className="text-sm text-slate-400">{scoreText}</p>
                  </div>
                );
              }

              if (isFailed) {
                return (
                  <div className="flex items-start gap-3 text-rose-300">
                    <ShieldX size={18} className="mt-0.5" />
                    <span className="text-sm">{categoryState.error ?? 'This category is unavailable.'}</span>
                  </div>
                );
              }

              if (!isCompleted || data === undefined) {
                return (
                  <div className="flex items-center gap-2 text-amber-300">
                    <Clock3 size={18} />
                    <span className="text-sm">Waiting for results…</span>
                  </div>
                );
              }

              if (typeof data === 'object' && data !== null) {
                const record = data as Record<string, unknown>;
                if ('missingSecurityHeaders' in record && Array.isArray(record.missingSecurityHeaders)) {
                  const headers = record.missingSecurityHeaders as string[];
                  return (
                    <div className="space-y-3">
                      {Object.entries(record).filter(([key]) => key !== 'missingSecurityHeaders').map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">{formatHeaderKey(key)}</p>
                          <p className="font-mono text-xs text-slate-200">{safeValue(value) as string}</p>
                        </div>
                      ))}
                      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Security Headers</p>
                        {!headers.length ? (
                          <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 size={15} /> <span>All key security headers are present.</span></div>
                        ) : (
                          <div className="space-y-2">
                            {headers.map(header => (
                              <p key={header} className="font-mono text-xs text-amber-300">Missing: {header}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (typeof record.subdomains === 'object') {
                  return renderArray((record.subdomains as { subdomains?: string[] }).subdomains ?? []);
                }

                return renderObject(record);
              }

              return <p className="font-mono text-xs text-slate-200">{String(data)}</p>;
            })();

            return (
              <article key={category} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isCompleted ? <CheckCircle2 size={16} className="text-emerald-400" /> : isFailed ? <AlertTriangle size={16} className="text-rose-400" /> : <Wifi size={16} className="text-amber-400" />}
                    <h3 className="text-lg font-semibold text-slate-100">{labels[category]}</h3>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${statusBadge(categoryState.status)}`}>
                    {categoryState.status}
                  </span>
                </div>
                {content}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
