import type { DomainScan, ScanCategory } from '../../../shared/types';

interface ScanProgressStepperProps {
  categories: DomainScan['categories'];
  activeCategory?: ScanCategory;
  onSelectCategory?: (category: ScanCategory) => void;
}

const PIPELINE_ITEMS: Array<{
  key: ScanCategory;
  id: string;
  name: string;
}> = [
  { key: 'whois', id: '01', name: 'WHOIS' },
  { key: 'dns', id: '02', name: 'DNS' },
  { key: 'subdomains', id: '03', name: 'CT LOGS' },
  { key: 'tls', id: '04', name: 'TLS' },
  { key: 'http', id: '05', name: 'HTTP' },
  { key: 'exposure', id: '06', name: 'EXPOSURE' },
  { key: 'scoring', id: '07', name: 'HYGIENE' },
];

export default function ScanProgressStepper({
  categories,
  activeCategory,
  onSelectCategory,
}: ScanProgressStepperProps) {
  return (
    <div className="console-panel p-2.5 sm:p-3 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[700px] gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#626e82] uppercase pr-2 border-r border-[#1f2735] shrink-0">
          <span>PIPELINE:</span>
        </div>

        <div className="flex items-center justify-between flex-1 gap-1.5 font-mono text-xs">
          {PIPELINE_ITEMS.map((item) => {
            const status = categories[item.key]?.status ?? 'pending';
            const isSelected = activeCategory === item.key;

            // Status symbols and color classes
            let symbol = '·';
            let statusColor = 'text-[#626e82]';
            let borderClass = 'border-[#1f2735]';

            if (status === 'completed') {
              symbol = '✓';
              statusColor = 'text-[#3fb950]';
              borderClass = 'border-[#3fb950]/30 bg-[#3fb950]/5';
            } else if (status === 'running') {
              symbol = '►';
              statusColor = 'text-[#58a6ff] animate-pulse';
              borderClass = 'border-[#58a6ff]/40 bg-[#58a6ff]/10';
            } else if (status === 'failed') {
              symbol = '!';
              statusColor = 'text-[#d29922]';
              borderClass = 'border-[#d29922]/30 bg-[#d29922]/5';
            } else if (status === 'pending') {
              symbol = '…';
              statusColor = 'text-[#626e82]';
              borderClass = 'border-[#171e2b] bg-[#0d121a]';
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectCategory?.(item.key)}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border text-left transition ${borderClass} ${
                  isSelected ? 'ring-1 ring-[#58a6ff] bg-[#161c28]' : 'hover:bg-[#161c28]'
                }`}
                title={`Category: ${item.name} (${status}) - click to inspect`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#626e82]">[{item.id}]</span>
                  <span className="font-semibold text-[#e6edf3] text-[11px]">{item.name}</span>
                </div>
                <span className={`font-bold ${statusColor} text-xs`}>{symbol}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
