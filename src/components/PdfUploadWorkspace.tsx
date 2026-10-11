import React, { useState } from 'react';
import {
  Upload,
  FileText,
  X,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  RotateCcw,
  ArrowRight,
  Download,
  Scale,
  BookOpen,
  CheckCircle2,
  Gavel,
} from 'lucide-react';
import {
  SAMPLE_COURT_CASES,
  SampleCasePreset,
  createSampleCourtPdfFile,
} from '../utils/samplePdfGenerator';

export interface ProcessingStepState {
  stepNumber: number;
  label: string;
  detail: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

interface PdfUploadWorkspaceProps {
  selectedFile: File | null;
  isSampleFile: boolean;
  isProcessing: boolean;
  processingState: ProcessingStepState | null;
  errorMessage: string | null;
  isScannedPdfWarning: boolean;
  onSelectFile: (file: File, isSample?: boolean) => void;
  onClearFile: () => void;
  onStartAnalysis: () => void;
  onCancelProcessing: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export const PdfUploadWorkspace: React.FC<PdfUploadWorkspaceProps> = ({
  selectedFile,
  isSampleFile,
  isProcessing,
  processingState,
  errorMessage,
  isScannedPdfWarning,
  onSelectFile,
  onClearFile,
  onStartAnalysis,
  onCancelProcessing,
  fileInputRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValidationError, setLocalValidationError] = useState<string | null>(
    null
  );

  const handleValidateAndSelect = (file: File, isSample = false) => {
    setLocalValidationError(null);
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setLocalValidationError(
        `Error has occurred: Unsupported file format ("${file.name}"). Please upload a valid PDF court document (.pdf).`
      );
      return;
    }
    if (file.size === 0) {
      setLocalValidationError(
        'Error has occurred: The uploaded PDF file is empty (0 bytes).'
      );
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setLocalValidationError(
        'Error has occurred: File size exceeds the 25 MB limit. Please upload a smaller court document.'
      );
      return;
    }
    onSelectFile(file, isSample);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleValidateAndSelect(file, false);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleValidateAndSelect(file, false);
    }
  };

  const handleLoadSamplePdf = (preset: SampleCasePreset) => {
    if (isProcessing) return;
    const pdfFile = createSampleCourtPdfFile(preset);
    handleValidateAndSelect(pdfFile, true);
  };

