import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ExtractedPage,
  ChunkInput,
  LegalDocumentAnalysis,
  DocumentType,
  ProvisionContext,
} from './src/types/legal.ts';
import { auditAndVerifyAnalysis } from './src/utils/evidenceVerifier.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_INSTRUCTION = `You are a multilingual Indian court-document information extraction assistant. Analyze only the supplied court-document text. Extract information accurately, preserve the document's original terminology, distinguish claims made by parties from findings made by the court, and never invent missing facts. Every important finding should include supporting evidence and a page number. Return null or an appropriate unknown value when information cannot be verified.

CRITICAL MULTILINGUAL & LEGAL EXTRACTION RULES:
1. NATIVE LANGUAGE OUTPUT RULE (MANDATORY): Detect the primary language in which the uploaded court PDF is written (e.g., English, Hindi / हिन्दी, Marathi / मराठी, Tamil / தமிழ், Telugu / తెలుగు, Kannada / ಕನ್ನಡ, Malayalam / മലയാളം, Bengali / বাংলা, Gujarati / ગુજરાતી, Punjabi / ਪੰਜਾਬੀ, Odia / ଓଡ଼ିଆ, Urdu / اردو, or any other language). You MUST generate the ENTIRE analysis — including courtName, caseCategories, party roles, actName, sectionOrArticle, mainFacts, questionsOrIssues, partyArguments, courtReasoning, finalOperativeOrder, plainEnglishSummary (in the document's native language), keyTakeaways, claimOrFact, missingFields, and verificationNotes — in the EXACT SAME LANGUAGE AND SCRIPT in which the PDF is uploaded. Only the enum identifiers ("documentType", "context", "category") must remain in their canonical schema strings for UI filtering.
2. Preserve the exact Acts, section numbers, and terminology found in the source in the document's language (e.g., "Section 34 of the Arbitration and Conciliation Act, 1996" or "भारतीय दंड संहिता, 1860 की धारा 420" or "दंड प्रक्रिया संहिता, 1973 की धारा 439"). Never silently substitute updated legislation unless explicitly written in the document text.
3. Do not force every document into a Civil or Criminal category. Support configurable and multiple categories in the document's language when appropriate.
4. Never confuse a case being "disposed of" / "निस्तारित" with a particular party winning. Explain the exact operative relief in the document's language.
5. Never interpret an interim order or bail order as a final judgment on the merits of the trial.
6. Every supportingQuotation MUST be copied verbatim in the original script/language from the provided [PAGE X] text so it can be verified programmatically against the source page.
7. Only assign a page number (sourcePage) that corresponds to the [PAGE N] marker where that exact quotation appears.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Schema for unified document or chunk synthesis
const LEGAL_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      description:
        'The primary language of the uploaded document (e.g., "English", "Hindi (हिन्दी)", "Marathi (मराठी)", "Tamil (தமிழ்)", "Telugu (తెలుగు)", "Kannada (ಕನ್ನಡ)", "Bengali (বাংলা)", "Gujarati (ગુજરાતી)", "Malayalam (മലയാളം)", etc.).',
    },
    languageCode: {
      type: Type.STRING,
      description:
        'ISO 639-1 language code of the document (e.g., "en", "hi", "mr", "ta", "te", "kn", "bn", "gu", "ml", "pa", "or", "ur").',
    },
    documentType: {
      type: Type.STRING,
      description:
        'Must be one of: "Judgment", "Interim order", "Final order", "Bail order", "Filing or petition", "Other or unknown".',
    },
    caseInformation: {
      type: Type.OBJECT,
      properties: {
        courtName: {
          type: Type.STRING,
          nullable: true,
          description: 'Full name of the Court exactly as stated in the heading, or null if not found.',
        },
        caseNumber: {
          type: Type.STRING,
          nullable: true,
          description: 'Primary case number / petition number as written, or null if not found.',
        },
        judgmentDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Date of judgment or order pronunciation as stated, or null if not found.',
        },
        caseCategories: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'One or more applicable categories such as Civil, Criminal, Constitutional, Family, Commercial, Arbitration, Service-related, Taxation, Consumer, Other.',
        },
        jurisdiction: {
          type: Type.STRING,
          nullable: true,
          description: 'Relevant jurisdiction if stated (e.g., Ordinary Original Civil Jurisdiction, Criminal Appellate Jurisdiction), or null.',
        },
        benchOrJudges: {
          type: Type.STRING,
          nullable: true,
          description: 'Names of the Judge(s) / Coram if stated, or null.',
        },
      },
      required: [
        'courtName',
        'caseNumber',
        'judgmentDate',
        'caseCategories',
        'jurisdiction',
        'benchOrJudges',
      ],
    },
    parties: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Name of the party exactly as written in the document.',
          },
          role: {
            type: Type.STRING,
            description: 'Role such as Petitioner, Respondent, Appellant, Accused, Complainant, Intervenor, etc.',
          },
          supportingQuotation: {
            type: Type.STRING,
            description: 'Exact verbatim snippet from the document identifying this party and role.',
          },
          sourcePage: {
            type: Type.INTEGER,
            nullable: true,
            description: '1-indexed page number where the supportingQuotation appears.',
          },
        },
        required: ['name', 'role', 'supportingQuotation', 'sourcePage'],
      },
    },
    legalProvisions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          actName: {
            type: Type.STRING,
            description: 'Exact name of the Act, Statute, Code, or Constitution as cited in the text.',
          },
          sectionOrArticle: {
            type: Type.STRING,
            description: 'Exact Section, Article, Order, or Rule number as cited in the text.',
          },
          context: {
            type: Type.STRING,
            description:
              'Must be one of: "party argument", "court discussion", "court applied", "court distinguished", "unclear".',
          },
          supportingQuotation: {
            type: Type.STRING,
            description: 'Exact verbatim sentence or clause from the document citing this provision.',
          },
          sourcePage: {
            type: Type.INTEGER,
            nullable: true,
            description: '1-indexed page number where the supportingQuotation appears.',
          },
        },
        required: [
          'actName',
          'sectionOrArticle',
          'context',
          'supportingQuotation',
          'sourcePage',
        ],
      },
    },
    caseAnalysis: {
      type: Type.OBJECT,
      properties: {
        mainFacts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key factual background points stated in the document.',
        },
        questionsOrIssues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Main legal questions or issues framed for determination before the court.',
        },
        partyArguments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              partyOrSide: {
                type: Type.STRING,
                description: 'Which party or counsel made these submissions (e.g., Petitioner / Applicant, Respondent / State).',
              },
              summaryOfArguments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Clear points summarizing the party submissions, kept strictly separate from judicial findings.',
              },
              sourcePages: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'Page numbers where these arguments appear.',
              },
            },
            required: ['partyOrSide', 'summaryOfArguments', 'sourcePages'],
          },
        },
        courtReasoning: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'The court\'s own analysis, observations, and legal reasoning (distinct from party submissions).',
        },
        finalOperativeOrder: {
          type: Type.STRING,
          nullable: true,
          description: 'Clear summary of the final operative order or decision if reliably identified, or null if not verifiable.',
        },
        outcomeVerified: {
          type: Type.BOOLEAN,
          description: 'True only if a clear operative order is explicitly found in the text with supporting quotation.',
        },
        outcomeEvidenceQuotation: {
          type: Type.STRING,
          nullable: true,
          description: 'Verbatim quotation of the operative order from the concluding paragraphs, or null.',
        },
        outcomeSourcePage: {
          type: Type.INTEGER,
          nullable: true,
          description: '1-indexed page number of the operative order quotation, or null.',
        },
        plainEnglishSummary: {
          type: Type.STRING,
          description: 'A concise, accessible plain-English summary (3-5 sentences) explaining what the dispute is about, what the court reasoned, and what the final order states.',
        },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 to 5 concise, factual key takeaways about the document without introducing unsupported legal advice.',
        },
        importantFindingsWithEvidence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claimOrFact: {
                type: Type.STRING,
                description: 'Summary of the specific finding, fact, argument, or order.',
              },
              category: {
                type: Type.STRING,
                description: 'One of: "Fact", "Issue", "Party Argument", "Court Reasoning", "Operative Order".',
              },
              supportingQuotation: {
                type: Type.STRING,
                description: 'Exact verbatim passage from the text supporting this finding.',
              },
              sourcePage: {
                type: Type.INTEGER,
                nullable: true,
                description: '1-indexed page number where the passage appears.',
              },
            },
            required: ['claimOrFact', 'category', 'supportingQuotation', 'sourcePage'],
          },
        },
      },
      required: [
        'mainFacts',
        'questionsOrIssues',
        'partyArguments',
        'courtReasoning',
        'finalOperativeOrder',
        'outcomeVerified',
        'outcomeEvidenceQuotation',
        'outcomeSourcePage',
        'plainEnglishSummary',
        'keyTakeaways',
        'importantFindingsWithEvidence',
      ],
    },
    qualityIndicators: {
      type: Type.OBJECT,
      properties: {
        missingFields: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of standard legal fields that could not be located in the document.',
        },
        conflictingFindings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Any ambiguities or conflicting statements noted in the text (empty array if none).',
        },
        verificationNotes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Notes regarding text quality, partial extracts, or caveats for human review.',
        },
      },
      required: ['missingFields', 'conflictingFindings', 'verificationNotes'],
    },
  },
  required: [
    'detectedLanguage',
    'languageCode',
    'documentType',
    'caseInformation',
    'parties',
    'legalProvisions',
    'caseAnalysis',
    'qualityIndicators',
  ],
};

