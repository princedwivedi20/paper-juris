import React from 'react';
import { Scale, ShieldAlert, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

interface AboutViewProps {
  onNavigateToAnalyze: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigateToAnalyze }) => {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
      <section className="rounded-xl border border-slate-200 bg-white p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900">
          <Scale className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-wide text-slate-600">
            Architecture & Verification Methodology
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          About Paper Juris — Indian Court Document Intelligence
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Indian court judgments, interim orders, bail orders, and pleadings are
          frequently lengthy and written in dense legal prose. Paper Juris
          streamlines first-pass review for legal practitioners, judicial clerks,
          researchers, and litigants by extracting structured, page-grounded
          insights without sacrificing evidentiary rigor.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToAnalyze}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Analyze a Court Document</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-950">
            Strict Evidentiary Safeguards
          </h2>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            <li>
              <strong>Original Statutory Fidelity:</strong> Preserves exact cited
              Acts and sections (e.g., IPC, CrPC, CPC, Arbitration and
              Conciliation Act, 1996, Indian Contract Act, 1872) without silently
              substituting newer codes unless cited in the source text.
            </li>
            <li>
              <strong>Submissions vs. Judicial Findings:</strong> Explicitly
              separates arguments advanced by counsel from the court's own
              observations and ratio decidendi.
            </li>
            <li>
              <strong>Dedicated Operative Order Pass:</strong> Analyzes concluding
              pages in a dedicated pass so opening recitals or procedural
              dispositions ("disposed of") are not confused with a party winning.
            </li>
            <li>
              <strong>Programmatic Quotation Audit:</strong> Cross-checks AI
              quotations and page numbers against the actual PDF text layer and
              marks any unverified outcome as "Outcome not verified".
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-950">
            Supported Documents & Known Limitations
          </h2>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            <li>
              <strong>Supported PDFs:</strong> Text-searchable PDFs downloaded
              from the Supreme Court of India, High Courts, District e-Courts,
              NCLT/NCLAT, and Consumer Commissions (up to 25 MB / 120 pages).
            </li>
            <li>
              <strong>Scanned Image PDFs (OCR Limitation):</strong> Documents
              consisting solely of rasterized page scans without an embedded text
              layer are automatically detected and flagged. Scanned PDFs require
              prior OCR conversion before upload.
            </li>
            <li>
              <strong>Privacy & Session Architecture:</strong> Documents are
              extracted in memory and analyzed via a secure server-side Gemini
              API route. No private API keys are exposed in browser code, and
              uploaded files are not permanently stored.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-100 p-6 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <h3 className="font-bold text-slate-900">
            Important Legal Disclaimer
          </h3>
          <p>
            Paper Juris is an information organization and legal research tool,
            not a substitute for a qualified lawyer or formal legal advice.
            Automated extraction and AI summarization can introduce omissions or
            inaccuracies. Users must verify every extracted provision, party
            role, and operative order against the original certified court
            document.
          </p>
        </div>
      </section>
    </div>
  );
};
