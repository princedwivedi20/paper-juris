/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Navbar, ActiveNavTab } from './components/Navbar';
import {
  PdfUploadWorkspace,
  ProcessingStepState,
} from './components/PdfUploadWorkspace';
import { ResultsDashboard } from './components/ResultsDashboard';
import { AboutView } from './components/AboutView';
import {
  extractPdfPages,
  buildPageAwareChunks,
} from './utils/pdfExtractor';
import { LegalDocumentAnalysis } from './types/legal';
import { FileText, Upload } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('analyze');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSampleFile, setIsSampleFile] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingState, setProcessingState] =
    useState<ProcessingStepState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannedPdfWarning, setIsScannedPdfWarning] =
    useState<boolean>(false);
  const [analysisResult, setAnalysisResult] =
    useState<LegalDocumentAnalysis | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSelectFile = (file: File, isSample = false) => {
    setSelectedFile(file);
    setIsSampleFile(isSample);
    setErrorMessage(null);
    setIsScannedPdfWarning(false);
  };

  const handleClearFile = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSelectedFile(null);
    setIsSampleFile(false);
    setIsProcessing(false);
    setProcessingState(null);
    setErrorMessage(null);
    setIsScannedPdfWarning(false);
  };

  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProcessingState(null);
    setErrorMessage('Document analysis was cancelled by user.');
  };

  const handleStartNewAnalysis = () => {
    handleClearFile();
    setActiveTab('analyze');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setIsScannedPdfWarning(false);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Step 1 & 2: Receive, validate, and extract PDF pages while preserving boundaries
      setProcessingState({
        stepNumber: 1,
        label: 'Extracting PDF Pages',
        detail: 'Validating PDF structure and reading page boundaries...',
        status: 'running',
      });

      const extractedDoc = await extractPdfPages(selectedFile, (prog) => {
        setProcessingState({
          stepNumber: 1,
          label: 'Extracting PDF Pages',
          detail: prog.message,
          status: 'running',
        });
      });

      if (abortController.signal.aborted) return;

      // Step 3: Check for missing or scanned image-only pages
      if (extractedDoc.isMostlyScanned) {
        setIsScannedPdfWarning(true);
        setIsProcessing(false);
        setProcessingState(null);
        setErrorMessage(
          `Error has occurred: The uploaded document is incomplete or invalid (${extractedDoc.totalPages} pages with only ${extractedDoc.totalCharacterCount} characters of extractable digital text). Please upload a complete, text-searchable court PDF.`
        );
        return;
      }

      if (extractedDoc.isIncompleteOrInvalidDocument) {
        setIsProcessing(false);
        setProcessingState(null);
        setErrorMessage(
          extractedDoc.validationReason ||
            'Error has occurred: The uploaded document is incomplete or invalid. Please upload a complete court judgment or order PDF.'
        );
        return;
      }

      // Step 4: Divide document into manageable page-aware chunks
      setProcessingState({
        stepNumber: 2,
        label: 'Chunking & Indexing Pages',
        detail: `Dividing ${extractedDoc.totalPages} pages into page-aware segments for analysis...`,
        status: 'running',
      });

      const chunks = buildPageAwareChunks(extractedDoc.pages, 42000);

      // Step 5 & 6: Send to backend Gemini API route for extraction + dedicated operative order pass + verification
      setProcessingState({
        stepNumber: 3,
        label: 'Multilingual AI Legal Analysis & Operative Pass',
        detail: `Analyzing ${extractedDoc.totalPages} pages in ${
          extractedDoc.detectedLanguage || 'document language'
        } (${chunks.length} chunk${
          chunks.length > 1 ? 's' : ''
        }) and verifying operative order with Gemini...`,
        status: 'running',
      });

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: extractedDoc.filename,
          fileSizeBytes: extractedDoc.fileSizeBytes,
          pages: extractedDoc.pages,
          chunks,
          detectedLanguage: extractedDoc.detectedLanguage,
          languageCode: extractedDoc.languageCode,
          isSamplePdf: isSampleFile,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let serverError = `Server returned status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) serverError = errJson.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(serverError);
      }

      setProcessingState({
        stepNumber: 4,
        label: 'Verifying Quotations & Page References',
        detail: 'Cross-checking extracted quotations against source PDF pages...',
        status: 'running',
      });

      const data = await response.json();
      if (!data?.analysis) {
        throw new Error(
          'Received an invalid response structure from the legal analysis engine.'
        );
      }

      setAnalysisResult(data.analysis);
      setIsProcessing(false);
      setProcessingState(null);
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      setIsProcessing(false);
      setProcessingState(null);
      setErrorMessage(
        err?.message ||
          'An unexpected error occurred while processing the PDF document.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasActiveAnalysis={Boolean(analysisResult)}
        onStartNewAnalysis={() => {
          setActiveTab('analyze');
          if (analysisResult) {
            handleClearFile();
          } else {
            fileInputRef.current?.click();
          }
        }}
      />

      <main className="flex-1">
        {activeTab === 'analyze' && (
          <PdfUploadWorkspace
            selectedFile={selectedFile}
            isSampleFile={isSampleFile}
            isProcessing={isProcessing}
            processingState={processingState}
            errorMessage={errorMessage}
            isScannedPdfWarning={isScannedPdfWarning}
            onSelectFile={handleSelectFile}
            onClearFile={handleClearFile}
            onStartAnalysis={handleStartAnalysis}
            onCancelProcessing={handleCancelProcessing}
            fileInputRef={fileInputRef}
          />
        )}

        {activeTab === 'dashboard' && (
          <>
            {analysisResult ? (
              <ResultsDashboard
                analysis={analysisResult}
                onStartNewAnalysis={() => {
                  handleClearFile();
                  setActiveTab('analyze');
                }}
              />
            ) : (
              <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-950">
                  No Court Document Analyzed Yet
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload an Indian court judgment, bail order, or filing in the
                  Analyze Document workspace (or load one of the built-in multi-page
                  court PDFs) to generate a structured, evidence-backed case
                  dashboard.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('analyze')}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Go to PDF Uploader</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'about' && (
          <AboutView onNavigateToAnalyze={() => setActiveTab('analyze')} />
        )}
      </main>
    </div>
  );
}
