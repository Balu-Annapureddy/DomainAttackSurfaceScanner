import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, History, Radar, ShieldCheck } from 'lucide-react';
import { createScan } from '../lib/api';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const scan = await createScan(domain);
      const previous = JSON.parse(localStorage.getItem('reconlab_scans') || '[]') as Array<{ scanId: string; domain: string; createdAt: string }>;
      localStorage.setItem('reconlab_scans', JSON.stringify([{ scanId: scan.scanId, domain: scan.domain, createdAt: scan.createdAt }, ...previous.filter(item => item.scanId !== scan.scanId)].slice(0, 30)));
      navigate(`/scan/${scan.scanId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start scan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold"><Radar className="text-cyan-400" /> Domain Attack Surface Scanner</Link>
        <Link to="/history" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><History size={17} /> History</Link>
      </nav>
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-16 text-center sm:pt-24">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400"><ShieldCheck size={34} /></div>
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-cyan-400">Passive reconnaissance</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Understand your domain&apos;s attack surface.</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">This passive scanner collects WHOIS and DNS data, checks public certificate logs for subdomains, inspects live TLS and HTTP responses, and surfaces security-header and exposure gaps without probing or exploiting anything.</p>
        <form onSubmit={submit} className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="domain" className="sr-only">Domain to scan</label>
          <input id="domain" value={domain} onChange={event => setDomain(event.target.value)} placeholder="example.com" className="min-h-14 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-5 text-base outline-none ring-cyan-400 placeholder:text-slate-600 focus:ring-2" required />
          <button disabled={loading} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-7 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{loading ? 'Scanning…' : 'Scan domain'} <ArrowRight size={19} /></button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          {['WHOIS & DNS', 'Certificate & HTTP signals', 'Exposure score'].map((item, index) => <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><div className="mb-3 text-cyan-400">{index === 0 ? <Radar size={20} /> : index === 1 ? <ShieldCheck size={20} /> : <Clock3 size={20} />}</div><p className="font-medium">{item}</p><p className="mt-1 text-sm text-slate-500">Results stream in as each category finishes.</p></div>)}
        </div>
      </section>
    </main>
  );
}
