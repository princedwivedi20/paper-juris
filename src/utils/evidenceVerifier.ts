import { ExtractedPage, LegalDocumentAnalysis } from '../types/legal';

/**
 * Normalizes whitespace, punctuation, and case for resilient quotation matching
 * against PDF text extraction artifacts across English, Indian scripts (Devanagari,
 * Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Gurmukhi, Odia, Urdu), and international scripts.
 */
export function normalizeLegalText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D'"`।॥]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s()./]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a quotation can be verified in the extracted source pages.
 * First checks the claimed sourcePage, then checks adjacent/all pages if page numbering shifted.
 * Returns { verified: boolean, matchedPage: number | null }
 */
export function verifyQuotationAgainstPages(
  quotation: string | null | undefined,
  claimedPage: number | null | undefined,
  pages: ExtractedPage[]
): { verified: boolean; matchedPage: number | null } {
  if (!quotation || quotation.trim().length < 8) {
    return { verified: false, matchedPage: null };
  }

  const totalPages = pages.length;
  const validClaimedPage =
    typeof claimedPage === 'number' &&
    claimedPage >= 1 &&
    claimedPage <= totalPages
      ? claimedPage
      : null;

  const normQuote = normalizeLegalText(quotation);
  if (normQuote.length < 6) {
    return { verified: false, matchedPage: validClaimedPage };
  }

  // Extract a significant substring or token window to account for minor OCR/line-wrap variations
  const quoteWords = normQuote.split(' ').filter((w) => w.length > 0);
  const anchorPhrases: string[] = [normQuote];

  if (quoteWords.length >= 6) {
    anchorPhrases.push(quoteWords.slice(0, 6).join(' '));
    anchorPhrases.push(quoteWords.slice(-6).join(' '));
    const mid = Math.floor(quoteWords.length / 2);
    if (mid >= 3) {
      anchorPhrases.push(quoteWords.slice(mid - 2, mid + 4).join(' '));
    }
  } else if (quoteWords.length >= 4) {
    anchorPhrases.push(quoteWords.slice(0, 4).join(' '));
  }

  const pageMatchesQuote = (page: ExtractedPage): boolean => {
    const normPage = normalizeLegalText(page.text);
    if (!normPage) return false;
    for (const phrase of anchorPhrases) {
      if (phrase.length >= 12 && normPage.includes(phrase)) {
        return true;
      }
    }
    // Token overlap fallback: if >= 75% of significant words (>=4 chars) appear on that page
    const sigWords = quoteWords.filter((w) => w.length >= 4);
    if (sigWords.length >= 4) {
      const hits = sigWords.filter((w) => normPage.includes(w)).length;
      if (hits / sigWords.length >= 0.8) {
        return true;
      }
    }
    return false;
  };

  // 1. Check claimed page first
  if (validClaimedPage !== null) {
    const targetPage = pages.find((p) => p.pageNumber === validClaimedPage);
    if (targetPage && pageMatchesQuote(targetPage)) {
      return { verified: true, matchedPage: validClaimedPage };
    }
  }

  // 2. Check all pages in document
  for (const page of pages) {
    if (pageMatchesQuote(page)) {
      return { verified: true, matchedPage: page.pageNumber };
    }
  }

  return { verified: false, matchedPage: validClaimedPage };
}

/**
 * Post-processes and audits the entire AI analysis against the actual extracted PDF pages.
 * Ensures no out-of-range page numbers exist, verifies quotations, and updates quality indicators.
 */
