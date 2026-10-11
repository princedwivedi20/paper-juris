# Paper Juris — Indian Court Document Intelligence Platform

**Paper Juris** is a full-stack court document intelligence web application designed to transform lengthy Indian court judgments, interim orders, bail orders, and legal filings into structured, evidence-backed judicial dockets.

It supports multi-page PDF documents across Indian and international languages (English, Hindi, Marathi, Tamil, Telugu, Kannada, Bengali, Gujarati, Malayalam, Punjabi, Urdu, and more), automatically generating the entire structured legal analysis in the **same language** as the uploaded PDF while verifying every statutory citation and operative decree against verbatim page passages.

---

## Key Features

- **Page-Preserved PDF Extraction**: Client-side PDF parsing via `pdfjs-dist` that preserves page boundaries (`[PAGE N]`), line breaks, word counts, and detects scanned/image-only pages or incomplete/corrupted filings.
- **Document Completeness & Validity Guardrails**: Automatically detects incomplete, truncated, or non-judicial documents and alerts the user before or during analysis.
- **Native Multi-Language Legal Intelligence**: Detects the primary language of the judgment PDF and outputs summaries, issues, judicial reasoning, party arguments, and procedural history in that exact language.
- **Programmatic Evidence Verification**: Every extracted statute/article citation and final operative order is cross-checked against the raw page text to prevent hallucinated outcomes.
- **Formal Judicial Docket Dashboard**:
  - Formal Cause Title sheet (*Petitioner/Appellant vs. Respondent*)
  - Case Type classification & Verified Final Outcome Banner
  - Statutory Provisions table with judicial treatment filters (*Applied by Court*, *Judicial Discussion*, *Submission of Counsel*, *Distinguished*)
  - Source Page Evidence Inspector modal with verbatim passage highlighting
  - Searchable Full Document Text viewer and JSON / Printable Case Brief exports
- **Built-in Reference Court Judgments**: Generate and test authentic multi-page Indian court judgment PDFs on the fly via `jsPDF`.

---

## Tech Stack & APIs Used

| Layer | Technology / API | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons | Formal Judicial Docket UI, filters, and interactive evidence modal |
| **PDF Parsing** | Mozilla `pdfjs-dist` | Client-side page-by-page PDF text extraction |
| **Sample PDF Generation** | `jspdf` | Generates downloadable multi-page Indian court judgment PDFs |
| **Backend Server** | Node.js, Express, `tsx` | Serves the Vite frontend and `/api/analyze-document` endpoint on port `3000` |
| **AI Legal Engine** | Google Gemini API (`@google/genai` SDK) | Structured JSON extraction, language detection, and multi-model fallback (`gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-3.8-flash`) |

---

## Prerequisites

Before running the project locally, make sure you have:

1. **Node.js** (v18.0.0 or higher recommended; v20+ ideal)
2. **npm** (comes bundled with Node.js)
3. **A Google Gemini API Key** (free or paid tier from [Google AI Studio](https://aistudio.google.com/apikey))

---

## How to Run Locally (Step-by-Step Guide)

### 1. Download or Clone the Project
Download and extract the project files into a folder on your computer, then open a terminal in the project root directory:

```bash
cd paper-juris
```

### 2. Install Dependencies
Install all required frontend and backend packages:

```bash
npm install
```

### 3. Configure Your Environment Variable (`.env`)
Create a `.env` file in the root directory of the project (next to `package.json` and `server.ts`):

```bash
cp .env.example .env
```

Open `.env` in any text editor and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Note:** Keep your `.env` file private. The API key is read exclusively by the Express backend (`server.ts`) and is never exposed to the browser.

### 4. Start the Development Server
Run the full-stack application (Express API + Vite frontend):

```bash
npm run dev
```

You will see output similar to:
```text
Paper Juris server running on http://localhost:3000
```

### 5. Open in Browser
Open your browser and navigate to:

```text
http://localhost:3000
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the full-stack Express + Vite server in development mode on `http://localhost:3000` |
| `npm run build` | Builds the optimized production frontend bundle into the `dist/` folder |
| `npm start` | Runs the Express server (`tsx server.ts`) |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) across the codebase |
| `npm run clean` | Removes build artifacts (`dist/`) |

---

## Running in Production Mode

To build and serve the optimized production bundle locally:

```bash
npm run build
NODE_ENV=production npm start
```

The production server will serve the compiled static frontend from `dist/` alongside the `/api/analyze-document` and `/api/health` endpoints on port `3000`.

---

## Troubleshooting

- **`GEMINI_API_KEY is not configured on the server`**:
  Ensure you created a `.env` file in the root directory (same folder as `server.ts`) containing `GEMINI_API_KEY=AIza...` and restarted `npm run dev`.
- **`429 Quota Exceeded / Resource Exhausted`**:
  The server includes automatic retry backoff, multi-model fallback, and in-memory caching. If all free-tier models hit rate limits simultaneously, wait ~30–60 seconds and click **Retry Analysis**.
- **Scanned / Image-Only PDFs**:
  If a PDF contains only scanned page images without an embedded text layer, Paper Juris will display an extraction warning indicating that optical character recognition (OCR) is required before statutory text verification can be performed.
