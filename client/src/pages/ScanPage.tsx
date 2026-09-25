import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Globe2,
  Clock3,
  ArrowLeft,
  XCircle,
  RotateCw,
  GitFork,
  Layers,
  AlertTriangle,
  FileText,
  ShieldCheck,
  BookOpen,
  Network,
  Sparkles,
  SlidersHorizontal,
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
import ExecutiveSummary from '../components/ExecutiveSummary';
import AssetChainVisualizer from '../components/AssetChainVisualizer';
import GlossaryModal from '../components/GlossaryModal';

type ActiveViewTab = 'surface' | 'chains' | 'summary' | 'inventory' | 'findings' | 'raw';

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>('surface');
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
          return; // Stop polling on terminal statuses
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
      <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl border border-rose-500/20 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex justify-center text-rose-400">
            <XCircle size={36} />
          </div>
          <h1 className="text-xl font-bold text-white">Scan Unavailable</h1>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            {error ?? 'The requested scan could not be found or has expired.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <ArrowLeft size={14} /> Back to Scanner
            </Link>
            <Link
              to="/scan/sample"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <Sparkles size={13} className="text-cyan-400" /> View Demo Scan
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100 flex items-center justify-center">
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 animate-spin items-center justify-center rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-sm font-semibold text-white">Connecting to Scanner Service…</p>
          <p className="mt-1 text-xs text-slate-400">Retrieving intelligence pipeline state</p>
        </div>
      </main>
    );
  }

  if (!scan) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white hover:text-cyan-400 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Globe2 size={18} />
            </div>
            <span>Domain Attack Surface Scanner</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Guided Mode Toggle */}
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isGuidedMode
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
              }`}
              title="Toggle beginner-friendly explanations and guided cards"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Mode:</span> {isGuidedMode ? 'Guided' : 'Technical'}
            </button>

            {/* Glossary Button */}
            <button
              type="button"
              onClick={() => openGlossary('passive_osint')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
              title="Open terminology guide and explanations"
            >
              <BookOpen size={14} className="text-cyan-400" />
              <span className="hidden md:inline">Knowledge Guide</span>
            </button>

            <Link
              to={`/report/${scan.scanId}`}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition"
              title="Open full printable intelligence report"
            >
              <FileText size={13} />
              <span>Report</span>
            </Link>

            <Link
              to="/history"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              <Clock3 size={14} />
              <span className="hidden sm:inline">History</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              <RotateCw size={13} />
              <span>New</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-5 pt-6 space-y-6">
        {/* Category Stepper Bar */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={activeViewTab === 'raw' ? selectedCategoryTab : undefined}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* Scan Overview Hero Card */}
        <ScanOverviewCard
          scan={scan}
          onOpenGlossary={openGlossary}
          isGuidedMode={isGuidedMode}
        />

        {/* Navigation Tabs for Views */}
        <div className="flex border-b border-slate-800/80 pb-px gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveViewTab('surface')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'surface'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <GitFork size={14} />
            <span>Attack Surface Visuals</span>
          </button>

          <button
            onClick={() => setActiveViewTab('chains')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'chains'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Network size={14} />
            <span>Routing Chains</span>
          </button>

          <button
            onClick={() => setActiveViewTab('summary')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'summary'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveViewTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'inventory'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers size={14} />
            <span>Normalized Assets ({scan.assets?.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('findings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'findings'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Security Findings ({scan.findings?.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
              activeViewTab === 'raw'
                ? 'border-slate-700 bg-slate-900 text-cyan-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <FileText size={14} />
            <span>Raw Category Data</span>
          </button>
        </div>

        {/* View Tab: Executive Summary */}
        {activeViewTab === 'summary' && (
          <ExecutiveSummary scan={scan} />
        )}

        {/* View Tab: Asset Relationship Chains */}
        {activeViewTab === 'chains' && (
          <AssetChainVisualizer
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        )}

        {/* View Tab 1: Attack Surface Visuals (Graph & Map) */}
        {activeViewTab === 'surface' && (
          <div className="space-y-6">
            <AttackSurfaceGraph
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />

            <InfrastructureMap
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* View Tab 2: Assets Inventory Table */}
        {activeViewTab === 'inventory' && (
          <AssetsInventoryTable
            assets={scan.assets ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        )}

        {/* View Tab 3: Security Findings */}
        {activeViewTab === 'findings' && (
          <FindingsSection
            findings={scan.findings ?? []}
            onOpenGlossary={openGlossary}
          />
        )}

        {/* View Tab 4: Raw Category Data */}
        {activeViewTab === 'raw' && (
          <CategoryInspectionTabs
            scan={scan}
            defaultCategory={selectedCategoryTab}
          />
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

      {/* Reusable Glossary Modal */}
      <GlossaryModal
        initialTermKey={glossaryInitialTerm}
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </main>
  );
}
