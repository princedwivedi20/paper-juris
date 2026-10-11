import React from 'react';
import { X, FileText, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExtractedPage } from '../types/legal';

interface SourceEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  highlightQuotation?: string | null;
  contextTitle?: string;
  pages: ExtractedPage[];
  onChangePage: (newPage: number) => void;
}

/**
 * Highlights a target quotation inside the page text, using resilient substring matching
 * if line breaks or whitespace differ slightly.
 */
function renderHighlightedPageText(pageText: string, quotation?: string | null) {
  if (!quotation || quotation.trim().length < 8) {
    return <span>{pageText}</span>;
  }

  const cleanQuote = quotation.trim();
  const directIdx = pageText.toLowerCase().indexOf(cleanQuote.toLowerCase());
  if (directIdx !== -1) {
    const before = pageText.slice(0, directIdx);
    const match = pageText.slice(directIdx, directIdx + cleanQuote.length);
    const after = pageText.slice(directIdx + cleanQuote.length);
    return (
      <>
        <span>{before}</span>
        <mark className="bg-amber-200/90 text-slate-950 px-1 py-0.5 rounded font-medium">
          {match}
        </mark>
        <span>{after}</span>
      </>
    );
  }

  // Fallback: match first 5 words of quotation if line wraps split the sentence
  const words = cleanQuote.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const escapedAnchor = words
      .slice(0, Math.min(7, words.length))
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s\\n]+');
    try {
      const regex = new RegExp(`(${escapedAnchor})`, 'i');
      const parts = pageText.split(regex);
      if (parts.length > 1) {
        return (
          <>
            {parts.map((part, i) =>
              regex.test(part) ? (
                <mark
                  key={i}
                  className="bg-amber-200/90 text-slate-950 px-1 py-0.5 rounded font-medium"
                >
                  {part}
                </mark>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </>
        );
      }
    } catch {
      // ignore regex fallback errors
    }
  }

  return <span>{pageText}</span>;
}

export const SourceEvidenceModal: React.FC<SourceEvidenceModalProps> = ({
  isOpen,
  onClose,
  pageNumber,
  highlightQuotation,
  contextTitle,
  pages,
  onChangePage,
}) => {
  const totalPages = pages.length;
  const activePage =
    pages.find((p) => p.pageNumber === pageNumber) || pages[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-slate-800 shrink-0" />
                <div className="min-w-0">
                  <h3
                    id="evidence-modal-title"
                    className="text-sm font-bold text-slate-950 truncate"
                  >
                    {contextTitle || 'Source Page Evidence Inspector'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono-tabular">
                    Viewing Page {activePage?.pageNumber} of {totalPages} ·{' '}
                    {activePage?.wordCount || 0} words extracted
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!activePage || activePage.pageNumber <= 1}
                  onClick={() => onChangePage((activePage?.pageNumber || 2) - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono-tabular font-semibold text-slate-800 px-2">
                  Page {activePage?.pageNumber} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={!activePage || activePage.pageNumber >= totalPages}
                  onClick={() => onChangePage((activePage?.pageNumber || 0) + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close source passage viewer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Highlighted Quotation Callout */}
            {highlightQuotation && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-3 bg-amber-50/90 border-b border-amber-200/80 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  <span>Supporting Passage Cited for This Finding:</span>
                </div>
                <p className="text-xs font-serif-legal italic text-slate-900 leading-relaxed">
                  "{highlightQuotation}"
                </p>
              </motion.div>
            )}

            {/* Full Extracted Page Text */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {activePage && activePage.text ? (
                <motion.div
                  key={activePage.pageNumber}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="font-serif-legal text-sm text-slate-900 whitespace-pre-wrap leading-relaxed"
                >
                  {renderHighlightedPageText(
                    activePage.text,
                    highlightQuotation
                  )}
                </motion.div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No extractable digital text was found on Page{' '}
                  {activePage?.pageNumber}.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Extracted directly from uploaded PDF · Page{' '}
                {activePage?.pageNumber}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
