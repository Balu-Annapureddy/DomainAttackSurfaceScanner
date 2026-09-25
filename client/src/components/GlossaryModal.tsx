import { useState, useEffect } from 'react';
import { BookOpen, X, Info } from 'lucide-react';
import { GLOSSARY, type GlossaryEntry } from '../lib/glossary';

interface GlossaryModalProps {
  initialTermKey?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GlossaryModal({ initialTermKey, isOpen, onClose }: GlossaryModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>(initialTermKey || 'passive_osint');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const entries = Object.entries(GLOSSARY);
  const filtered = entries.filter(([key, entry]) =>
    entry.term.toLowerCase().includes(search.toLowerCase()) ||
    entry.shortExplanation.toLowerCase().includes(search.toLowerCase()) ||
    key.toLowerCase().includes(search.toLowerCase()),
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-sans"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col bg-[var(--bg-panel)] border border-[var(--border-technical)] shadow-2xl overflow-hidden rounded-2xl">
        {/* ─── Workstation Dossier Header ─────────────────────────────── */}
        <div className="dossier-header px-5 py-4 border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-active-bg)] text-[var(--accent-primary)]">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 id="glossary-modal-title" className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                SECURITY FIELD MANUAL
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">TECHNICAL LEXICON &amp; OSINT EPISTEMOLOGY</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary modal"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-inset)] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-12 text-sm">
          {/* Term List Sidebar (Cols 1-5) */}
          <div className="flex flex-col border-b border-[var(--border-muted)] md:border-b-0 md:border-r md:col-span-5 bg-[var(--bg-panel-inset)]">
            <div className="p-3 border-b border-[var(--border-muted)]">
              <input
                type="text"
                placeholder="Search definitions &amp; terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="console-input text-xs h-9 px-3 w-full rounded-lg"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-muted)] max-h-56 md:max-h-[500px]">
              {filtered.map(([key, item]) => {
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`w-full text-left p-3.5 transition text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-active-bg)] border-l-4 border-l-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--text-primary)] text-sm">{item.term}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-panel-subtle)] text-[var(--text-muted)] border border-[var(--border-muted)]">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] line-clamp-2">
                      {item.shortExplanation}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Term Detail (Cols 6-12) */}
          <div className="flex-1 overflow-y-auto p-6 md:col-span-7 space-y-4 bg-[var(--bg-panel)]">
            <div className="border-b border-[var(--border-muted)] pb-4">
              <div className="inline-block text-[11px] font-mono text-[var(--accent-primary)] font-bold uppercase tracking-wider mb-1.5 px-2 py-0.5 rounded bg-[var(--accent-active-bg)]">
                LEXICON // {activeEntry.category.toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {activeEntry.term}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                {activeEntry.shortExplanation}
              </p>
            </div>

            {/* 3 Field Manual Pillars */}
            <div className="space-y-3 text-sm">
              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 space-y-1.5 rounded-xl shadow-xs">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  WHAT IS THIS?
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed text-xs sm:text-sm">
                  {activeEntry.whatIsThis}
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 space-y-1.5 rounded-xl shadow-xs">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#d97706] dark:text-[#f59e0b]">
                  WHY DOES IT MATTER?
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed text-xs sm:text-sm">
                  {activeEntry.whyItMatters}
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 space-y-1.5 rounded-xl shadow-xs">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d]">
                  WHAT DID THIS SCAN OBSERVE?
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed text-xs sm:text-sm">
                  {activeEntry.whatDoesItMean}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[var(--border-technical)] px-5 py-3 bg-[var(--bg-panel-subtle)] text-xs text-[var(--text-muted)]">
          <span className="font-mono text-[11px]">EPISTEMOLOGY: “WE DID NOT OBSERVE X” &ne; “X DOES NOT EXIST”</span>
          <button
            onClick={onClose}
            className="console-btn py-1 px-4 text-xs font-medium cursor-pointer"
          >
            CLOSE MANUAL
          </button>
        </div>
      </div>
    </div>
  );
}

export function TermExplainer({
  termKey,
  onOpen,
  label = 'What is this?',
}: {
  termKey: string;
  onOpen: (key: string) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(termKey)}
      className="inline-flex items-center gap-1 font-mono text-[10px] text-[#58a6ff] hover:underline cursor-pointer"
      title={`Open terminology definition for ${termKey}`}
    >
      <Info size={10} />
      <span>{label}</span>
    </button>
  );
}