export function auditAndVerifyAnalysis(
  analysis: LegalDocumentAnalysis,
  pages: ExtractedPage[]
): LegalDocumentAnalysis {
  const totalPages = pages.length;
  let totalCheckedQuotations = 0;
  let totalVerifiedQuotations = 0;
  const verificationNotes: string[] = [
    ...(analysis.qualityIndicators.verificationNotes || []),
  ];

  // Validate Parties
  const verifiedParties = (analysis.parties || []).map((party) => {
    const hasQuote = Boolean(party.supportingQuotation && party.supportingQuotation.trim());
    if (hasQuote) totalCheckedQuotations++;
    const { verified, matchedPage } = verifyQuotationAgainstPages(
      party.supportingQuotation,
      party.sourcePage,
      pages
    );
    if (verified) totalVerifiedQuotations++;
    return {
      ...party,
      sourcePage: matchedPage,
      verifiedInText: verified,
    };
  });

  // Validate Legal Provisions
  const verifiedProvisions = (analysis.legalProvisions || []).map((prov) => {
    const hasQuote = Boolean(prov.supportingQuotation && prov.supportingQuotation.trim());
    if (hasQuote) totalCheckedQuotations++;
    const { verified, matchedPage } = verifyQuotationAgainstPages(
      prov.supportingQuotation,
      prov.sourcePage,
      pages
    );
    if (verified) totalVerifiedQuotations++;
    return {
      ...prov,
      sourcePage: matchedPage,
      verifiedInText: verified,
    };
  });

  // Validate Important Findings
  const verifiedFindings = (
    analysis.caseAnalysis.importantFindingsWithEvidence || []
  ).map((finding) => {
    const hasQuote = Boolean(
      finding.supportingQuotation && finding.supportingQuotation.trim()
    );
    if (hasQuote) totalCheckedQuotations++;
    const { verified, matchedPage } = verifyQuotationAgainstPages(
      finding.supportingQuotation,
      finding.sourcePage,
      pages
    );
    if (verified) totalVerifiedQuotations++;
    return {
      ...finding,
      sourcePage: matchedPage,
      verifiedInText: verified,
    };
  });

  // Validate Party Arguments source pages
  const verifiedArguments = (analysis.caseAnalysis.partyArguments || []).map(
    (arg) => ({
      ...arg,
      sourcePages: (arg.sourcePages || []).filter(
        (p) => typeof p === 'number' && p >= 1 && p <= totalPages
      ),
    })
  );

  // Validate Operative Order / Outcome Evidence
  let outcomeVerified = Boolean(analysis.caseAnalysis.outcomeVerified);
  let outcomeSourcePage = analysis.caseAnalysis.outcomeSourcePage;
  if (
    analysis.caseAnalysis.finalOperativeOrder &&
    analysis.caseAnalysis.outcomeEvidenceQuotation
  ) {
    totalCheckedQuotations++;
    const { verified, matchedPage } = verifyQuotationAgainstPages(
      analysis.caseAnalysis.outcomeEvidenceQuotation,
      outcomeSourcePage,
      pages
    );
    outcomeSourcePage = matchedPage;
    if (verified) {
      totalVerifiedQuotations++;
      outcomeVerified = true;
    } else {
      outcomeVerified = false;
      verificationNotes.push(
        'Operative order quotation could not be strictly matched verbatim in the extracted text; marked for human review.'
      );
    }
  } else {
    outcomeVerified = false;
  }

  // Compute missing fields accurately
  const missingFields = new Set<string>(analysis.qualityIndicators.missingFields || []);
  if (!analysis.caseInformation.courtName) missingFields.add('Court Name');
  if (!analysis.caseInformation.caseNumber) missingFields.add('Case Number');
  if (!analysis.caseInformation.judgmentDate) missingFields.add('Judgment / Order Date');
  if (verifiedParties.length === 0) missingFields.add('Parties Involved');
  if (!outcomeVerified || !analysis.caseAnalysis.finalOperativeOrder) {
    missingFields.add('Verified Final Operative Order');
  }

  const verificationRatio =
    totalCheckedQuotations > 0
      ? totalVerifiedQuotations / totalCheckedQuotations
      : 0;

  let evidenceQuality: 'High' | 'Moderate' | 'Low' | 'Unverified' = 'Unverified';
  if (totalCheckedQuotations === 0) {
    evidenceQuality = 'Unverified';
  } else if (verificationRatio >= 0.8 && outcomeVerified) {
    evidenceQuality = 'High';
  } else if (verificationRatio >= 0.5) {
    evidenceQuality = 'Moderate';
  } else {
    evidenceQuality = 'Low';
  }

  const humanVerificationRecommended =
    evidenceQuality !== 'High' ||
    !outcomeVerified ||
    missingFields.size > 0 ||
    (analysis.qualityIndicators.conflictingFindings || []).length > 0;

  return {
    ...analysis,
    parties: verifiedParties,
    legalProvisions: verifiedProvisions,
    caseAnalysis: {
      ...analysis.caseAnalysis,
      partyArguments: verifiedArguments,
      importantFindingsWithEvidence: verifiedFindings,
      outcomeVerified,
      outcomeSourcePage,
    },
    qualityIndicators: {
      ...analysis.qualityIndicators,
      missingFields: Array.from(missingFields),
      evidenceQuality,
      humanVerificationRecommended,
      verificationNotes,
      totalVerifiedQuotations,
      totalCheckedQuotations,
    },
  };
}
