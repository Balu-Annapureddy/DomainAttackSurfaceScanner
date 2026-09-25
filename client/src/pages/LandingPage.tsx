import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, History, Radar, ShieldCheck, Sparkles, BookOpen, Globe, Network, Shield } from 'lucide-react';
import { createScan } from '../lib/api';
import GlossaryModal from '../components/GlossaryModal';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const scan = await createScan(domain);
      const previous = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as Array<{ scanId: string; domain: string; createdAt: string }>;
      localStorage.setItem('domain_scanner_scans', JSON.stringify([{ scanId: scan.scanId, domain: scan.domain, createdAt: scan.createdAt }, ...previous.filter(item => item.scanId !== scan.scanId)].slice(0, 30)));
      navigate(`/scan/${scan.scanId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start scan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radar size={18} />
          </div>
          <span>Domain Attack Surface Scanner</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsGlossaryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <BookOpen size={14} className="text-cyan-400" />
            <span>How to Read This</span>
          </button>
          <Link
            to="/history"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <History size={15} />
            <span>History</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-12 text-center sm:pt-20">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <ShieldCheck size={34} />
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
          Strictly Passive External Intelligence
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Understand your perimeter attack surface.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400">
          Discover domains, subdomains, IPs, ASN routing, TLS certificates, and defensive hygiene without sending intrusive packets, probing private networks, or launching attacks.
        </p>

        {/* Scan Form & Sample Scan Action */}
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="domain" className="sr-only">Domain to scan</label>
            <input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. example.com"
              className="min-h-14 flex-1 rounded-xl border border-slate-700 bg-slate-900/90 px-5 text-sm text-white outline-none ring-cyan-400 placeholder:text-slate-500 focus:ring-2"
              required
            />
            <button
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-7 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
            >
              {loading ? 'Scanning…' : 'Scan Domain'} <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Sample Scan Trigger */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <span>Want to test without running a scan?</span>
            <Link
              to="/scan/sample"
              className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              <Sparkles size={13} />
              Explore Sample Scan Demo
            </Link>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 text-xs font-medium text-rose-400">{error}</p>}

        {/* Passive OSINT Epistemology Callout */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl">🛡️</span>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-200">The Passive Reconnaissance Guarantee</span>
              <p className="text-slate-400 leading-relaxed">
                <em>“We did not observe X” ≠ “X does not exist.”</em> Our scanner operates strictly on publicly verifiable DNS, Certificate Transparency logs, and standard responses. We do not perform port scans, credential brute-forcing, or exploit testing.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Concepts + Explanations Grid */}
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <Globe size={18} />
              <p className="font-semibold text-sm text-white">Certificate Transparency (CT)</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Public append-only cryptographic logs that reveal issued certificates, discovering subdomains without brute-force enumeration.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Network size={18} />
              <p className="font-semibold text-sm text-white">BGP ASN & Infrastructure</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous System Numbers map discovered IPs to network routing providers (Cloudflare, AWS, Google) and approximate datacenter points of presence.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Shield size={18} />
              <p className="font-semibold text-sm text-white">Defensive Configuration Hygiene</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evaluates observable transport encryption, HTTP → HTTPS enforcement, defensive headers (HSTS, CSP), and email authentication (SPF, DMARC).
            </p>
          </div>
        </div>
      </section>

      {/* Glossary Modal */}
      <GlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </main>
  );
}