// Dedicated Operative Order Verification Pass Schema
const OPERATIVE_ORDER_PASS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasOperativeOrder: {
      type: Type.BOOLEAN,
      description: 'True only if the concluding pages contain an explicit operative order, direction, or disposition.',
    },
    operativeOrderSummary: {
      type: Type.STRING,
      nullable: true,
      description: 'Precise summary of the operative order (distinguishing allowed, partly allowed, dismissed, bail granted with conditions, or disposed of).',
    },
    verbatimOperativeQuotation: {
      type: Type.STRING,
      nullable: true,
      description: 'Exact verbatim quotation from the concluding operative paragraph(s).',
    },
    operativeSourcePage: {
      type: Type.INTEGER,
      nullable: true,
      description: '1-indexed page number where the verbatimOperativeQuotation appears.',
    },
    documentTypeConfirmation: {
      type: Type.STRING,
      description: 'Confirmed document type based on the operative order ("Judgment", "Interim order", "Final order", "Bail order", "Filing or petition", "Other or unknown").',
    },
  },
  required: [
    'hasOperativeOrder',
    'operativeOrderSummary',
    'verbatimOperativeQuotation',
    'operativeSourcePage',
    'documentTypeConfirmation',
  ],
};

function sanitizeDocumentType(raw: string | undefined): DocumentType {
  const valid: DocumentType[] = [
    'Judgment',
    'Interim order',
    'Final order',
    'Bail order',
    'Filing or petition',
    'Other or unknown',
  ];
  if (raw && valid.includes(raw as DocumentType)) {
    return raw as DocumentType;
  }
  return 'Other or unknown';
}

