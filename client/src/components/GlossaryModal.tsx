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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs font-mono"
    >
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col bg-[var(--bg-panel)] border border-[var(--border-technical)] shadow-2xl overflow-hidden rounded-xs">
        {/* ─── Workstation Dossier Header ─────────────────────────────── */}
        <div className="dossier-header">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-[var(--accent-primary)]" />
            <span id="glossary-modal-title">SECURITY FIELD MANUAL</span>
            <span className="text-[11px] text-[var(--text-secondary)] ml-2">TECHNICAL LEXICON &amp; OSINT EPISTEMOLOGY</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary modal"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-12 text-xs">
          {/* Term List Sidebar (Cols 1-4) */}
          <div className="flex flex-col border-b border-[var(--border-muted)] md:border-b-0 md:border-r md:col-span-4 bg-[var(--bg-panel-inset)]">
            <div className="p-2 border-b border-[var(--border-muted)]">
              <input
                type="text"
                placeholder="SEARCH TERM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="console-input text-[11px] h-7"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-muted)] max-h-48 md:max-h-[480px]">
              {filtered.map(([key, item]) => {
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`w-full text-left p-2.5 transition text-[11px] cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-active-bg)] border-l-2 border-l-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[var(--text-primary)]">{item.term}</span>
                      <span className="text-[9px] text-[var(--text-muted)] uppercase">{item.category}</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 font-sans">
                      {item.shortExplanation}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Term Detail (Cols 5-12) */}
          <div className="flex-1 overflow-y-auto p-4 md:col-span-8 space-y-3 bg-[var(--bg-panel)]">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <div className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-wider mb-1">
                LEXICON // {activeEntry.category.toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {activeEntry.term}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
                {activeEntry.shortExplanation}
              </p>
            </div>

            {/* 3 Field Manual Pillars */}
            <div className="space-y-2.5 font-sans text-xs">
              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1 rounded-xs">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  WHAT IS THIS?
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed text-[11px]">
                  {activeEntry.whatIsThis}
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1 rounded-xs">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d97706] dark:text-[#f59e0b]">
                  WHY DOES IT MATTER?
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">
                  {activeEntry.whyItMatters}
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1 rounded-xs">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d]">
                  WHAT DID THIS SCAN OBSERVE?
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed text-[11px]">
                  {activeEntry.whatDoesItMean}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[var(--border-muted)] px-4 py-2 bg-[var(--bg-panel-subtle)] text-[10px] text-[var(--text-muted)]">
          <span>EPISTEMOLOGY: “WE DID NOT OBSERVE X” &ne; “X DOES NOT EXIST”</span>
          <button
            onClick={onClose}
            className="console-btn py-0.5 px-2 text-[10px]"
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
