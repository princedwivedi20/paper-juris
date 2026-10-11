import { LegalDocumentAnalysis } from '../types/legal';

/**
 * Downloads the validated structured analysis as a formatted JSON file.
 */
export function downloadAnalysisAsJson(analysis: LegalDocumentAnalysis): void {
  const cleanFileName = analysis.documentFilename
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const payload = JSON.stringify(analysis, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanFileName}_Paper_Juris_Analysis.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a structured plain-text / Markdown Case Brief and downloads it as a printable .txt/.md brief,
 * or triggers the clean @media print stylesheet for printing / saving as PDF.
 */
export function downloadPrintableCaseBrief(analysis: LegalDocumentAnalysis): void {
  const cleanFileName = analysis.documentFilename
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const lines: string[] = [
    '================================================================================',
    'PAPER JURIS — STRUCTURED CASE BRIEF & EVIDENCE REPORT',
    '================================================================================',
    `Document Filename : ${analysis.documentFilename}`,
    `Document Language : ${analysis.detectedLanguage || 'English'} (${analysis.languageCode || 'en'})`,
    `Document Type     : ${analysis.documentType}`,
    `Court Name        : ${analysis.caseInformation.courtName || 'Not specified in document'}`,
    `Case Number       : ${analysis.caseInformation.caseNumber || 'Not specified in document'}`,
    `Judgment Date     : ${analysis.caseInformation.judgmentDate || 'Not specified in document'}`,
    `Case Categories   : ${analysis.caseInformation.caseCategories.join(', ')}`,
    `Jurisdiction      : ${analysis.caseInformation.jurisdiction || 'Not specified'}`,
    `Coram / Bench     : ${analysis.caseInformation.benchOrJudges || 'Not specified'}`,
    `Pages Processed   : ${analysis.pagesProcessed}`,
    `Evidence Quality  : ${analysis.qualityIndicators.evidenceQuality} (${analysis.qualityIndicators.totalVerifiedQuotations}/${analysis.qualityIndicators.totalCheckedQuotations} passages verified)`,
    '--------------------------------------------------------------------------------',
    '',
    '1. PLAIN-ENGLISH SUMMARY',
    '------------------------',
    analysis.caseAnalysis.plainEnglishSummary,
    '',
    '2. FINAL OPERATIVE ORDER / OUTCOME',
    '----------------------------------',
    analysis.caseAnalysis.outcomeVerified && analysis.caseAnalysis.finalOperativeOrder
      ? `${analysis.caseAnalysis.finalOperativeOrder}\n   [Source Page: ${analysis.caseAnalysis.outcomeSourcePage ?? 'N/A'} | Supporting Quotation: "${analysis.caseAnalysis.outcomeEvidenceQuotation || ''}"]`
      : 'OUTCOME NOT VERIFIED — Sufficient verbatim operative order evidence could not be confirmed automatically. Please inspect the concluding pages of the original PDF.',
    '',
    '3. KEY TAKEAWAYS',
    '----------------',
    ...analysis.caseAnalysis.keyTakeaways.map((t, i) => `   ${i + 1}. ${t}`),
    '',
    '4. PARTIES INVOLVED',
    '-------------------',
    ...(analysis.parties.length > 0
      ? analysis.parties.map(
          (p, i) =>
            `   ${i + 1}. ${p.name} — Role: ${p.role} (Page ${p.sourcePage ?? 'N/A'})\n      Evidence: "${p.supportingQuotation}"`
        )
      : ['   No specific party blocks verified.']),
    '',
    '5. LEGAL PROVISIONS CITED (ACTS & SECTIONS)',
    '-------------------------------------------',
    ...(analysis.legalProvisions.length > 0
      ? analysis.legalProvisions.map(
          (lp, i) =>
            `   ${i + 1}. ${lp.sectionOrArticle}, ${lp.actName} [Context: ${lp.context}] (Page ${lp.sourcePage ?? 'N/A'})\n      Evidence: "${lp.supportingQuotation}"`
        )
      : ['   No statutory provisions extracted.']),
    '',
    '6. MAIN FACTS & LEGAL ISSUES',
    '----------------------------',
    'Main Facts:',
    ...analysis.caseAnalysis.mainFacts.map((f) => `   - ${f}`),
    '',
    'Questions / Issues Before the Court:',
    ...analysis.caseAnalysis.questionsOrIssues.map((q) => `   - ${q}`),
    '',
    '7. ARGUMENTS OF THE PARTIES (SUBMISSIONS)',
    '-----------------------------------------',
    ...analysis.caseAnalysis.partyArguments.flatMap((pa) => [
      `   [${pa.partyOrSide}] (Pages: ${pa.sourcePages.join(', ') || 'N/A'}):`,
      ...pa.summaryOfArguments.map((arg) => `     • ${arg}`),
    ]),
    '',
    '8. COURT\'S REASONING & JUDICIAL OBSERVATIONS',
    '--------------------------------------------',
    ...analysis.caseAnalysis.courtReasoning.map((r, i) => `   ${i + 1}. ${r}`),
    '',
    '================================================================================',
    'DISCLAIMER: Generated by Paper Juris for document organization and research.',
    'This report is not legal advice and may contain automated extraction errors.',
    'Always verify findings against the original certified court order or judgment.',
    '================================================================================',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanFileName}_Case_Brief.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
