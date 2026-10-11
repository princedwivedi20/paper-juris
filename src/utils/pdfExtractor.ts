import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExtractedDocument, ExtractedPage, ChunkInput } from '../types/legal';

// Configure PDF.js worker using Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfExtractionProgress {
  stage: 'reading' | 'extracting_page' | 'completed';
  currentPage?: number;
  totalPages?: number;
  message: string;
}

/**
 * Extracts text page-by-page from an uploaded PDF file while preserving page boundaries,
 * line breaks, and detecting pages with missing or poor-quality text.
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<ExtractedDocument> {
  if (!file) {
    throw new Error('No file provided.');
  }

  const isPdfType =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType) {
    throw new Error('Invalid file format. Only PDF documents (.pdf) are supported.');
  }

  if (file.size === 0) {
    throw new Error('The uploaded PDF file is empty (0 bytes).');
  }

  const MAX_SIZE_MB = 25;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds the ${MAX_SIZE_MB} MB limit. Please upload a smaller court document.`);
  }

  onProgress?.({
    stage: 'reading',
    message: 'Reading PDF file into memory...',
  });

  const arrayBuffer = await file.arrayBuffer();

  let pdfDocument: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    pdfDocument = await loadingTask.promise;
  } catch (err: any) {
    throw new Error(
      `Unable to parse PDF structure. The file may be corrupted or password-protected. (${err?.message || 'Read error'})`
    );
  }

  const totalPages = pdfDocument.numPages;
  if (totalPages === 0) {
    throw new Error('The PDF contains 0 pages.');
  }

  const MAX_PAGES = 120;
  if (totalPages > MAX_PAGES) {
    throw new Error(
      `This document has ${totalPages} pages, which exceeds the ${MAX_PAGES}-page prototype processing limit. Please upload a judgment or order up to ${MAX_PAGES} pages.`
    );
  }

  const pages: ExtractedPage[] = [];
  const lowQualityPageNumbers: number[] = [];
  let totalCharacterCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      stage: 'extracting_page',
      currentPage: pageNum,
      totalPages,
      message: `Extracting text from page ${pageNum} of ${totalPages}...`,
    });

    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct lines based on Y coordinates so court layout (headings, numbered paragraphs) remains legible
    let lastY: number | null = null;
    const textChunks: string[] = [];

    for (const item of textContent.items as any[]) {
      if (typeof item.str === 'string') {
        const currentY = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
          textChunks.push('\n');
        } else if (textChunks.length > 0 && !textChunks[textChunks.length - 1].endsWith('\n') && !textChunks[textChunks.length - 1].endsWith(' ')) {
          textChunks.push(' ');
        }
        textChunks.push(item.str);
        if (currentY !== null) {
          lastY = currentY;
        }
      }
    }

    const rawText = textChunks
      .join('')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const charCount = rawText.length;
    const wordCount = rawText
      ? rawText.split(/\s+/).filter((w) => w.length > 0).length
      : 0;

    // A normal court page has 150-400 words. Under 40 characters or <8 words indicates a scanned image page or blank page.
    const isLowQualityOrScanned = charCount < 45 || wordCount < 8;
    if (isLowQualityOrScanned) {
      lowQualityPageNumbers.push(pageNum);
    }

    totalCharacterCount += charCount;

    pages.push({
      pageNumber: pageNum,
      text: rawText,
      charCount,
      wordCount,
      isLowQualityOrScanned,
    });
  }

  const isMostlyScanned =
    totalCharacterCount < 120 ||
    lowQualityPageNumbers.length / totalPages > 0.75;

  // Check whether the extracted text is an incomplete document or invalid (non-court) file
  const combinedText = pages.map((p) => p.text).join(' ');
  const combinedLowerText = combinedText.toLowerCase();

  const totalWordCount = pages.reduce((acc, p) => acc + p.wordCount, 0);

  // Detect dominant script / language from Unicode character ranges
  const scriptRanges: { name: string; code: string; regex: RegExp }[] = [
    { name: 'Hindi / Marathi (Devanagari)', code: 'hi', regex: /[\u0900-\u097F]/g },
    { name: 'Bengali / Assamese', code: 'bn', regex: /[\u0980-\u09FF]/g },
    { name: 'Punjabi (Gurmukhi)', code: 'pa', regex: /[\u0A00-\u0A7F]/g },
    { name: 'Gujarati', code: 'gu', regex: /[\u0A80-\u0AFF]/g },
    { name: 'Odia', code: 'or', regex: /[\u0B00-\u0B7F]/g },
    { name: 'Tamil', code: 'ta', regex: /[\u0B80-\u0BFF]/g },
    { name: 'Telugu', code: 'te', regex: /[\u0C00-\u0C7F]/g },
    { name: 'Kannada', code: 'kn', regex: /[\u0C80-\u0CFF]/g },
    { name: 'Malayalam', code: 'ml', regex: /[\u0D00-\u0D7F]/g },
    { name: 'Urdu / Arabic', code: 'ur', regex: /[\u0600-\u06FF]/g },
  ];

  let detectedLanguage = 'English';
  let languageCode = 'en';
  let maxScriptCount = 0;

  for (const script of scriptRanges) {
    const matches = combinedText.match(script.regex);
    const count = matches ? matches.length : 0;
    if (count > 40 && count > maxScriptCount) {
      maxScriptCount = count;
      detectedLanguage = script.name;
      languageCode = script.code;
    }
  }

  // Refine Hindi vs Marathi if Devanagari script is dominant
  if (languageCode === 'hi') {
    const marathiMarkers = ['न्यायालय', 'अर्जदार', 'जामीन', 'आहे', 'त्यामुळे', 'प्रकरणात', 'आदेश'];
    const hindiMarkers = ['अदालत', 'याचिकाकर्ता', 'प्रतिवादी', 'अभियुक्त', 'जमानत', 'धारा', 'निर्णय', 'है', 'किया'];
    const mrHits = marathiMarkers.filter((m) => combinedText.includes(m)).length;
    const hiHits = hindiMarkers.filter((m) => combinedText.includes(m)).length;
    if (mrHits > hiHits && combinedText.includes('आहे')) {
      detectedLanguage = 'Marathi (मराठी)';
      languageCode = 'mr';
    } else {
      detectedLanguage = 'Hindi (हिन्दी)';
      languageCode = 'hi';
    }
  }

  const legalIndicators = [
    // English legal terms
    'court',
    'hon\'ble',
    'justice',
    'coram',
    'petitioner',
    'respondent',
    'appellant',
    'defendant',
    'plaintiff',
    'accused',
    'complainant',
    'prosecution',
    'counsel',
    'advocate',
    'judgment',
    'judgement',
    'order',
    'petition',
    'application',
    'appeal',
    'writ',
    'bail',
    'section',
    'article',
    'act',
    'tribunal',
    'bench',
    'versus',
    'v.',
    'vs.',
    'crpc',
    'ipc',
    'cpc',
    'arbitration',
    'suit',
    'decree',
    'disposed',
    'allowed',
    'dismissed',
    // Hindi / Marathi (Devanagari) legal terms
    'न्यायालय',
    'अदालत',
    'न्यायाधीश',
    'न्यायमूर्ति',
    'याचिकाकर्ता',
    'वादी',
    'प्रतिवादी',
    'अभियुक्त',
    'आरोपी',
    'अधिवक्ता',
    'वकील',
    'निर्णय',
    'आदेश',
    'याचिका',
    'अपील',
    'जमानत',
    'जामीन',
    'धारा',
    'अधिनियम',
    'बनाम',
    'विरुद्ध',
    'अर्जदार',
    'फैसला',
    'संहिता',
    // Tamil legal terms
    'நீதிமன்றம்',
    'நீதிபதி',
    'மனுதாரர்',
    'எதிர்மனுதாரர்',
    'உத்தரவு',
    'தீர்ப்பு',
    'பிரிவு',
    'சட்டம்',
    'ஜாமீன்',
    // Telugu legal terms
    'न्याయస్థానం',
    'కోర్టు',
    'న్యాయమూర్తి',
    'పిటిషనర్',
    'ప్రతివాది',
    'తీర్పు',
    'ఉత్తర్వు',
    'సెక్షన్',
    'చట్టం',
    'బెయిల్',
    // Kannada legal terms
    'ನ್ಯಾಯಾಲಯ',
    'ನ್ಯಾಯಾಧೀಶರು',
    'अर्जಿದಾರರು',
    'ಅರ್ಜಿದಾರ',
    'ಪ್ರತಿವಾದಿ',
    'ತೀರ್ಪು',
    'ಆದೇಶ',
    'ಕಲಂ',
    'ಕಾಯ್ದೆ',
    'ಜಾಮೀನು',
    // Malayalam legal terms
    'കോടതി',
    'ജഡ്ജി',
    'ഹർജിക്കാരൻ',
    'എതിർകക്ഷി',
    'വിധി',
    'ഉത്തരവ്',
    'വകുപ്പ്',
    'നിയമം',
    'ജാമ്യം',
    // Bengali legal terms
    'আদালত',
    'বিচারপতি',
    'বিচারক',
    'আবেদনকারী',
    'বিবাদী',
    'রায়',
    'আদেশ',
    'ধারা',
    'আইন',
    'জামিন',
    // Gujarati legal terms
    'અદાલત',
    'કોર્ટ',
    'ન્યાયાધીશ',
    'અરજદાર',
    'પ્રતિવાદી',
    'ચુકાદો',
    'હુકમ',
    'કલમ',
    'કાયદો',
    'જામીન',
    // Punjabi legal terms
    'ਅਦਾਲਤ',
    'ਜੱਜ',
    'ਪਟੀਸ਼ਨਰ',
    'مدعا',
    'ਫੈਸਲਾ',
    'ਹੁਕਮ',
    'ਧਾਰਾ',
    'ਕਾਨੂੰਨ',
    'ਜ਼ਮਾਨਤ',
    // Odia legal terms
    'ନ୍ୟାୟାଳୟ',
    'କୋର୍ଟ',
    'ବିଚାରପତି',
    'ଆବେଦନକାରୀ',
    'প্রতিବାଦୀ',
    'ରାୟ',
    'ଆଦେଶ',
    'ଧାରା',
    'ଆଇନ',
    // Urdu legal terms
    'عدالت',
    'جج',
    'درخواست گزار',
    'مدعا علیہ',
    'فیصلہ',
    'حکم',
    'دفعہ',
    'قانون',
    'ضمانت',
    // European / International legal terms (French, Spanish, German, etc.)
    'tribunal',
    'cour',
    'jugement',
    'arrêt',
    'demandeur',
    'défendeur',
    'juzgado',
    'sentencia',
    'demandante',
    'demandado',
    'artículo',
    'gericht',
    'urteil',
    'kläger',
    'beklagte',
  ];

  const matchedIndicators = legalIndicators.filter((term) =>
    combinedLowerText.includes(term.toLowerCase())
  );

  let isIncompleteOrInvalidDocument = false;
  let validationReason: string | null = null;

  if (!isMostlyScanned) {
    if (totalCharacterCount < 200 || totalWordCount < 35) {
      isIncompleteOrInvalidDocument = true;
      validationReason =
        'Error has occurred: The uploaded document is incomplete or invalid (contains insufficient text for a court order or judgment). Please upload a complete court PDF.';
    } else if (matchedIndicators.length < 2) {
      isIncompleteOrInvalidDocument = true;
      validationReason =
        'Error has occurred: The uploaded document is invalid or does not appear to be a valid court judgment, order, or legal filing. Please upload a valid court PDF.';
    }
  }

  onProgress?.({
    stage: 'completed',
    currentPage: totalPages,
    totalPages,
    message: `Extracted ${totalPages} page${totalPages > 1 ? 's' : ''} (${totalCharacterCount.toLocaleString()} characters · ${detectedLanguage}).`,
  });

  return {
    filename: file.name,
    fileSizeBytes: file.size,
    totalPages,
    pages,
    lowQualityPageNumbers,
    totalCharacterCount,
    isMostlyScanned,
    detectedLanguage,
    languageCode,
    isIncompleteOrInvalidDocument,
    validationReason,
  };
}

/**
 * Divides extracted pages into manageable, page-aware chunks so we never send
 * unlimited text in a single prompt while strictly preserving [PAGE N] boundaries.
 */
