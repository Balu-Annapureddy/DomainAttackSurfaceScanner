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
    <div className="bg-[#10151b] border border-[#1e2631] p-2 overflow-x-auto">
      <div className="flex items-center min-w-[680px] gap-2">
        <div className="font-mono text-[10px] font-bold text-[#8b9bb0] uppercase pr-2 border-r border-[#1e2631] shrink-0">
          SYS // PIPELINE
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1 font-mono text-xs">
          {PIPELINE_ITEMS.map((item) => {
            const status = categories[item.key]?.status ?? 'pending';
            const isSelected = activeCategory === item.key;

            let symbol = '·';
            let symbolColor = 'text-[#576575]';
            let bgClass = 'bg-[#0c1015] border-[#1e2631]';

            if (status === 'completed') {
              symbol = '✓';
              symbolColor = 'text-[#3fb950]';
              bgClass = 'bg-[#0c1015] border-[#2ea043]/40';
            } else if (status === 'running') {
              symbol = '►';
              symbolColor = 'text-[#58a6ff] animate-pulse';
              bgClass = 'bg-[#15273b] border-[#388bfd]';
            } else if (status === 'failed') {
              symbol = '!';
              symbolColor = 'text-[#d29922]';
              bgClass = 'bg-[#0c1015] border-[#bb8009]/40';
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectCategory?.(item.key)}
                className={`flex items-center justify-between px-2 py-1 border text-left cursor-pointer transition ${bgClass} ${
                  isSelected ? 'border-[#58a6ff] bg-[#151c23]' : 'hover:bg-[#151c23]'
                }`}
                title={`Pipeline Stage: ${item.name} (${status})`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#576575]">[{item.id}]</span>
                  <span className="font-medium text-[#e6edf3] text-[11px] truncate">{item.name}</span>
                </div>
                <span className={`font-bold ${symbolColor} text-xs ml-1`}>{symbol}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
