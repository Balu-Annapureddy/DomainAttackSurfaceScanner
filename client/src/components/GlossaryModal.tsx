import { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e14]/85 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col console-panel shadow-2xl overflow-hidden font-mono">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#1f2735] px-5 py-3.5 bg-[#111620]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#388bfd]/30 bg-[#162030] text-[#58a6ff]">
              <BookOpen size={14} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">
                KNOWLEDGE GUIDE // TECHNICAL TERMINOLOGY & OSINT EPISTEMOLOGY
              </h2>
              <p className="text-[11px] text-[#9aa5b8] font-sans">
                Technical definitions explained in plain English for security analysts and beginners.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="console-btn py-1 px-2 text-[#9aa5b8] hover:text-[#e6edf3]"
          >
            <X size={15} />
          </button>
        </div>

        {/* ─── Body (Master/Detail Layout) ────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          {/* Term List Sidebar (Cols 1-4) */}
          <div className="flex flex-col border-b border-[#1f2735] md:border-b-0 md:border-r md:col-span-4 bg-[#0d121a]">
            {/* Search */}
            <div className="p-3 border-b border-[#1f2735]">
              <input
                type="text"
                placeholder="Search concepts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="console-input text-xs h-8"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#171e2b] max-h-48 md:max-h-[500px]">
              {filtered.map(([key, item]) => {
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`w-full text-left p-3 transition text-xs ${
                      isSelected
                        ? 'bg-[#161c28] border-l-2 border-l-[#388bfd] text-[#e6edf3]'
                        : 'text-[#9aa5b8] hover:bg-[#111620] hover:text-[#e6edf3]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{item.term}</span>
                      <span className="console-tag text-[9px]">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#626e82] line-clamp-2 font-sans">
                      {item.shortExplanation}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Term Detail (Cols 5-12) */}
          <div className="flex-1 overflow-y-auto p-5 md:col-span-8 space-y-4 bg-[#111620]">
            {/* Title & Badge */}
            <div className="border-b border-[#1f2735] pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="console-tag console-tag-cyan text-[10px]">
                  CATEGORY // {activeEntry.category.toUpperCase()}
                </span>
                <span className="console-tag console-tag-phosphor text-[10px]">
                  PEER_REVIEWED
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#e6edf3]">
                {activeEntry.term}
              </h3>
              <p className="mt-1 text-xs text-[#58a6ff] font-sans">
                {activeEntry.shortExplanation}
              </p>
            </div>

            {/* 4 Structured Pillars */}
            <div className="space-y-4 font-sans text-xs">
              {/* Pillar 1: What is this? */}
              <div className="console-panel-inset p-3.5 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#58a6ff]">
                  [01] WHAT IS THIS?
                </div>
                <p className="text-[#e6edf3] leading-relaxed">
                  {activeEntry.whatIsThis}
                </p>
              </div>

              {/* Pillar 2: Why it matters */}
              <div className="console-panel-inset p-3.5 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d29922]">
                  [02] WHY IT MATTERS FOR DEFENDERS
                </div>
                <p className="text-[#9aa5b8] leading-relaxed">
                  {activeEntry.whyItMatters}
                </p>
              </div>

              {/* Pillar 3: What does it mean? */}
              <div className="console-panel-inset p-3.5 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#3fb950]">
                  [03] WHAT DOES IT MEAN IN PRACTICE?
                </div>
                <p className="text-[#e6edf3] leading-relaxed">
                  {activeEntry.whatDoesItMean}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[#1f2735] px-5 py-3 bg-[#0d121a] text-xs text-[#626e82]">
          <span>EPISTEMOLOGY: “WE DID NOT OBSERVE X” ≠ “X DOES NOT EXIST”</span>
          <button
            onClick={onClose}
            className="console-btn py-1 px-3 text-xs"
          >
            DISMISS
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
