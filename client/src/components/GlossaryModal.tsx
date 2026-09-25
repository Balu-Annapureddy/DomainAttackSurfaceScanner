import { useState } from 'react';
import { BookOpen, HelpCircle, X, ShieldCheck, Info } from 'lucide-react';
import { GLOSSARY, type GlossaryEntry } from '../lib/glossary';

interface GlossaryModalProps {
  initialTermKey?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GlossaryModal({ initialTermKey, isOpen, onClose }: GlossaryModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>(initialTermKey || 'passive_osint');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const entries = Object.entries(GLOSSARY);
  const filtered = entries.filter(([key, entry]) =>
    entry.term.toLowerCase().includes(search.toLowerCase()) ||
    entry.shortExplanation.toLowerCase().includes(search.toLowerCase()) ||
    key.toLowerCase().includes(search.toLowerCase())
  );

  const fallbackEntry: GlossaryEntry = GLOSSARY.passive_osint ?? {
    term: 'Passive OSINT',
    category: 'general',
    shortExplanation: 'Passive open source intelligence reconnaissance.',
    whatIsThis: 'Observation of publicly visible perimeter data.',
    whyItMatters: 'Safe and non-intrusive discovery of external attack surface.',
    whatDoesItMean: 'Absence of evidence is not evidence of absence.',
  };
  const activeEntry: GlossaryEntry = GLOSSARY[selectedKey] ?? fallbackEntry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">How to Read This Scanner: Knowledge Guide</h2>
              <p className="text-xs text-slate-400">Plain-English explanations of technical terms, signals, and security concepts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close glossary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Sidebar + Detail */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-h-[420px]">
          {/* Sidebar / List */}
          <div className="w-full md:w-72 border-r border-slate-800 bg-slate-950/30 flex flex-col">
            <div className="p-3 border-b border-slate-800/80">
              <input
                type="text"
                placeholder="Search concepts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map(([key, entry]) => (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex flex-col ${
                    selectedKey === key
                      ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-medium">{entry.term}</span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">{entry.shortExplanation}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Detail Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                {activeEntry.category.toUpperCase()}
              </span>
              <h3 className="text-xl font-bold text-white mt-2">{activeEntry.term}</h3>
              <p className="text-sm font-medium text-cyan-300 mt-1 italic">
                “{activeEntry.shortExplanation}”
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Info size={14} className="text-cyan-400" />
                  What is this?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{activeEntry.whatIsThis}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-400" />
                  Why does it matter?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{activeEntry.whyItMatters}</p>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-cyan-400" />
                  What does it mean in this scan?
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">{activeEntry.whatDoesItMean}</p>
              </div>
            </div>

            {/* Passive Epistemology Notice */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3.5 text-[11px] text-slate-400 flex items-start gap-2.5">
              <span className="text-cyan-400 text-sm font-bold">💡</span>
              <div>
                <strong className="text-slate-200">The Core Principle of Passive Reconnaissance:</strong>{' '}
                <em>“We did not observe X” ≠ “X does not exist.”</em> Our scanner operates strictly on public signals and never intrudes, breaks authentication, or probes behind private network perimeters.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/70 text-xs text-slate-400">
          <span>DomainAttackSurfaceScanner • Education & Defensive Hygiene</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

interface TermExplainerProps {
  termKey: string;
  label?: string;
  className?: string;
  onOpenGlossary: (key: string) => void;
}

export function TermExplainer({ termKey, label, className = '', onOpenGlossary }: TermExplainerProps) {
  const entry = GLOSSARY[termKey];
  const displayLabel = label ?? entry?.term ?? termKey;

  return (
    <button
      type="button"
      onClick={() => onOpenGlossary(termKey)}
      className={`inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition group text-left ${className}`}
      title={entry ? `${entry.term}: ${entry.shortExplanation}` : 'Click for explanation'}
    >
      <span className="border-b border-dotted border-slate-600 group-hover:border-cyan-400">{displayLabel}</span>
      <HelpCircle size={12} className="text-slate-500 group-hover:text-cyan-400 transition inline shrink-0" />
    </button>
  );
}
