import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  BookOpen,
} from 'lucide-react';
import {
  LegalDocumentAnalysis,
  ProvisionContext,
} from '../types/legal';
import {
  downloadAnalysisAsJson,
  downloadPrintableCaseBrief,
} from '../utils/exportUtils';
import { SourceEvidenceModal } from './SourceEvidenceModal';

interface ResultsDashboardProps {
  analysis: LegalDocumentAnalysis;
  onStartNewAnalysis: () => void;
}

type DashboardSectionTab =
  | 'all'
  | 'provisions'
  | 'reasoning'
  | 'evidence'
  | 'fulltext';

function formatContextLabel(context: ProvisionContext): string {
  switch (context) {
    case 'court applied':
      return 'Applied by Court';
    case 'court discussion':
      return 'Judicial Discussion';
    case 'party argument':
      return 'Submission of Counsel';
    case 'court distinguished':
      return 'Distinguished by Court';
    default:
      return 'Context Unspecified';
  }
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  analysis,
  onStartNewAnalysis,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<DashboardSectionTab>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Filters for Legal Provisions
  const [provisionContextFilter, setProvisionContextFilter] =
    useState<string>('all');
  const [provisionSearch, setProvisionSearch] = useState('');

  // Expandable quotations state
  const [expandedProvisionIndices, setExpandedProvisionIndices] = useState<
    Record<number, boolean>
  >({});

  // Searchable Full Document Text state
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docQuickFilterType, setDocQuickFilterType] = useState<
    'none' | 'parties' | 'provisions' | 'operative'
  >('none');
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'all'>(
    'all'
  );

  // Source Evidence Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    pageNumber: number;
    quotation: string | null;
    title: string;
  }>({
    isOpen: false,
    pageNumber: 1,
    quotation: null,
    title: '',
  });

  const openEvidenceViewer = (
    pageNumber: number | null,
    quotation: string | null,
    title: string
  ) => {
    setModalState({
      isOpen: true,
      pageNumber: pageNumber && pageNumber >= 1 ? pageNumber : 1,
      quotation,
      title,
    });
  };

  const handleCopySummary = async () => {
    const summaryText = [
      `COURT: ${analysis.caseInformation.courtName || 'Not specified'}`,
      `CASE NUMBER: ${analysis.caseInformation.caseNumber || analysis.documentFilename}`,
      `DATE OF PRONOUNCEMENT: ${analysis.caseInformation.judgmentDate || 'Not specified'}`,
      `DOCUMENT CLASSIFICATION: ${analysis.documentType} (${analysis.caseInformation.caseCategories.join(', ')})`,
      `DOCUMENT LANGUAGE: ${analysis.detectedLanguage || 'English'}`,
      '',
      'HEADNOTE / SUMMARY:',
      analysis.caseAnalysis.plainEnglishSummary,
      '',
      'OPERATIVE ORDER / FINAL DECREE:',
      analysis.caseAnalysis.outcomeVerified &&
      analysis.caseAnalysis.finalOperativeOrder
        ? analysis.caseAnalysis.finalOperativeOrder
        : 'Outcome not verified',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Fallback
    }
  };

  const toggleProvisionQuote = (idx: number) => {
    setExpandedProvisionIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Filtered legal provisions
  const filteredProvisions = analysis.legalProvisions.filter((lp) => {
    const matchesContext =
      provisionContextFilter === 'all' || lp.context === provisionContextFilter;
    const matchesSearch =
      !provisionSearch.trim() ||
      lp.actName.toLowerCase().includes(provisionSearch.toLowerCase()) ||
      lp.sectionOrArticle
        .toLowerCase()
        .includes(provisionSearch.toLowerCase()) ||
      lp.supportingQuotation
        .toLowerCase()
        .includes(provisionSearch.toLowerCase());
    return matchesContext && matchesSearch;
  });

  // Compute highlight terms for Document Text Viewer
  const getActiveHighlightTerms = (): string[] => {
    const terms: string[] = [];
    if (docSearchQuery.trim().length >= 2) {
      terms.push(docSearchQuery.trim());
    }
    if (docQuickFilterType === 'parties') {
      analysis.parties.forEach((p) => {
        if (p.name && p.name.length >= 3) terms.push(p.name);
      });
    } else if (docQuickFilterType === 'provisions') {
      analysis.legalProvisions.forEach((lp) => {
        if (lp.sectionOrArticle) terms.push(lp.sectionOrArticle);
        if (lp.actName) terms.push(lp.actName);
      });
    } else if (
      docQuickFilterType === 'operative' &&
      analysis.caseAnalysis.outcomeEvidenceQuotation
    ) {
      terms.push(analysis.caseAnalysis.outcomeEvidenceQuotation.slice(0, 45));
    }
    return Array.from(new Set(terms));
  };

  const activeHighlightTerms = getActiveHighlightTerms();

  const filteredPages = analysis.pages.filter((page) => {
    if (selectedPageFilter !== 'all' && page.pageNumber !== selectedPageFilter) {
      return false;
    }
    if (docSearchQuery.trim().length >= 2) {
      return page.text
        .toLowerCase()
        .includes(docSearchQuery.trim().toLowerCase());
    }
    if (docQuickFilterType !== 'none' && activeHighlightTerms.length > 0) {
      const lower = page.text.toLowerCase();
      return activeHighlightTerms.some((t) => lower.includes(t.toLowerCase()));
    }
    return true;
  });

  const renderTextWithHighlights = (text: string, terms: string[]) => {
    if (!terms.length) return text;
    const escaped = terms
      .filter((t) => t.trim().length >= 2)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!escaped.length) return text;

    try {
      const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, idx) =>
        regex.test(part) ? (
          <mark
            key={idx}
            className="bg-amber-200 text-slate-950 px-0.5 rounded font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    } catch {
      return text;
    }
  };

  // Identify primary petitioner/appellant and respondent for formal Cause Title display
  const primaryInitiator =
    analysis.parties.find((p) =>
      /petitioner|appellant|applicant|plaintiff|claimant|complainant|याचिकाकर्ता|वादी|अपीलार्थी|अर्जदार/i.test(
        p.role
      )
    ) || analysis.parties[0];

  const primaryResponder =
    analysis.parties.find(
      (p) =>
        p !== primaryInitiator &&
        /respondent|defendant|accused|state|opposite|प्रतिवादी|अभियुक्त|आरोपी|प्रत्यर्थी/i.test(
          p.role
        )
    ) || analysis.parties[1];

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Sample Demonstration Data Notice if user loaded a built-in test PDF */}
      {analysis.isDemonstrationSample && (
        <div className="no-print rounded-lg border border-slate-300 bg-white px-5 py-3 flex items-center justify-between gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-slate-800 shrink-0" />
            <span>
              <strong>Reference Court Record Loaded:</strong> This docket was
              generated from a built-in multi-page court PDF and verified live
              through PDF.js extraction and Gemini statutory analysis.
            </span>
          </div>
          <button
            type="button"
            onClick={onStartNewAnalysis}
            className="font-semibold text-slate-950 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upload Custom Filing →
          </button>
        </div>
      )}

      {/* FORMAL JUDICIAL DOCKET & CAUSE TITLE SHEET */}
      <section className="rounded-lg border border-slate-300 bg-white overflow-hidden">
        {/* Top Institutional Banner */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Scale className="w-4 h-4 text-slate-300 shrink-0" />
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
              <span className="font-semibold text-white">
                Paper Juris Judicial Docket
              </span>
              <span aria-hidden="true">·</span>
              <span>{analysis.documentType}</span>
              <span aria-hidden="true">·</span>
              <span>
                {analysis.caseInformation.caseCategories.join(' / ') ||
                  'General Jurisdiction'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Language: {analysis.detectedLanguage || 'English'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {analysis.pagesProcessed}{' '}
                {analysis.pagesProcessed === 1 ? 'Page' : 'Pages'}
              </span>
            </div>
          </div>

          {/* Formal Export & Action Toolbar */}
          <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Headnote Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Headnote</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => downloadAnalysisAsJson(analysis)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => downloadPrintableCaseBrief(analysis)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Brief (.txt)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-white rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* Formal Court Heading & Cause Title Block */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                {analysis.caseInformation.jurisdiction
                  ? `${analysis.caseInformation.courtName || 'Court of Record'} · ${analysis.caseInformation.jurisdiction}`
                  : analysis.caseInformation.courtName ||
                    'Judicial Record Extract'}
              </p>

              <h1 className="font-serif-legal text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight leading-snug">
                {primaryInitiator && primaryResponder
                  ? `${primaryInitiator.name} v. ${primaryResponder.name}`
                  : analysis.caseInformation.caseNumber ||
                    analysis.documentFilename}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-1">
                {analysis.caseInformation.caseNumber && (
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    Proceeding No: {analysis.caseInformation.caseNumber}
                  </span>
                )}
                {analysis.caseInformation.benchOrJudges && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Coram: {analysis.caseInformation.benchOrJudges}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">
                  Source File: {analysis.documentFilename}
                </span>
              </div>
            </div>

            {/* Formal Verification Stamp */}
            <div className="border border-slate-200 rounded bg-slate-50 px-4 py-3 text-xs space-y-1 shrink-0">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                {analysis.caseAnalysis.outcomeVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <span>
                  Evidentiary Audit: {analysis.qualityIndicators.evidenceQuality}
                </span>
              </div>
              <p className="text-slate-600 font-mono-tabular">
                {analysis.qualityIndicators.totalVerifiedQuotations} of{' '}
                {analysis.qualityIndicators.totalCheckedQuotations} Source
                Quotations Matched
              </p>
            </div>
          </div>

          {/* 6-Column Formal Judicial Register Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-xs">
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Nature of Instrument</p>
              <p className="font-semibold text-slate-950">
                {analysis.documentType}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Subject Classification</p>
              <p className="font-semibold text-slate-950">
                {analysis.caseInformation.caseCategories.join(', ') || 'Other'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Case / Docket Number</p>
              <p className="font-semibold text-slate-950 font-mono-tabular">
                {analysis.caseInformation.caseNumber || 'Not stated in record'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Date of Pronouncement</p>
              <p className="font-semibold text-slate-950 font-mono-tabular">
                {analysis.caseInformation.judgmentDate || 'Not stated in record'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Record Language</p>
              <p className="font-semibold text-slate-950">
                {analysis.detectedLanguage || 'English'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Operative Decree Status</p>
              <p className="font-semibold text-slate-950">
                {analysis.caseAnalysis.outcomeVerified &&
                analysis.caseAnalysis.finalOperativeOrder
                  ? `Verified (Page ${analysis.caseAnalysis.outcomeSourcePage ?? 1})`
                  : 'Outcome not verified'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quality & Missing Fields Alert Banner */}
      {(analysis.qualityIndicators.missingFields.length > 0 ||
        analysis.qualityIndicators.conflictingFindings.length > 0 ||
        analysis.qualityIndicators.verificationNotes.length > 0) && (
        <section
          className={`rounded-lg border p-5 text-xs space-y-2.5 ${
            analysis.qualityIndicators.missingFields.length >= 2 ||
            !analysis.caseAnalysis.outcomeVerified
              ? 'border-red-300 bg-red-50/80 text-red-950'
              : 'border-amber-300 bg-amber-50/60 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                analysis.qualityIndicators.missingFields.length >= 2 ||
                !analysis.caseAnalysis.outcomeVerified
                  ? 'text-red-700'
                  : 'text-amber-800'
              }`}
            />
            <span>
              {analysis.qualityIndicators.missingFields.length >= 2 ||
              !analysis.caseAnalysis.outcomeVerified
                ? 'Error Has Occurred — Uploaded Document Is Incomplete or Invalid (Missing Essential Court Sections)'
                : `Judicial Verification Notice — ${
                    analysis.qualityIndicators.humanVerificationRecommended
                      ? 'Manual Verification Recommended'
                      : 'Verified Against Extracted Record'
                  }`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-black/10">
            <div>
              <span className="font-semibold">Unresolved Fields: </span>
              <span>
                {analysis.qualityIndicators.missingFields.length > 0
                  ? analysis.qualityIndicators.missingFields.join(', ')
                  : 'None — all primary docket fields identified'}
              </span>
            </div>
            <div>
              <span className="font-semibold">Conflicting Statements: </span>
              <span>
                {analysis.qualityIndicators.conflictingFindings.length > 0
                  ? analysis.qualityIndicators.conflictingFindings.join('; ')
                  : 'No internal contradictions noted'}
              </span>
            </div>
            <div>
              <span className="font-semibold">Audit Remarks: </span>
              <span>
                {analysis.qualityIndicators.verificationNotes.length > 0
                  ? analysis.qualityIndicators.verificationNotes.join(' ')
                  : 'All cited passages cross-checked against page boundaries.'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Executive Summary Highlights Strip */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-300 bg-white p-5 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500">
            Case Classification
          </p>
          <p className="text-base font-bold text-slate-950">
            {analysis.documentType}
          </p>
          <p className="text-xs text-slate-600">
            Category:{' '}
            <span className="font-semibold text-slate-900">
              {analysis.caseInformation.caseCategories.join(' · ') || 'General'}
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500">
            Parties & Enactments Cited
          </p>
          <p className="text-base font-bold text-slate-950 font-mono-tabular">
            {analysis.parties.length} Parties · {analysis.legalProvisions.length}{' '}
            Provisions
          </p>
          <p className="text-xs text-slate-600">
            Applied by Court:{' '}
            <span className="font-semibold text-slate-900 font-mono-tabular">
              {
                analysis.legalProvisions.filter(
                  (p) => p.context === 'court applied'
                ).length
              }{' '}
              statutes
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500">
            Source Quotation Grounding
          </p>
          <p className="text-base font-bold text-slate-950 font-mono-tabular">
            {analysis.qualityIndicators.totalVerifiedQuotations} /{' '}
            {analysis.qualityIndicators.totalCheckedQuotations} Verified
          </p>
          <p className="text-xs text-slate-600">
            Evidence Rating:{' '}
            <span className="font-semibold text-slate-900">
              {analysis.qualityIndicators.evidenceQuality}
            </span>
          </p>
        </div>

        <div
          className={`rounded-lg border p-5 space-y-1.5 ${
            analysis.caseAnalysis.outcomeVerified &&
            analysis.caseAnalysis.finalOperativeOrder
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs font-semibold ${
                analysis.caseAnalysis.outcomeVerified &&
                analysis.caseAnalysis.finalOperativeOrder
                  ? 'text-slate-300'
                  : 'text-amber-800'
              }`}
            >
              Final Outcome / Disposition
            </p>
            {analysis.caseAnalysis.outcomeSourcePage && (
              <button
                type="button"
                onClick={() =>
                  openEvidenceViewer(
                    analysis.caseAnalysis.outcomeSourcePage,
                    analysis.caseAnalysis.outcomeEvidenceQuotation,
                    'Final Operative Order — Certified Extract'
                  )
                }
                className={`text-[11px] font-mono-tabular underline cursor-pointer ${
                  analysis.caseAnalysis.outcomeVerified &&
                  analysis.caseAnalysis.finalOperativeOrder
                    ? 'text-amber-300 hover:text-white'
                    : 'text-amber-900'
                }`}
              >
                Page {analysis.caseAnalysis.outcomeSourcePage} →
              </button>
            )}
          </div>
          <p className="text-xs font-medium leading-relaxed line-clamp-2">
            {analysis.caseAnalysis.outcomeVerified &&
            analysis.caseAnalysis.finalOperativeOrder
              ? analysis.caseAnalysis.finalOperativeOrder
              : 'Outcome not verified — inspect concluding page manually'}
          </p>
        </div>
      </section>

      {/* Formal Section Navigation Bar */}
      <div className="no-print border-b border-slate-300 flex items-center gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('all')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'all'
              ? 'border-slate-950 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          I. Complete Judicial Brief
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('provisions')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'provisions'
              ? 'border-slate-950 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          II. Statutory Index ({analysis.legalProvisions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('reasoning')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'reasoning'
              ? 'border-slate-950 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          III. Submissions & Ratio Decidendi
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('evidence')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'evidence'
              ? 'border-slate-950 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          IV. Verbatim Evidence Schedule (
          {analysis.caseAnalysis.importantFindingsWithEvidence.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('fulltext')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'fulltext'
              ? 'border-slate-950 text-slate-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          V. Certified Text Transcript ({analysis.pagesProcessed} Pages)
        </button>
      </div>

      {/* SECTION I: HEADNOTE, FACTS, ISSUES & OPERATIVE ORDER */}
      {(activeSubTab === 'all' || activeSubTab === 'reasoning') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Headnote, Questions of Law & Material Facts */}
          <div className="lg:col-span-7 rounded-lg border border-slate-300 bg-white divide-y divide-slate-200">
            {/* Headnote / Summary */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-950">
                  01. Judicial Headnote & Case Overview
                </h2>
                <span className="text-xs text-slate-500">
                  {analysis.detectedLanguage || 'English'}
                </span>
              </div>
              <p className="font-serif-legal text-base text-slate-900 leading-relaxed">
                {analysis.caseAnalysis.plainEnglishSummary}
              </p>
            </div>

            {/* Questions of Law / Issues Framed */}
            <div className="p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-950">
                02. Principal Questions of Law & Issues Framed
              </h3>
              {analysis.caseAnalysis.questionsOrIssues.length > 0 ? (
                <ol className="space-y-2 text-xs text-slate-800 list-decimal pl-4">
                  {analysis.caseAnalysis.questionsOrIssues.map((issue, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {issue}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No separate points for determination were formally numbered in
                  the record.
                </p>
              )}
            </div>

            {/* Material Facts of the Case */}
            <div className="p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-950">
                03. Material Factual Matrix
              </h3>
              {analysis.caseAnalysis.mainFacts.length > 0 ? (
                <ol className="space-y-2 text-xs text-slate-800 list-decimal pl-4">
                  {analysis.caseAnalysis.mainFacts.map((fact, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {fact}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Factual recitals were not separately isolated in this extract.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Final Operative Order & Key Holdings */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Operative Order / Decree Box */}
            <div className="rounded-lg border border-slate-300 bg-white overflow-hidden">
              <div
                className={`px-6 py-3.5 border-b flex items-center justify-between gap-3 ${
                  analysis.caseAnalysis.outcomeVerified &&
                  analysis.caseAnalysis.finalOperativeOrder
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}
              >
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold">
                    04. Final Operative Order & Disposition
                  </h2>
                </div>
                {analysis.caseAnalysis.outcomeVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified in Record</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Outcome not verified</span>
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">
                {analysis.caseAnalysis.outcomeVerified &&
                analysis.caseAnalysis.finalOperativeOrder ? (
                  <>
                    <p className="font-serif-legal text-base font-semibold text-slate-950 leading-relaxed">
                      {analysis.caseAnalysis.finalOperativeOrder}
                    </p>

                    {analysis.caseAnalysis.outcomeEvidenceQuotation && (
                      <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2.5">
                        <p className="text-xs font-semibold text-slate-600">
                          Verbatim Operative Extract:
                        </p>
                        <p className="text-xs font-serif-legal italic text-slate-800 leading-relaxed">
                          "{analysis.caseAnalysis.outcomeEvidenceQuotation}"
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                          <span className="font-mono-tabular">
                            Record Reference: Page{' '}
                            {analysis.caseAnalysis.outcomeSourcePage ?? 'N/A'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              openEvidenceViewer(
                                analysis.caseAnalysis.outcomeSourcePage,
                                analysis.caseAnalysis.outcomeEvidenceQuotation,
                                'Final Operative Order — Certified Extract'
                              )
                            }
                            className="font-semibold text-slate-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>
                              Examine Page{' '}
                              {analysis.caseAnalysis.outcomeSourcePage ?? 1}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 text-xs text-amber-950">
                    <p className="leading-relaxed">
                      <strong>Outcome not verified:</strong> A conclusive
                      operative direction could not be verified verbatim from the
                      concluding pages of this document.
                    </p>
                    {analysis.caseAnalysis.finalOperativeOrder && (
                      <p className="text-slate-700">
                        Unverified note:{' '}
                        {analysis.caseAnalysis.finalOperativeOrder}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        openEvidenceViewer(
                          analysis.pagesProcessed,
                          null,
                          'Examine Concluding Page'
                        )
                      }
                      className="font-semibold text-slate-950 underline cursor-pointer"
                    >
                      Inspect Final Page (Page {analysis.pagesProcessed}) Manually →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Key Judicial Takeaways */}
            <div className="rounded-lg border border-slate-300 bg-white p-6 space-y-3">
              <h2 className="text-sm font-bold text-slate-950 border-b border-slate-200 pb-2.5">
                05. Principal Holdings & Key Takeaways
              </h2>
              {analysis.caseAnalysis.keyTakeaways.length > 0 ? (
                <ol className="space-y-2.5 text-xs text-slate-800 list-decimal pl-4">
                  {analysis.caseAnalysis.keyTakeaways.map((point, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {point}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">
                  No additional holdings recorded.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION II: APPEARANCES & PARTIES ON RECORD */}
      {activeSubTab === 'all' && (
        <section className="rounded-lg border border-slate-300 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                06. Memorandum of Parties on Record ({analysis.parties.length})
              </h2>
              <p className="text-xs text-slate-500">
                Exact litigant names, procedural roles, and verbatim cause-title
                verification
              </p>
            </div>
          </div>

          {analysis.parties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-6 w-12 font-mono-tabular">No.</th>
                    <th className="py-3 px-4">Name of Party (As Styled in Record)</th>
                    <th className="py-3 px-4">Procedural Role</th>
                    <th className="py-3 px-4">Supporting Cause-Title Extract</th>
                    <th className="py-3 px-6 text-right">Record Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {analysis.parties.map((party, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono-tabular text-slate-500 align-top">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-950 align-top">
                        {party.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium align-top whitespace-nowrap">
                        {party.role}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-serif-legal italic align-top max-w-md">
                        "{party.supportingQuotation}"
                      </td>
                      <td className="py-3.5 px-6 text-right align-top whitespace-nowrap font-mono-tabular">
                        <button
                          type="button"
                          onClick={() =>
                            openEvidenceViewer(
                              party.sourcePage,
                              party.supportingQuotation,
                              `Party on Record: ${party.name}`
                            )
                          }
                          className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Page {party.sourcePage ?? 1}</span>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 p-6">
              Individual party names could not be verified from the cause title.
            </p>
          )}
        </section>
      )}

      {/* SECTION III: STATUTORY INDEX (ACTS, ARTICLES & SECTIONS CITED) */}
      {(activeSubTab === 'all' || activeSubTab === 'provisions') && (
        <section className="rounded-lg border border-slate-300 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                07. Index of Enactments, Articles & Statutory Provisions Cited (
                {filteredProvisions.length} of {analysis.legalProvisions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Preserves original statutory references and classifies judicial
                treatment
              </p>
            </div>

            {/* Interactive Filter Controls */}
            <div className="no-print flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={provisionSearch}
                  onChange={(e) => setProvisionSearch(e.target.value)}
                  placeholder="Search Act or Section..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-2 focus:outline-slate-900"
                />
              </div>

              <select
                value={provisionContextFilter}
                onChange={(e) => setProvisionContextFilter(e.target.value)}
                aria-label="Filter provisions by judicial treatment"
                className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 font-medium focus:outline-2 focus:outline-slate-900"
              >
                <option value="all">All Judicial Contexts</option>
                <option value="court applied">Applied by Court</option>
                <option value="court discussion">Judicial Discussion</option>
                <option value="party argument">Submission of Counsel</option>
                <option value="court distinguished">Distinguished by Court</option>
                <option value="unclear">Context Unspecified</option>
              </select>
            </div>
          </div>

          {filteredProvisions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-6">Section / Article</th>
                    <th className="py-3 px-4">Statute / Enactment</th>
                    <th className="py-3 px-4">Judicial Treatment</th>
                    <th className="py-3 px-4">Verbatim Supporting Passage</th>
                    <th className="py-3 px-6 text-right">Record Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredProvisions.map((prov, idx) => {
                    const isExpanded = Boolean(expandedProvisionIndices[idx]);
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-bold text-slate-950 align-top whitespace-nowrap">
                          {prov.sectionOrArticle}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 align-top">
                          {prov.actName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 align-top whitespace-nowrap">
                          {formatContextLabel(prov.context)}
                        </td>
                        <td className="py-3.5 px-4 align-top max-w-lg space-y-1">
                          <p
                            className={`font-serif-legal italic text-slate-700 leading-relaxed ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            "{prov.supportingQuotation}"
                          </p>
                          {prov.supportingQuotation.length > 130 && (
                            <button
                              type="button"
                              onClick={() => toggleProvisionQuote(idx)}
                              className="no-print text-[11px] font-semibold text-slate-600 hover:text-slate-950 inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  <span>Read full passage</span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right align-top whitespace-nowrap font-mono-tabular">
                          <button
                            type="button"
                            onClick={() =>
                              openEvidenceViewer(
                                prov.sourcePage,
                                prov.supportingQuotation,
                                `${prov.sectionOrArticle}, ${prov.actName}`
                              )
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>p. {prov.sourcePage ?? 1}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">
              No statutory citations match the active filter criteria.
            </p>
          )}
        </section>
      )}

      {/* SECTION IV: SUBMISSIONS OF COUNSEL VS. RATIO DECIDENDI */}
      {(activeSubTab === 'all' || activeSubTab === 'reasoning') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submissions of Counsel */}
          <section className="lg:col-span-6 rounded-lg border border-slate-300 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-950">
                08. Submissions & Contentions of Counsel
              </h2>
              <p className="text-xs text-slate-500">
                Arguments advanced by respective parties (segregated from
                judicial findings)
              </p>
            </div>

            <div className="p-6">
              {analysis.caseAnalysis.partyArguments.length > 0 ? (
                <div className="space-y-5 divide-y divide-slate-200">
                  {analysis.caseAnalysis.partyArguments.map((group, idx) => (
                    <div
                      key={idx}
                      className={idx > 0 ? 'pt-5 space-y-2.5' : 'space-y-2.5'}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-950">
                          On Behalf of: {group.partyOrSide}
                        </h3>
                        {group.sourcePages.length > 0 && (
                          <div className="flex items-center gap-1 text-xs font-mono-tabular text-slate-500">
                            <span>Ref:</span>
                            {group.sourcePages.map((pNum) => (
                              <button
                                key={pNum}
                                type="button"
                                onClick={() =>
                                  openEvidenceViewer(
                                    pNum,
                                    group.summaryOfArguments[0] || null,
                                    `Submissions: ${group.partyOrSide}`
                                  )
                                }
                                className="text-slate-900 font-semibold hover:underline px-1 cursor-pointer"
                              >
                                p.{pNum}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <ol className="space-y-2 text-xs text-slate-800 list-decimal pl-4">
                        {group.summaryOfArguments.map((pt, i) => (
                          <li key={i} className="leading-relaxed pl-1">
                            {pt}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Individual party submissions were not separately recorded.
                </p>
              )}
            </div>
          </section>

          {/* Court's Reasoning / Ratio Decidendi */}
          <section className="lg:col-span-6 rounded-lg border border-slate-300 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-950">
                09. Judicial Reasoning & Ratio Decidendi
              </h2>
              <p className="text-xs text-slate-500">
                Observations, statutory interpretation, and findings recorded by
                the Bench
              </p>
            </div>

            <div className="p-6">
              {analysis.caseAnalysis.courtReasoning.length > 0 ? (
                <ol className="space-y-3 text-xs text-slate-900 list-decimal pl-4">
                  {analysis.caseAnalysis.courtReasoning.map((reason, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {reason}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">
                  Detailed judicial reasoning was not separately identified in
                  the extracted text.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* SECTION V: VERBATIM EVIDENCE SCHEDULE */}
      {(activeSubTab === 'all' || activeSubTab === 'evidence') && (
        <section className="rounded-lg border border-slate-300 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-950">
              10. Schedule of Verified Source Passages
            </h2>
            <p className="text-xs text-slate-500">
              Page-anchored verbatim extracts substantiating key judicial
              findings
            </p>
          </div>

          {analysis.caseAnalysis.importantFindingsWithEvidence.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {analysis.caseAnalysis.importantFindingsWithEvidence.map(
                (item, idx) => (
                  <div
                    key={idx}
                    className="p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
                        <span className="font-mono-tabular font-semibold text-slate-500">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-950">
                          {item.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          Page {item.sourcePage ?? 'N/A'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.verifiedInText
                            ? 'Verified in Source Layer'
                            : 'Manual Check Advised'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">
                        {item.claimOrFact}
                      </p>
                      <p className="text-xs font-serif-legal italic text-slate-700 leading-relaxed">
                        "{item.supportingQuotation}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openEvidenceViewer(
                          item.sourcePage,
                          item.supportingQuotation,
                          `${item.category}: ${item.claimOrFact}`
                        )
                      }
                      className="no-print px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Page {item.sourcePage ?? 1}</span>
                    </button>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 p-6">
              No additional evidentiary passages recorded.
            </p>
          )}
        </section>
      )}

      {/* SECTION VI: CERTIFIED TEXT TRANSCRIPT VIEWER */}
      {(activeSubTab === 'all' || activeSubTab === 'fulltext') && (
        <section className="no-print rounded-lg border border-slate-300 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-slate-800 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-slate-950">
                  11. Extracted Court Record Transcript ({analysis.pagesProcessed}{' '}
                  Pages)
                </h2>
                <p className="text-xs text-slate-500">
                  Full page-separated text layer with statutory and party
                  highlighting
                </p>
              </div>
            </div>

            {/* Search & Quick Highlight Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search transcript..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 w-52 focus:outline-2 focus:outline-slate-900"
                />
              </div>

              <select
                value={selectedPageFilter}
                onChange={(e) =>
                  setSelectedPageFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value)
                  )
                }
                aria-label="Filter by page number"
                className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 font-mono-tabular"
              >
                <option value="all">All Pages (1–{analysis.pagesProcessed})</option>
                {analysis.pages.map((p) => (
                  <option key={p.pageNumber} value={p.pageNumber}>
                    Page {p.pageNumber} ({p.wordCount} words)
                  </option>
                ))}
              </select>

              {/* Highlight Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded">
                <button
                  type="button"
                  onClick={() => setDocQuickFilterType('none')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    docQuickFilterType === 'none'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unfiltered
                </button>
                <button
                  type="button"
                  onClick={() => setDocQuickFilterType('parties')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    docQuickFilterType === 'parties'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Parties
                </button>
                <button
                  type="button"
                  onClick={() => setDocQuickFilterType('provisions')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    docQuickFilterType === 'provisions'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Statutes
                </button>
                <button
                  type="button"
                  onClick={() => setDocQuickFilterType('operative')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    docQuickFilterType === 'operative'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Operative Order
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200 bg-white">
            {filteredPages.length > 0 ? (
              filteredPages.map((page) => (
                <div key={page.pageNumber} className="p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-500 font-mono-tabular">
                    <span className="font-semibold text-slate-900">
                      Folio / Page {page.pageNumber} of {analysis.pagesProcessed}
                    </span>
                    <span>
                      {page.wordCount} words · {page.charCount} characters
                    </span>
                  </div>
                  <div className="font-serif-legal text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                    {renderTextWithHighlights(page.text, activeHighlightTerms)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No transcript pages match the current search or filter query.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Formal Institutional Footer */}
      <footer className="rounded-lg border border-slate-300 bg-white px-6 py-4 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="leading-relaxed">
          <strong>Judicial Research & Evidentiary Notice:</strong> This brief is
          compiled automatically from the uploaded court document for research
          and indexing purposes. It does not constitute formal legal opinion.
          Practitioners must verify all statutory citations and operative
          directions against the certified court copy.
        </p>
        <span className="font-mono-tabular font-semibold text-slate-800 shrink-0">
          Paper Juris
        </span>
      </footer>

      {/* Source Evidence Modal */}
      <SourceEvidenceModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        pageNumber={modalState.pageNumber}
        highlightQuotation={modalState.quotation}
        contextTitle={modalState.title}
        pages={analysis.pages}
        onChangePage={(newPage) =>
          setModalState((prev) => ({
            ...prev,
            pageNumber: newPage,
            quotation: null,
          }))
        }
      />
    </div>
  );
};
