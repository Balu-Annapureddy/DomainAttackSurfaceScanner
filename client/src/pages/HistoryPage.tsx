import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, History, Radar } from 'lucide-react';

interface HistoryItem { scanId: string; domain: string; createdAt: string }

export default function HistoryPage() {
  let items: HistoryItem[] = [];
  try { items = JSON.parse(localStorage.getItem('reconlab_scans') || '[]') as HistoryItem[]; } catch { /* corrupted local history is treated as empty */ }
  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6"><Link to="/" className="flex items-center gap-2 text-lg font-semibold"><Radar className="text-cyan-400" /> ReconLab</Link><Link to="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={17} /> New scan</Link></nav>
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-8"><div className="flex items-center gap-3"><History className="text-cyan-400" /><h1 className="text-3xl font-bold">Scan history</h1></div><p className="mt-2 text-slate-400">Recent scans saved in this browser.</p>
      {items.length === 0 ? <div className="mt-12 rounded-2xl border border-dashed border-slate-700 p-12 text-center"><p className="text-slate-300">No scans yet.</p><Link to="/" className="mt-4 inline-block text-cyan-400 hover:underline">Start your first scan</Link></div> :
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <Link key={item.scanId} to={`/scan/${item.scanId}`} className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/60"><div className="flex items-start justify-between"><div><p className="font-semibold">{item.domain}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></div><ExternalLink size={17} className="text-slate-500 transition group-hover:text-cyan-400" /></div><p className="mt-5 truncate font-mono text-xs text-slate-600">{item.scanId}</p></Link>)}</div>}
    </section>
  </main>;
}