function sanitizeProvisionContext(raw: string | undefined): ProvisionContext {
  const valid: ProvisionContext[] = [
    'party argument',
    'court discussion',
    'court applied',
    'court distinguished',
    'unclear',
  ];
  const lower = (raw || '').toLowerCase().trim() as ProvisionContext;
  if (valid.includes(lower)) {
    return lower;
  }
  return 'unclear';
}

const MODEL_FALLBACK_CHAIN = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

// In-memory LRU cache to prevent redundant API calls on duplicate or repeated uploads
const analysisMemoryCache = new Map<string, LegalDocumentAnalysis>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded')
  );
}

/**
 * Calls Gemini with automatic model fallback and retry backoff on 429 / RESOURCE_EXHAUSTED errors.
 */
async function generateStructuredWithResilience(
  ai: GoogleGenAI,
  contents: string,
  responseSchema: any
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const modelName of MODEL_FALLBACK_CHAIN) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error(`Empty response from model ${modelName}`);
        }
        return JSON.parse(text);
      } catch (err: any) {
        lastError = err;
        if (isRateLimitError(err)) {
          // Immediately try next model in fallback chain
          continue;
        }
        // For non-429 transient errors, also try next model
        continue;
      }
    }

    // If all models in chain hit rate limits on first pass, wait briefly before second pass
    if (attempt === 0 && isRateLimitError(lastError)) {
      await sleep(3500);
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow up to 15MB JSON payload for extracted page arrays
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Paper Juris Court Intelligence Engine' });
  });

  /**
   * POST /api/analyze-document
   * Performs page-aware analysis + dedicated operative order focus
   * + programmatic source-page quotation verification with rate-limit resilience.
   */
  app.post('/api/analyze-document', async (req, res) => {
    try {
      const {
        filename,
        fileSizeBytes,
        pages,
        chunks,
        detectedLanguage: clientDetectedLanguage,
        languageCode: clientLanguageCode,
        isSamplePdf,
      }: {
        filename: string;
        fileSizeBytes: number;
        pages: ExtractedPage[];
        chunks: ChunkInput[];
        detectedLanguage?: string;
        languageCode?: string;
        isSamplePdf?: boolean;
      } = req.body;

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({
          error: 'No extracted pages were provided for analysis.',
        });
      }

      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return res.status(400).json({
          error: 'Document chunks are missing or empty.',
        });
      }

      const totalPages = pages.length;
      const languageHint = clientDetectedLanguage || 'Auto-detect from document text';
      const cacheKey = `${filename}:${fileSizeBytes}:${totalPages}:${
        pages[0]?.charCount || 0
      }:${pages[totalPages - 1]?.charCount || 0}:${clientLanguageCode || 'auto'}`;

      if (analysisMemoryCache.has(cacheKey)) {
        return res.json({
          analysis: analysisMemoryCache.get(cacheKey),
        });
      }

      const ai = getGeminiClient();

      // Extract concluding pages explicitly so the operative order is always isolated & verified
      const tailPages = pages.slice(Math.max(0, totalPages - 3));
      const tailTextWithMarkers = tailPages
        .map(
          (p) =>
            `=== [PAGE ${p.pageNumber} START] ===\n${p.text}\n=== [PAGE ${p.pageNumber} END] ===`
        )
        .join('\n\n');

      let rawPrimaryAnalysis: any;

      if (chunks.length === 1) {
        // Single-chunk document: include explicit concluding-pages operative order audit block
        // in one cohesive request to conserve RPM quota, and run a secondary operative pass only if outcome is missing.
        rawPrimaryAnalysis = await generateStructuredWithResilience(
          ai,
          `Analyze the following court document (${filename}, Total Pages: ${totalPages}, Detected Script/Language Hint: ${languageHint}).
IMPORTANT LANGUAGE REQUIREMENT: Provide the ENTIRE analysis (all summaries, facts, issues, party arguments, court reasoning, finalOperativeOrder, keyTakeaways, party roles, and statutory descriptions) in the EXACT SAME LANGUAGE AND SCRIPT in which the document is written. Ensure every supportingQuotation is copied verbatim from the text in its original script and assigned its exact [PAGE N] number.

CRITICAL OPERATIVE ORDER AUDIT (CONCLUDING PAGES ${tailPages[0].pageNumber} TO ${
            tailPages[tailPages.length - 1].pageNumber
          }):
Do NOT assume opening paragraphs contain the final outcome. Carefully inspect the concluding paragraphs on Page ${
            tailPages[tailPages.length - 1].pageNumber
          } to extract the exact finalOperativeOrder (written in the document's language) and its verbatim outcomeEvidenceQuotation.

DOCUMENT TEXT BY PAGE:
${chunks[0].textWithPageMarkers}`,
          LEGAL_ANALYSIS_SCHEMA
        );

        // If the primary pass did not verify the operative order on a multi-page doc, run the dedicated operative order pass
        if (
          !rawPrimaryAnalysis?.caseAnalysis?.outcomeVerified ||
          !rawPrimaryAnalysis?.caseAnalysis?.outcomeEvidenceQuotation
        ) {
          try {
            const operativeData = await generateStructuredWithResilience(
              ai,
              `Analyze the concluding pages (Pages ${tailPages[0].pageNumber} to ${
                tailPages[tailPages.length - 1].pageNumber
              } of ${totalPages}) of this court document to locate the final operative order or decision.
Write the operativeOrderSummary in the EXACT SAME LANGUAGE as the document (${languageHint}), and copy the verbatimOperativeQuotation exactly as written in the text.\n\n${tailTextWithMarkers}`,
              OPERATIVE_ORDER_PASS_SCHEMA
            );

            if (
              operativeData.hasOperativeOrder &&
              operativeData.operativeOrderSummary &&
              operativeData.verbatimOperativeQuotation
            ) {
              rawPrimaryAnalysis.caseAnalysis =
                rawPrimaryAnalysis.caseAnalysis || {};
              rawPrimaryAnalysis.caseAnalysis.finalOperativeOrder =
                operativeData.operativeOrderSummary;
              rawPrimaryAnalysis.caseAnalysis.outcomeEvidenceQuotation =
                operativeData.verbatimOperativeQuotation;
              rawPrimaryAnalysis.caseAnalysis.outcomeSourcePage =
                operativeData.operativeSourcePage;
              rawPrimaryAnalysis.caseAnalysis.outcomeVerified = true;
            }
          } catch {
            // Keep primary analysis if secondary operative pass hits quota limit
          }
        }
      } else {
        // Multi-chunk pipeline for very long documents: process sequentially to avoid bursting per-minute rate limits
        const selectedChunks =
          chunks.length <= 3
            ? chunks
            : [
                chunks[0],
                chunks[Math.floor(chunks.length / 2)],
                chunks[chunks.length - 1],
              ];

        const chunkFindings: { chunkPages: string; extracted: any }[] = [];
        for (const chunk of selectedChunks) {
          const extracted = await generateStructuredWithResilience(
            ai,
            `Analyze Chunk #${chunk.chunkIndex + 1} (Pages ${chunk.startPage} to ${chunk.endPage} of ${totalPages}) of the court document "${filename}" (Language: ${languageHint}).
Extract all case metadata, parties, legal provisions, arguments, reasoning, and findings in the EXACT SAME LANGUAGE as the document with verbatim quotations and exact [PAGE N] numbers.\n\n${chunk.textWithPageMarkers}`,
            LEGAL_ANALYSIS_SCHEMA
          );
          chunkFindings.push({
            chunkPages: `${chunk.startPage}-${chunk.endPage}`,
            extracted,
          });
        }

        const operativeData = await generateStructuredWithResilience(
          ai,
          `Analyze the concluding pages (Pages ${tailPages[0].pageNumber} to ${
            tailPages[tailPages.length - 1].pageNumber
          } of ${totalPages}) of this court document to locate the final operative order or decision in the document's native language (${languageHint}).
Do NOT assume opening paragraphs contain the final outcome. Copy the verbatim operative quotation exactly as written in the text.\n\n${tailTextWithMarkers}`,
          OPERATIVE_ORDER_PASS_SCHEMA
        );

        // Combine chunk-level findings into a unified document-level analysis
        rawPrimaryAnalysis = await generateStructuredWithResilience(
          ai,
          `Synthesize the following chunk-level extractions and the dedicated operative-order pass for "${filename}" (${totalPages} pages) into a single, deduplicated, verified document-level JSON response written entirely in the document's language (${languageHint}).
CRITICAL: Preserve exact verbatim quotations and their original sourcePage numbers without altering a single word of any supportingQuotation.

DEDICATED OPERATIVE ORDER PASS (FROM CONCLUDING PAGES):
${JSON.stringify(operativeData, null, 2)}

CHUNK-LEVEL FINDINGS:
${JSON.stringify(chunkFindings, null, 2)}`,
          LEGAL_ANALYSIS_SCHEMA
        );
      }

      // Normalize and construct structured analysis object
      const structuredAnalysis: LegalDocumentAnalysis = {
        documentFilename: filename || 'Court_Document.pdf',
        fileSizeBytes: fileSizeBytes || 0,
        pagesProcessed: totalPages,
        analyzedAtIso: new Date().toISOString(),
        isDemonstrationSample: Boolean(isSamplePdf),
        detectedLanguage:
          rawPrimaryAnalysis.detectedLanguage ||
          clientDetectedLanguage ||
          'English',
        languageCode:
          rawPrimaryAnalysis.languageCode || clientLanguageCode || 'en',
        documentType: sanitizeDocumentType(rawPrimaryAnalysis.documentType),
        caseInformation: {
          courtName: rawPrimaryAnalysis.caseInformation?.courtName || null,
          caseNumber: rawPrimaryAnalysis.caseInformation?.caseNumber || null,
          judgmentDate: rawPrimaryAnalysis.caseInformation?.judgmentDate || null,
          caseCategories:
            Array.isArray(rawPrimaryAnalysis.caseInformation?.caseCategories) &&
            rawPrimaryAnalysis.caseInformation.caseCategories.length > 0
              ? rawPrimaryAnalysis.caseInformation.caseCategories
              : ['Other'],
          jurisdiction: rawPrimaryAnalysis.caseInformation?.jurisdiction || null,
          benchOrJudges: rawPrimaryAnalysis.caseInformation?.benchOrJudges || null,
        },
        parties: (rawPrimaryAnalysis.parties || []).map((p: any) => ({
          name: p.name || 'Unnamed Party',
          role: p.role || 'Party',
          supportingQuotation: p.supportingQuotation || '',
          sourcePage: typeof p.sourcePage === 'number' ? p.sourcePage : null,
        })),
        legalProvisions: (rawPrimaryAnalysis.legalProvisions || []).map(
          (lp: any) => ({
            actName: lp.actName || 'Statute',
            sectionOrArticle: lp.sectionOrArticle || 'Provision',
            context: sanitizeProvisionContext(lp.context),
            supportingQuotation: lp.supportingQuotation || '',
            sourcePage: typeof lp.sourcePage === 'number' ? lp.sourcePage : null,
          })
        ),
        caseAnalysis: {
          mainFacts: rawPrimaryAnalysis.caseAnalysis?.mainFacts || [],
          questionsOrIssues:
            rawPrimaryAnalysis.caseAnalysis?.questionsOrIssues || [],
          partyArguments:
            rawPrimaryAnalysis.caseAnalysis?.partyArguments || [],
          courtReasoning: rawPrimaryAnalysis.caseAnalysis?.courtReasoning || [],
          finalOperativeOrder:
            rawPrimaryAnalysis.caseAnalysis?.finalOperativeOrder || null,
          outcomeVerified: Boolean(
            rawPrimaryAnalysis.caseAnalysis?.outcomeVerified
          ),
          outcomeEvidenceQuotation:
            rawPrimaryAnalysis.caseAnalysis?.outcomeEvidenceQuotation || null,
          outcomeSourcePage:
            typeof rawPrimaryAnalysis.caseAnalysis?.outcomeSourcePage === 'number'
              ? rawPrimaryAnalysis.caseAnalysis.outcomeSourcePage
              : null,
          plainEnglishSummary:
            rawPrimaryAnalysis.caseAnalysis?.plainEnglishSummary ||
            'Summary could not be generated from the supplied text.',
          keyTakeaways: rawPrimaryAnalysis.caseAnalysis?.keyTakeaways || [],
          importantFindingsWithEvidence:
            rawPrimaryAnalysis.caseAnalysis?.importantFindingsWithEvidence || [],
        },
        qualityIndicators: {
          missingFields:
            rawPrimaryAnalysis.qualityIndicators?.missingFields || [],
          conflictingFindings:
            rawPrimaryAnalysis.qualityIndicators?.conflictingFindings || [],
          evidenceQuality: 'Moderate',
          humanVerificationRecommended: true,
          verificationNotes:
            rawPrimaryAnalysis.qualityIndicators?.verificationNotes || [],
          totalVerifiedQuotations: 0,
          totalCheckedQuotations: 0,
        },
        pages,
      };

      // Step 7: Programmatically verify important fields & quotations against extracted page text
      const verifiedAnalysis = auditAndVerifyAnalysis(structuredAnalysis, pages);

      // Step 8: Reject incomplete or invalid documents that lack core court elements
      const hasNoCourtOrCaseInfo =
        !verifiedAnalysis.caseInformation.courtName &&
        !verifiedAnalysis.caseInformation.caseNumber;
      const hasNoPartiesAndProvisions =
        verifiedAnalysis.parties.length === 0 &&
        verifiedAnalysis.legalProvisions.length === 0;
      const hasNoReasoningAndOutcome =
        verifiedAnalysis.caseAnalysis.courtReasoning.length === 0 &&
        !verifiedAnalysis.caseAnalysis.finalOperativeOrder;

      if (
        (hasNoCourtOrCaseInfo && hasNoPartiesAndProvisions) ||
        ( verifiedAnalysis.documentType === 'Other or unknown' &&
          hasNoPartiesAndProvisions &&
          hasNoReasoningAndOutcome )
      ) {
        return res.status(422).json({
          error:
            'Error has occurred: The uploaded document is incomplete or invalid. Essential court details (court name, parties, legal provisions, or operative order) could not be found in the uploaded file.',
        });
      }

      // Store in memory cache (limit to 20 entries)
      if (analysisMemoryCache.size >= 20) {
        const oldestKey = analysisMemoryCache.keys().next().value;
        if (oldestKey) analysisMemoryCache.delete(oldestKey);
      }
      analysisMemoryCache.set(cacheKey, verifiedAnalysis);

      return res.json({
        analysis: verifiedAnalysis,
      });
    } catch (error: any) {
      const rateLimited = isRateLimitError(error);
      const cleanMessage = rateLimited
        ? 'Gemini API rate limit reached across available models. Please wait 20–30 seconds and click Retry Analysis.'
        : error?.message ||
          'Failed to complete legal document analysis. Please verify the PDF and retry.';
      console.warn('Paper Juris analysis warning:', cleanMessage);
      return res.status(rateLimited ? 429 : 500).json({
        error: cleanMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Paper Juris server running on http://localhost:${PORT}`);
  });
}

startServer();
