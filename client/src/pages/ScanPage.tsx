import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock3,
  ArrowLeft,
  XCircle,
  RotateCw,
  FileText,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { getScan } from '../lib/api';
import type { DomainScan, Asset, ScanCategory } from '../../../shared/types';
import SecurityAssessmentSummary from '../components/SecurityAssessmentSummary';
import WhatNeedsAttention from '../components/WhatNeedsAttention';
import WhatLooksGood from '../components/WhatLooksGood';
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
import WorkstationNav from '../components/WorkstationNav';

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const openGlossary = (termKey?: string) => {
    setGlossaryInitialTerm(termKey || 'passive_osint');
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
    const el = document.getElementById('sec-telemetry');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (!scanId || error || (!scan && !loading)) {
    return (
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 font-mono transition-colors">
        <div className="max-w-md console-panel p-6 text-center space-y-3">
          <XCircle size={28} className="mx-auto text-red-500" />
          <h1 className="text-sm font-bold tracking-wider">ASSESSMENT UNAVAILABLE</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {error ?? 'The requested domain assessment could not be found or has expired from memory.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link to="/" className="console-btn console-btn-primary text-xs">
              <ArrowLeft size={12} />
              <span>RETURN TO SEARCH</span>
            </Link>
            <Link to="/scan/sample" className="console-btn text-xs text-[var(--accent-primary)]">
              <Sparkles size={11} />
              <span>VIEW SAMPLE REPORT</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center font-mono transition-colors">
        <div className="console-panel p-6 text-center space-y-2">
          <div className="mx-auto h-6 w-6 animate-spin border-2 border-[var(--border-technical)] border-t-[var(--accent-primary)] rounded-full" />
          <p className="text-xs text-[var(--text-primary)] font-bold tracking-wider">PREPARING SECURITY ASSESSMENT…</p>
          <p className="text-[11px] text-[var(--text-muted)]">Gathering and analyzing publicly observable domain data</p>
        </div>
      </main>
    );
  }

  if (!scan) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-12 font-sans w-full transition-colors duration-150 flex flex-col">
      <WorkstationNav onOpenGlossary={openGlossary} />

      {/* ─── Security Assessment Sub-Header ─────────────────────────── */}
      <div className="border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] px-4 sm:px-8 py-3 text-xs">
        <div className="mx-auto flex max-w-[1720px] flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-extrabold text-sm sm:text-base text-[var(--accent-primary)] truncate max-w-[280px] sm:max-w-md">
              ASSESSMENT: {scan.domain}
            </span>
            <span className="text-[var(--border-muted)] hidden sm:inline">•</span>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
              <span className="console-tag font-bold text-[var(--accent-primary)]">PUBLIC RECONNAISSANCE</span>
              <span className="text-[var(--text-muted)]">ID: {scan.scanId.slice(0, 8)}…</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`console-btn py-1.5 px-3 text-xs font-semibold rounded-xs ${
                isGuidedMode ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-active-bg)]' : 'text-[var(--text-secondary)]'
              }`}
              title="Toggle guided interpretation vs raw technical telemetry"
            >
              <SlidersHorizontal size={13} />
              <span>{isGuidedMode ? 'VIEW: HUMAN-FIRST' : 'VIEW: TECHNICAL'}</span>
            </button>

            <Link
              to={`/report/${encodeURIComponent(scan.scanId)}`}
              className="console-btn console-btn-primary py-1.5 px-3.5 text-xs font-bold rounded-xs"
            >
              <FileText size={13} />
              <span>PRINTABLE REPORT</span>
            </Link>

            <Link to="/history" className="console-btn py-1.5 px-3 text-xs text-[var(--text-secondary)] rounded-xs">
              <Clock3 size={13} />
              <span className="hidden sm:inline">HISTORY</span>
            </Link>

            <Link to="/" className="console-btn console-btn-phosphor py-1.5 px-3 text-xs font-bold rounded-xs">
              <RotateCw size={13} />
              <span>NEW SCAN</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Human-First Assessment Report Layout ──────────────── */}
      <div className="mx-auto max-w-[1720px] px-4 sm:px-8 pt-8 space-y-10 sm:space-y-12 pb-4">
        {/* Compact Pipeline Stepper */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={selectedCategoryTab}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* ─── 01. Human-Readable Security Assessment Summary ────────── */}
        <SecurityAssessmentSummary
          scan={scan}
          onOpenGlossary={openGlossary}
        />

        {/* ─── 02. What Needs Your Attention (Prioritized Action Items) ─ */}
        <section id="sec-attention" className="w-full scroll-mt-14">
          <WhatNeedsAttention
            scan={scan}
            onOpenGlossary={openGlossary}
          />
        </section>

        {/* ─── 03. What Looks Good (Confirmed Protections) ───────────── */}
        <section id="sec-good" className="w-full scroll-mt-14">
          <WhatLooksGood
            scan={scan}
          />
        </section>

        {/* ─── 04. Transparent Score Breakdown & Hygiene Dimensions ───── */}
        <section id="sec-score" className="w-full scroll-mt-14">
          <ScanOverviewCard
            scan={scan}
            onOpenGlossary={openGlossary}
            isGuidedMode={isGuidedMode}
          />
        </section>

        {/* ─── Quick Section Navigation Anchor Bar ──────────────────── */}
        <nav aria-label="Section shortcuts" className="flex items-center gap-2 overflow-x-auto py-2.5 text-xs font-mono border-b border-[var(--border-technical)] sticky top-0 bg-[var(--bg-canvas)]/95 backdrop-blur-xs z-20">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] shrink-0">SECTIONS:</span>
          <a href="#sec-attention" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Needs Attention ({scan.findings?.filter(f => ['critical', 'high', 'medium'].includes(f.severity.toLowerCase())).length ?? 0})
          </a>
          <a href="#sec-good" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            What Looks Good
          </a>
          <a href="#sec-score" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Score Calculation
          </a>
          <a href="#sec-topology" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Domain Topology
          </a>
          <a href="#sec-map" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Infrastructure Map
          </a>
          <a href="#sec-telemetry" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Detailed Inspections
          </a>
          <a href="#sec-inventory" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            Asset Inventory ({scan.assets?.length ?? 0})
          </a>
          <a href="#sec-findings" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-technical)] shrink-0 transition">
            All Findings ({scan.findings?.length ?? 0})
          </a>
        </nav>

        {/* ─── 05. Attack Surface Topology Graph (2-Column Desktop) ─── */}
        <section id="sec-topology" className="w-full scroll-mt-14">
          <AttackSurfaceGraph
            sectionNumber="05"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 06. Infrastructure Distribution Map (2-Column Desktop) ─ */}
        <section id="sec-map" className="w-full scroll-mt-14">
          <InfrastructureMap
            sectionNumber="06"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 07. Detailed Component Inspections ───────────────────── */}
        <section id="sec-telemetry" className="w-full scroll-mt-14">
          <CategoryInspectionTabs
            scan={scan}
            defaultCategory={selectedCategoryTab}
            onOpenGlossary={openGlossary}
          />
        </section>

        {/* ─── 08. Asset Routing Chains ─────────────────────────────── */}
        <section id="sec-chains" className="w-full scroll-mt-14">
          <AssetChainVisualizer
            sectionNumber="08"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 09. Attack Surface Asset Inventory Table ─────────────── */}
        <section id="sec-inventory" className="w-full scroll-mt-14">
          <AssetsInventoryTable
            sectionNumber="09"
            assets={scan.assets ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 10. All Findings & In-Depth Technical Analysis ────────── */}
        <section id="sec-findings" className="w-full scroll-mt-14">
          <FindingsSection
            sectionNumber="10"
            findings={scan.findings ?? []}
            onOpenGlossary={openGlossary}
          />
        </section>
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

      {/* ─── Compact Legal Footer ─────────────────────────────────── */}
      <footer className="mt-8 border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
        <div className="mx-auto max-w-[1720px] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // RECONNAISSANCE CONSOLE</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">TERMS OF USE</Link>
            <Link to="/cookies" className="hover:text-[var(--text-primary)] transition-colors">COOKIE POLICY</Link>
            <Link to="/billing" className="hover:text-[var(--text-primary)] transition-colors">BILLING &amp; REFUNDS</Link>
            <Link to="/security" className="hover:text-[var(--text-primary)] transition-colors">SECURITY &amp; AUTHORIZED USE</Link>
            <a
              href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GITHUB
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