  const handleDownloadSamplePdf = (
    e: React.MouseEvent,
    preset: SampleCasePreset
  ) => {
    e.stopPropagation();
    const pdfFile = createSampleCourtPdfFile(preset);
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = preset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeError = localValidationError || errorMessage;

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-10 space-y-12">
      {/* Main Hero & Judicial Filing Intake Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Formal Editorial Presentation */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-slate-300 rounded-lg p-8 space-y-8">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 border-b border-slate-200 pb-3">
              <Scale className="w-4 h-4 text-slate-900 shrink-0" />
              <span>
                Paper Juris · Indian Court Document Intelligence · Supreme Court · High Courts · Tribunals
              </span>
            </div>

            <h1
              className="font-serif-legal text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-slate-950 leading-[1.15]"
              style={{ textWrap: 'balance' }}
            >
              Understand Court Documents. Faster.
            </h1>

            <p className="text-base text-slate-700 leading-relaxed">
              Transform lengthy Indian court judgments into structured,
              evidence-backed case insights.
            </p>

            {/* Structured Capability Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Case Type & Final Outcome
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Classifies judgments, bail orders, and interim petitions while
                  isolating the exact operative decree from concluding pages.
                </p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Multilingual Native Analysis
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accepts court PDFs in English, Hindi, Marathi, Tamil, Telugu,
                  Kannada, Bengali, and more—responding in the PDF's language.
                </p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Statutory Context Tagging
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preserves original Acts & Sections and labels whether each was
                  argued by counsel, discussed, or applied by the Bench.
                </p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Page-Verified Quotations
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cross-checks every extracted quote against the PDF text layer
                  and rejects incomplete or invalid non-court files.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Judgment</span>
              </button>

              {selectedFile && !isProcessing && (
                <button
                  type="button"
                  onClick={onStartAnalysis}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Proceed to Judicial Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <span className="text-xs font-mono-tabular text-slate-500">
              Max 25 MB · Up to 120 Pages · PDF Only
            </span>
          </div>
        </div>

        {/* Right Column: Official Filing Intake & Sample Docket Loader */}
        <div className="lg:col-span-6 flex flex-col">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 rounded-lg border bg-white overflow-hidden flex flex-col justify-between transition-colors ${
              isDragging
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-300'
            }`}
          >
            {/* Top Header of Intake Box */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FileText className="w-4 h-4 text-slate-300" />
                <span>Court Record Filing Intake</span>
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-300">
                Digital Text Layer Verification Enabled
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Select court PDF file"
            />

            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              {!selectedFile ? (
                <div
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex-1 min-h-[210px] border border-dashed border-slate-300 rounded bg-slate-50/60 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-500 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-slate-900"
                >
                  <div className="w-11 h-11 rounded bg-slate-900 text-white flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-950">
                    Drop Certified Court PDF Here or Click to Select File
                  </p>
                  <p className="text-xs text-slate-600 mt-1 max-w-md">
                    Accepts Supreme Court, High Court, District Court, and
                    Tribunal PDFs in English or regional Indian languages.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-4 rounded bg-slate-50 border border-slate-300">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Selected Court Record
                        </p>
                        <p className="text-sm font-bold text-slate-950 truncate mt-0.5">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-600 font-mono-tabular mt-1">
                          File Size: {formatFileSize(selectedFile.size)}
                          {isSampleFile
                            ? ' · Reference Court Docket (Live Extraction)'
                            : ' · Ready for Page-Preserved Extraction'}
                        </p>
                      </div>
                    </div>

                    {!isProcessing && (
                      <button
                        type="button"
                        onClick={onClearFile}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/60 transition-colors shrink-0"
                        title="Remove selected file"
                        aria-label="Remove selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Processing Progress Indicator */}
                  {isProcessing && processingState && (
                    <div className="p-5 rounded bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                          <span className="text-xs font-semibold tracking-wide">
                            Stage {processingState.stepNumber} of 4 ·{' '}
                            {processingState.label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={onCancelProcessing}
                          className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          Abort
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-mono-tabular">
                        {processingState.detail}
                      </p>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full transition-all duration-200"
                          style={{
                            width: `${Math.min(100, processingState.stepNumber * 25)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Bar when file is selected */}
                  {!isProcessing && (
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={onClearFile}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Select Different File
                      </button>
                      <button
                        type="button"
                        onClick={onStartAnalysis}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Extract & Analyze Record</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Built-in Reference Court Dockets for Instant Testing */}
              <div className="pt-5 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Reference Indian Court Dockets (Live Pipeline Test)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Generates multi-page PDF & runs live analysis
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SAMPLE_COURT_CASES.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-950 line-clamp-1 font-serif-legal">
                          {preset.title}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {preset.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleLoadSamplePdf(preset)}
                          className="text-xs font-semibold text-slate-900 hover:underline disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Load Docket into Intake →
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadSamplePdf(e, preset)}
                          className="p-1 text-slate-500 hover:text-slate-900 rounded"
                          title="Download this sample PDF to your computer"
                          aria-label={`Download ${preset.filename}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error or Incomplete/Invalid Document Alert Banner */}
      {activeError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50/90 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-red-950">
                {isScannedPdfWarning
                  ? 'Error Has Occurred — Uploaded Document Is Incomplete or Invalid (OCR Required)'
                  : 'Error Has Occurred — Uploaded Document Is Incomplete or Invalid'}
              </h2>
              <p className="text-xs text-red-900 leading-relaxed">
                {activeError}
              </p>
              {isScannedPdfWarning && (
                <p className="text-xs text-red-800 pt-1">
                  Limitation Note: This environment extracts embedded digital
                  text layers via PDF.js without native Tesseract/vision OCR for
                  multi-page rasterized scans. Please upload a complete,
                  text-searchable PDF (such as e-Courts / High Court digital
                  orders).
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedFile && !isScannedPdfWarning && !localValidationError && (
              <button
                type="button"
                onClick={onStartAnalysis}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setLocalValidationError(null);
                onClearFile();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-red-950 bg-white border border-red-300 hover:bg-red-100 rounded whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset Intake
            </button>
          </div>
        </div>
      )}

      {/* 4-Stage Judicial Verification Pipeline */}
      <section className="rounded-lg border border-slate-300 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-950">
              Evidentiary Processing & Verification Methodology
            </h2>
            <p className="text-xs text-slate-500">
              Every uploaded court filing undergoes four sequential verification
              stages before rendering the docket brief
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6 space-y-2">
            <p className="text-xs font-mono-tabular font-semibold text-slate-500">
              STAGE 01
            </p>
            <h3 className="text-sm font-bold text-slate-950">
              Folio Extraction & Validity Gate
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts digital text page-by-page while detecting language script
              and rejecting incomplete fragments or non-court files.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <p className="text-xs font-mono-tabular font-semibold text-slate-500">
              STAGE 02
            </p>
            <h3 className="text-sm font-bold text-slate-950">
              Cause-Title & Statutory Indexing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Identifies litigants, roles, and exact statutory provisions (IPC,
              CrPC, CPC, Arbitration Act, etc.) in the document's native
              language.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <p className="text-xs font-mono-tabular font-semibold text-slate-500">
              STAGE 03
            </p>
            <h3 className="text-sm font-bold text-slate-950">
              Concluding Operative Decree Pass
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Audits concluding pages specifically so opening recitals or
              procedural history are never mistaken for the final order.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <p className="text-xs font-mono-tabular font-semibold text-slate-500">
              STAGE 04
            </p>
            <h3 className="text-sm font-bold text-slate-950">
              Verbatim Source Grounding
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Programmatically matches every AI quotation against the extracted
              page text and flags any unverified claims for review.
            </p>
          </div>
        </div>
      </section>

      {/* Formal Institutional Disclaimer */}
      <section className="rounded-lg border border-slate-300 bg-white p-6 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <h3 className="font-bold text-slate-950">
            Statutory Disclaimer & Data Confidentiality Notice
          </h3>
          <p>
            <strong>Not Legal Advice:</strong> Paper Juris is an automated
            document review and information organization tool. It does not
            provide legal advice or substitute for a qualified advocate.
            AI-generated summaries and extracted fields may contain errors or
            omissions and must always be verified against the original certified
            court order.
          </p>
          <p>
            <strong>Session Confidentiality:</strong> PDF text extraction runs
            locally in browser memory, and extracted text segments are processed
            via the server-side Gemini API strictly for structured extraction.
            Documents are held in memory for your active session only and are
            never permanently stored.
          </p>
        </div>
      </section>
    </div>
  );
};
