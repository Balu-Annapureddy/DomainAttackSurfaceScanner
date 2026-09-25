import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock3,
  ArrowLeft,
  XCircle,
  RotateCw,
  GitFork,
  Layers,
  AlertTriangle,
  FileText,
  BookOpen,
  Network,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  ListTree,
} from 'lucide-react';
import { getScan } from '../lib/api';
import type { DomainScan, Asset, ScanCategory } from '../../../shared/types';
import ScanOverviewCard from '../components/ScanOverviewCard';
import ScanProgressStepper from '../components/ScanProgressStepper';
import InfrastructureMap from '../components/InfrastructureMap';
import AttackSurfaceGraph from '../components/AttackSurfaceGraph';
import FindingsSection from '../components/FindingsSection';
import AssetsInventoryTable from '../components/AssetsInventoryTable';
import CategoryInspectionTabs from '../components/CategoryInspectionTabs';
import AssetDetailModal from '../components/AssetDetailModal';
import AssetChainVisualizer from '../components/AssetChainVisualizer';
import GlossaryModal from '../components/GlossaryModal';

type ActiveViewTab = 'graph' | 'map' | 'chains' | 'inventory' | 'findings' | 'raw' | 'all';

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>('graph');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<ScanCategory>('dns');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [glossaryInitialTerm, setGlossaryInitialTerm] = useState<string>('passive_osint');
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(() => {
    return localStorage.getItem('dass_guided_mode') !== 'false';
  });

  const toggleGuidedMode = () => {
    setIsGuidedMode((prev) => {
      const next = !prev;
      localStorage.setItem('dass_guided_mode', String(next));
      return next;
    });
  };

  const openGlossary = (termKey: string) => {
    setGlossaryInitialTerm(termKey);
    setIsGlossaryOpen(true);
  };

  useEffect(() => {
    if (!scanId) return;

    let active = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const current = await getScan(scanId);
        if (!active) return;
        setScan(current);
        setLoading(false);
        setError(null);

        // Enrich browser localStorage history with scan metrics
        try {
          const stored = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as Array<{
            scanId: string;
            domain: string;
            createdAt: string;
            status?: string;
            score?: number | null;
            assetCount?: number;
            findingCount?: number;
            warningsCount?: number;
          }>;
          const updated = stored.map((item) => {
            if (item.scanId === current.scanId) {
              return {
                ...item,
                status: current.status,
                score: current.score,
                assetCount: current.assets?.length ?? 0,
                findingCount: current.findings?.length ?? 0,
                warningsCount: current.warnings?.length ?? 0,
              };
            }
            return item;
          });
          localStorage.setItem('domain_scanner_scans', JSON.stringify(updated));
        } catch {
          // Ignore localStorage errors
        }

        if (current.status !== 'running') {
          return;
        }
        timer = window.setTimeout(() => {
          void poll();
        }, 2000);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load scan');
        setLoading(false);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [scanId]);

  const handleCategorySelectFromStepper = (category: ScanCategory) => {
    setSelectedCategoryTab(category);
    setActiveViewTab('raw');
  };

  if (!scanId || error || (!scan && !loading)) {
    return (
      <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] flex items-center justify-center p-4 font-mono">
        <div className="max-w-md console-panel p-6 text-center space-y-3">
          <XCircle size={28} className="mx-auto text-[#f85149]" />
          <h1 className="text-sm font-bold">SCAN RECORD UNAVAILABLE</h1>
          <p className="text-xs text-[#8b9bb0] leading-relaxed">
            {error ?? 'The requested scan could not be found or has expired from memory.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link to="/" className="console-btn console-btn-primary text-xs">
              <ArrowLeft size={12} />
              <span>RETURN TO CONSOLE</span>
            </Link>
            <Link to="/scan/sample" className="console-btn text-xs text-[#58a6ff]">
              <Sparkles size={11} />
              <span>VIEW SAMPLE SCAN</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] flex items-center justify-center font-mono">
        <div className="console-panel p-6 text-center space-y-2">
          <div className="mx-auto h-6 w-6 animate-spin border-2 border-[#58a6ff]/30 border-t-[#58a6ff]" />
          <p className="text-xs text-[#e6edf3] font-bold">INITIALIZING WORKSTATION TELEMETRY…</p>
          <p className="text-[11px] text-[#576575]">Querying public reconnaissance pipelines</p>
        </div>
      </main>
    );
  }

  if (!scan) return null;

  return (
    <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] pb-12 font-sans w-full">
      {/* ─── Ultra-Compact Security Workstation Header ──────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#1e2631] bg-[#10151b] px-3 sm:px-5 py-1.5">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#58a6ff] hover:text-[#e6edf3] transition"
            >
              <span>DAS // WORKSTATION</span>
            </Link>
            <span className="text-[#1e2631] hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#8b9bb0]">
              <span className="text-[#3fb950] font-semibold">PASSIVE-EXTERNAL</span>
              <span>•</span>
              <span className="text-[#576575]">ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`console-btn py-0.5 px-2 text-[10px] ${
                isGuidedMode ? 'border-[#58a6ff] text-[#58a6ff]' : 'text-[#8b9bb0]'
              }`}
              title="Toggle guided interpretation vs raw technical dossier"
            >
              <SlidersHorizontal size={10} />
              <span>{isGuidedMode ? 'GUIDED' : 'TECH'}</span>
            </button>

            <button
              type="button"
              onClick={() => openGlossary('passive_osint')}
              className="console-btn py-0.5 px-2 text-[10px] text-[#8b9bb0]"
              title="Open cybersecurity field manual"
            >
              <BookOpen size={10} className="text-[#58a6ff]" />
              <span className="hidden md:inline">FIELD MANUAL</span>
            </button>

            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-0.5 px-2 text-[10px]"
            >
              <FileText size={10} />
              <span>DOSSIER</span>
            </Link>

            <Link to="/history" className="console-btn py-0.5 px-2 text-[10px] text-[#8b9bb0]">
              <Clock3 size={10} />
              <span className="hidden sm:inline">HISTORY</span>
            </Link>

            <Link to="/" className="console-btn console-btn-phosphor py-0.5 px-2 text-[10px]">
              <RotateCw size={10} />
              <span>NEW SCAN</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Workstation Layout ─────────────────────────────────── */}
      <div className="mx-auto max-w-[1720px] px-3 sm:px-5 pt-3 space-y-2.5">
        {/* Compact Pipeline Stepper */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={activeViewTab === 'raw' ? selectedCategoryTab : undefined}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* Dense Telemetry Strip */}
        <ScanOverviewCard
          scan={scan}
          onOpenGlossary={openGlossary}
          isGuidedMode={isGuidedMode}
        />

        {/* ─── Operational View Tabs ─────────────────────────────────── */}
        <div className="flex border-b border-[#1e2631] gap-1 overflow-x-auto font-mono text-xs pt-1">
          <button
            onClick={() => setActiveViewTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'graph'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <GitFork size={12} />
            <span>[RELATIONSHIP GRAPH]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'map'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <MapPin size={12} />
            <span>[INFRASTRUCTURE MAP]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('chains')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'chains'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <Network size={12} />
            <span>[ROUTING CHAINS]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'inventory'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <Layers size={12} />
            <span>[ASSET INVENTORY ({scan.assets?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('findings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'findings'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <AlertTriangle size={12} />
            <span>[FINDINGS ({scan.findings?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'raw'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <FileText size={12} />
            <span>[RAW TELEMETRY]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'all'
                ? 'border-[#1e2631] bg-[#10151b] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b9bb0] hover:text-[#e6edf3] hover:bg-[#10151b]/50'
            }`}
          >
            <ListTree size={12} />
            <span>[ALL DOSSIER SECTIONS]</span>
          </button>
        </div>

        {/* ─── Primary View 1: Topology Graph (Default) ──────────────── */}
        {activeViewTab === 'graph' && (
          <div className="w-full">
            <AttackSurfaceGraph
              sectionNumber="03"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 2: Infrastructure Map */}
        {activeViewTab === 'map' && (
          <div className="w-full">
            <InfrastructureMap
              sectionNumber="04"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 3: Routing Chains */}
        {activeViewTab === 'chains' && (
          <div className="w-full">
            <AssetChainVisualizer
              sectionNumber="05"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 4: Inventory Table */}
        {activeViewTab === 'inventory' && (
          <div className="w-full">
            <AssetsInventoryTable
              sectionNumber="06"
              assets={scan.assets ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 5: Findings Records */}
        {activeViewTab === 'findings' && (
          <div className="w-full">
            <FindingsSection
              sectionNumber="07"
              findings={scan.findings ?? []}
              onOpenGlossary={openGlossary}
            />
          </div>
        )}

        {/* Primary View 6: Raw Telemetry */}
        {activeViewTab === 'raw' && (
          <div className="w-full">
            <CategoryInspectionTabs
              scan={scan}
              defaultCategory={selectedCategoryTab}
            />
          </div>
        )}

        {/* Primary View 7: All Dossier Sections Sequentially */}
        {activeViewTab === 'all' && (
          <div className="space-y-4 w-full">
            <AttackSurfaceGraph
              sectionNumber="03"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <InfrastructureMap
              sectionNumber="04"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <AssetChainVisualizer
              sectionNumber="05"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <AssetsInventoryTable
              sectionNumber="06"
              assets={scan.assets ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <FindingsSection
              sectionNumber="07"
              findings={scan.findings ?? []}
              onOpenGlossary={openGlossary}
            />
          </div>
        )}
      </div>

      {/* Asset Detail & Evidence Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          assets={scan.assets ?? []}
          relationships={scan.relationships ?? []}
          onClose={() => setSelectedAsset(null)}
          onSelectRelatedAsset={(nextAsset) => setSelectedAsset(nextAsset)}
        />
      )}

      {/* Security Field Manual Modal */}
      <GlossaryModal
        initialTermKey={glossaryInitialTerm}
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </main>
  );
}
