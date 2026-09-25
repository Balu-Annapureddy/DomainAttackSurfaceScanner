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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080b0f]/85 p-3 backdrop-blur-xs font-mono">
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col bg-[#10151b] border border-[#1e2631] shadow-2xl overflow-hidden">
        {/* ─── Workstation Dossier Header ─────────────────────────────── */}
        <div className="dossier-header">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-[#58a6ff]" />
            <span>SECURITY FIELD MANUAL</span>
            <span className="text-[11px] text-[#8b9bb0] ml-2">TECHNICAL LEXICON & OSINT EPISTEMOLOGY</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b9bb0] hover:text-[#e6edf3] cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-12 text-xs">
          {/* Term List Sidebar (Cols 1-4) */}
          <div className="flex flex-col border-b border-[#1e2631] md:border-b-0 md:border-r md:col-span-4 bg-[#0c1015]">
            <div className="p-2 border-b border-[#1e2631]">
              <input
                type="text"
                placeholder="SEARCH TERM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="console-input text-[11px] h-7"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#171f28] max-h-48 md:max-h-[480px]">
              {filtered.map(([key, item]) => {
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`w-full text-left p-2.5 transition text-[11px] cursor-pointer ${
                      isSelected
                        ? 'bg-[#151c23] border-l-2 border-l-[#58a6ff] text-[#e6edf3]'
                        : 'text-[#8b9bb0] hover:bg-[#10151b] hover:text-[#e6edf3]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[#e6edf3]">{item.term}</span>
                      <span className="text-[9px] text-[#576575] uppercase">{item.category}</span>
                    </div>
                    <div className="text-[10px] text-[#576575] line-clamp-1 font-sans">
                      {item.shortExplanation}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Term Detail (Cols 5-12) */}
          <div className="flex-1 overflow-y-auto p-4 md:col-span-8 space-y-3 bg-[#10151b]">
            <div className="border-b border-[#1e2631] pb-2.5">
              <div className="text-[10px] text-[#58a6ff] font-bold uppercase tracking-wider mb-1">
                LEXICON // {activeEntry.category.toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-[#e6edf3]">
                {activeEntry.term}
              </h3>
              <p className="text-xs text-[#8b9bb0] font-sans mt-0.5">
                {activeEntry.shortExplanation}
              </p>
            </div>

            {/* 3 Field Manual Pillars */}
            <div className="space-y-2.5 font-sans text-xs">
              <div className="bg-[#0c1015] border border-[#1e2631] p-3 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#58a6ff]">
                  WHAT IS THIS?
                </div>
                <p className="text-[#e6edf3] leading-relaxed text-[11px]">
                  {activeEntry.whatIsThis}
                </p>
              </div>

              <div className="bg-[#0c1015] border border-[#1e2631] p-3 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d29922]">
                  WHY DOES IT MATTER?
                </div>
                <p className="text-[#8b9bb0] leading-relaxed text-[11px]">
                  {activeEntry.whyItMatters}
                </p>
              </div>

              <div className="bg-[#0c1015] border border-[#1e2631] p-3 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#3fb950]">
                  WHAT DID THIS SCAN OBSERVE?
                </div>
                <p className="text-[#e6edf3] leading-relaxed text-[11px]">
                  {activeEntry.whatDoesItMean}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[#1e2631] px-4 py-2 bg-[#0c1015] text-[10px] text-[#576575]">
          <span>EPISTEMOLOGY: “WE DID NOT OBSERVE X” ≠ “X DOES NOT EXIST”</span>
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