export function buildPageAwareChunks(
  pages: ExtractedPage[],
  maxCharsPerChunk = 42000
): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let currentStartPage = pages[0]?.pageNumber ?? 1;
  let currentEndPage = currentStartPage;
  let currentBuffer = '';
  let chunkIndex = 0;

  for (const page of pages) {
    const formattedPage = `\n=== [PAGE ${page.pageNumber} START] ===\n${
      page.text || '[NO EXTRACTABLE TEXT ON THIS PAGE]'
    }\n=== [PAGE ${page.pageNumber} END] ===\n`;

    if (
      currentBuffer.length > 0 &&
      currentBuffer.length + formattedPage.length > maxCharsPerChunk
    ) {
      chunks.push({
        chunkIndex,
        startPage: currentStartPage,
        endPage: currentEndPage,
        textWithPageMarkers: currentBuffer.trim(),
      });
      chunkIndex++;
      currentStartPage = page.pageNumber;
      currentEndPage = page.pageNumber;
      currentBuffer = formattedPage;
    } else {
      if (currentBuffer.length === 0) {
        currentStartPage = page.pageNumber;
      }
      currentEndPage = page.pageNumber;
      currentBuffer += formattedPage;
    }
  }

  if (currentBuffer.trim().length > 0) {
    chunks.push({
      chunkIndex,
      startPage: currentStartPage,
      endPage: currentEndPage,
      textWithPageMarkers: currentBuffer.trim(),
    });
  }

  return chunks;
}
