export type DocumentType =
  | 'Judgment'
  | 'Interim order'
  | 'Final order'
  | 'Bail order'
  | 'Filing or petition'
  | 'Other or unknown';

export type CaseCategory =
  | 'Civil'
  | 'Criminal'
  | 'Constitutional'
  | 'Family'
  | 'Commercial'
  | 'Service-related'
  | 'Taxation'
  | 'Arbitration'
  | 'Intellectual Property'
  | 'Consumer'
  | 'Other';

export type ProvisionContext =
  | 'party argument'
  | 'court discussion'
  | 'court applied'
  | 'court distinguished'
  | 'unclear';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  charCount: number;
  wordCount: number;
  isLowQualityOrScanned: boolean;
}

export interface ExtractedDocument {
  filename: string;
  fileSizeBytes: number;
  totalPages: number;
  pages: ExtractedPage[];
  lowQualityPageNumbers: number[];
  totalCharacterCount: number;
  isMostlyScanned: boolean;
  detectedLanguage?: string;
  languageCode?: string;
  isIncompleteOrInvalidDocument?: boolean;
  validationReason?: string | null;
  isSamplePdf?: boolean;
}

export interface PartyItem {
  name: string;
  role: string;
  supportingQuotation: string;
  sourcePage: number | null;
  verifiedInText?: boolean;
}

export interface LegalProvisionItem {
  actName: string;
  sectionOrArticle: string;
  context: ProvisionContext;
  supportingQuotation: string;
  sourcePage: number | null;
  verifiedInText?: boolean;
}

export interface EvidenceFinding {
  claimOrFact: string;
  category: 'Fact' | 'Issue' | 'Party Argument' | 'Court Reasoning' | 'Operative Order';
  supportingQuotation: string;
  sourcePage: number | null;
  verifiedInText?: boolean;
}

export interface CaseInformation {
  courtName: string | null;
  caseNumber: string | null;
  judgmentDate: string | null;
  caseCategories: string[];
  jurisdiction: string | null;
  benchOrJudges: string | null;
}

export interface CaseAnalysis {
  mainFacts: string[];
  questionsOrIssues: string[];
  partyArguments: {
    partyOrSide: string;
    summaryOfArguments: string[];
    sourcePages: number[];
  }[];
  courtReasoning: string[];
  finalOperativeOrder: string | null;
  outcomeVerified: boolean;
  outcomeEvidenceQuotation: string | null;
  outcomeSourcePage: number | null;
  plainEnglishSummary: string;
  keyTakeaways: string[];
  importantFindingsWithEvidence: EvidenceFinding[];
}

export interface QualityIndicators {
  missingFields: string[];
  conflictingFindings: string[];
  evidenceQuality: 'High' | 'Moderate' | 'Low' | 'Unverified';
  humanVerificationRecommended: boolean;
  verificationNotes: string[];
  totalVerifiedQuotations: number;
  totalCheckedQuotations: number;
}

export interface LegalDocumentAnalysis {
  documentFilename: string;
  fileSizeBytes: number;
  pagesProcessed: number;
  analyzedAtIso: string;
  isDemonstrationSample: boolean;
  detectedLanguage: string;
  languageCode: string;
  documentType: DocumentType;
  caseInformation: CaseInformation;
  parties: PartyItem[];
  legalProvisions: LegalProvisionItem[];
  caseAnalysis: CaseAnalysis;
  qualityIndicators: QualityIndicators;
  pages: ExtractedPage[];
}

export interface ChunkInput {
  chunkIndex: number;
  startPage: number;
  endPage: number;
  textWithPageMarkers: string;
}
