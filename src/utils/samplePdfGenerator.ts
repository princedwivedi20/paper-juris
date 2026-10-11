import { jsPDF } from 'jspdf';

export interface SampleCasePreset {
  id: string;
  title: string;
  subtitle: string;
  filename: string;
  court: string;
  category: string;
  pages: string[][];
}

export const SAMPLE_COURT_CASES: SampleCasePreset[] = [
  {
    id: 'commercial-arbitration-hc',
    title: 'Vindhya Infra Projects Pvt. Ltd. v. National Highways Development Authority',
    subtitle: 'High Court of Delhi · Section 34 Arbitration & Conciliation Act, 1996 (4 Pages)',
    filename: 'Vindhya_Infra_vs_NHDA_OMP_COMM_412_2025_DelhiHC.pdf',
    court: 'High Court of Delhi at New Delhi',
    category: 'Commercial · Arbitration',
    pages: [
      [
        'IN THE HIGH COURT OF DELHI AT NEW DELHI',
        'ORDINARY ORIGINAL CIVIL JURISDICTION (COMMERCIAL DIVISION)',
        '',
        'O.M.P. (COMM) 412/2025 & I.A. 8921/2025',
        '',
        'Judgment Reserved on: 18th August, 2025',
        'Judgment Pronounced on: 12th September, 2025',
        '',
        'CORAM: HON\'BLE JUSTICE R. K. SUBRAMANIAN',
        '',
        'IN THE MATTER OF:',
        'VINDHYA INFRA PROJECTS PVT. LTD.',
        'Having its registered office at Plot No. 44, Okhla Phase-III, New Delhi - 110020',
        '... PETITIONER / OBJECTOR',
        '',
        'VERSUS',
        '',
        'NATIONAL HIGHWAYS DEVELOPMENT AUTHORITY (NHDA)',
        'Through its Chief Engineer (North Zone), Sector-10, Dwarka, New Delhi - 110075',
        '... RESPONDENT / CLAIMANT IN ARBITRATION',
        '',
        'JUDGMENT',
        '',
        '1. The present petition has been filed under Section 34 of the Arbitration and Conciliation Act, 1996 ("the Arbitration Act") by the Petitioner, Vindhya Infra Projects Pvt. Ltd., challenging the Arbitral Award dated 14.03.2025 passed by the learned Sole Arbitrator in arbitration proceedings arising out of EPC Contract Agreement No. NHDA/EPC/UP-09/2021 dated 10.05.2021.',
        '',
        '2. The dispute pertains to the four-laning of the stretch between Km 42.000 and Km 88.500 on NH-731 in the State of Uttar Pradesh. Under Clause 10.3 of the EPC Agreement, the scheduled completion period was 24 months from the Appointed Date (01.07.2021). However, work was delayed by 11 months.',
        '',
        '3. Before the Arbitral Tribunal, the Petitioner claimed Rs. 18,45,00,000/- towards prolongation costs and escalation, alleging hindrance in handing over encumbrance-free Right of Way (RoW) under Section 54 and Section 55 of the Indian Contract Act, 1872. Conversely, the Respondent, National Highways Development Authority (NHDA), filed a counter-claim for liquidated damages of Rs. 6,20,00,000/- under Section 73 and Section 74 of the Indian Contract Act, 1872.',
      ],
      [
        'O.M.P. (COMM) 412/2025                                                       Page 2 of 4',
        '',
        'SUBMISSIONS OF THE PARTIES',
        '',
        '4. Learned Senior Counsel appearing for the Petitioner, Vindhya Infra Projects Pvt. Ltd., contended that the impugned Arbitral Award suffers from patent illegality within the meaning of Section 34(2A) of the Arbitration and Conciliation Act, 1996. Specifically, the Petitioner argued that:',
        '(a) The Sole Arbitrator ignored contemporaneous joint site inspection reports dated 12.11.2021 and 04.03.2022 showing that forest clearance over 14.2 kilometers was delayed by the Respondent authority.',
        '(b) Under Section 55 of the Indian Contract Act, 1872, where performance of a promise is prevented by the promisee, the contractor is entitled to compensation for any loss sustained due to non-performance at the time agreed.',
        '(c) The rejection of Claim No. 2 (idle machinery charges) is contrary to Section 28(3) of the Arbitration and Conciliation Act, 1996, as the Tribunal rewrote the escalation formula in Schedule-G of the EPC Contract.',
        '',
        '5. Per contra, learned Counsel appearing for the Respondent, National Highways Development Authority (NHDA), opposed the petition and submitted that:',
        '(a) The scope of interference under Section 34 of the Arbitration and Conciliation Act, 1996 is strictly supervisory and does not permit re-appreciation of evidence as if sitting in a first appeal under Section 96 of the Code of Civil Procedure, 1908.',
        '(b) The Arbitral Tribunal examined the Milestone Progress Charts and recorded a factual finding that 82% of the land was available on the Appointed Date, and the Petitioner failed to mobilize batching plants for the first seven months.',
        '(c) The Sole Arbitrator already rejected NHDA\'s counter-claim for liquidated damages under Section 74 of the Indian Contract Act, 1872, while granting partial prolongation expenses of Rs. 4,10,00,000/- to the Petitioner.',
        '',
        'ISSUES FOR CONSIDERATION',
        '',
        '6. The principal question that arises for determination before this Court is whether the Arbitral Award dated 14.03.2025 is vitiated by "patent illegality appearing on the face of the award" under Section 34(2A) of the Arbitration and Conciliation Act, 1996, or is in conflict with the public policy of India under Section 34(2)(b)(ii) of the said Act.',
      ],
      [
        'O.M.P. (COMM) 412/2025                                                       Page 3 of 4',
        '',
        'ANALYSIS AND REASONING OF THE COURT',
        '',
        '7. This Court has carefully perused the arbitral record and the rival submissions of the parties. It is settled law that under Section 34 of the Arbitration and Conciliation Act, 1996, the Court does not sit in appeal over the findings of fact recorded by the Arbitral Tribunal. As emphasized by the proviso to Section 34(2A) of the Arbitration and Conciliation Act, 1996, an award shall not be set aside merely on the ground of an erroneous application of the law or by re-appreciation of evidence.',
        '',
        '8. With respect to the Petitioner\'s contention regarding joint site inspection reports and Section 55 of the Indian Contract Act, 1872, a perusal of Paragraphs 64 to 71 of the Arbitral Award reveals that the learned Sole Arbitrator explicitly considered both the forest clearance delay and the Petitioner\'s concurrent failure to deploy resources in the unobstructed 68-kilometer stretch. The Tribunal applied the principle of apportioning contributory delay and awarded Rs. 4,10,00,000/- towards overheads.',
        '',
        '9. However, insofar as Claim No. 4 relating to post-award interest is concerned, the Tribunal awarded compound interest at 18% per annum on the pendente lite interest component without any contractual stipulation in Clause 19.8 of the EPC Agreement. This Court finds that awarding interest upon interest in the absence of statutory or contractual mandate contravenes Section 31(7)(a) of the Arbitration and Conciliation Act, 1996.',
        '',
        '10. On the issue of Claim No. 2 (idle machinery charges), the Tribunal\'s interpretation of Clause 10.5 read with Section 28(3) of the Arbitration and Conciliation Act, 1996 is a plausible and reasonable construction of the contract terms. Merely because another view is possible is no ground to invoke Section 34 of the Arbitration and Conciliation Act, 1996.',
        '',
        '11. Regarding the Respondent\'s reliance on Section 73 and Section 74 of the Indian Contract Act, 1872, since the Respondent has not filed any separate challenge to the rejection of its counter-claim, that aspect has attained finality.',
      ],
      [
        'O.M.P. (COMM) 412/2025                                                       Page 4 of 4',
        '',
        'CONCLUSION AND OPERATIVE ORDER',
        '',
        '12. In view of the foregoing discussion, this Court holds that the findings of the learned Sole Arbitrator on Claims No. 1, 2, and 3 call for no interference under Section 34 of the Arbitration and Conciliation Act, 1996. The challenge to the substantive computation of prolongation cost of Rs. 4,10,00,000/- is hereby rejected.',
        '',
        '13. However, the severable direction in Paragraph 92(iii) of the Arbitral Award granting 18% compound interest on pendente lite interest is unsustainable under Section 31(7)(a) of the Arbitration and Conciliation Act, 1996 and is set aside to that limited extent. The Petitioner shall be entitled to simple interest at 9% per annum from the date of the Award till realization.',
        '',
        '14. Accordingly, O.M.P. (COMM) 412/2025 is partly allowed strictly to the limited extent of modifying the post-award interest rate in Paragraph 92(iii) of the Award, and is dismissed in respect of all other challenges. Pending application I.A. 8921/2025 also stands disposed of. There shall be no order as to costs.',
        '',
        'Sd/-',
        'R. K. SUBRAMANIAN, J.',
        'SEPTEMBER 12, 2025',
        'NEW DELHI',
      ],
    ],
  },
  {
    id: 'criminal-bail-order-hc',
    title: 'Vikramaditya Sharma v. State of Maharashtra',
    subtitle: 'High Court of Judicature at Bombay · Bail Application under CrPC / IPC (3 Pages)',
    filename: 'Vikramaditya_Sharma_vs_State_of_Maharashtra_BA_1894_2025_BombayHC.pdf',
    court: 'High Court of Judicature at Bombay',
    category: 'Criminal',
    pages: [
      [
        'IN THE HIGH COURT OF JUDICATURE AT BOMBAY',
        'CRIMINAL APPELLATE JURISDICTION',
        '',
        'CRIMINAL BAIL APPLICATION NO. 1894 OF 2025',
        '',
        'Order Date: 24th July, 2025',
        '',
        'CORAM: JUSTICE ANANYA DESHMUKH',
        '',
        'BETWEEN:',
        'VIKRAMADITYA SHARMA',
        'Aged 38 years, Occupation: Chartered Accountant, Resident of Andheri (West), Mumbai',
        '... APPLICANT / ACCUSED NO. 3',
        '',
        'AND',
        '',
        'THE STATE OF MAHARASHTRA',
        'At the instance of Economic Offences Wing (EOW), Unit-III, Mumbai (C.R. No. 48/2024)',
        '... RESPONDENT / PROSECUTION',
        '',
        'INTERVENOR:',
        'DECCAN COOPERATIVE CREDIT SOCIETY LTD.',
        'Through its Authorized Officer, Dadar, Mumbai',
        '... FIRST INFORMANT / COMPLAINANT',
        '',
        'ORDER',
        '',
        '1. By this application filed under Section 439 of the Code of Criminal Procedure, 1973 ("CrPC"), the Applicant, Vikramaditya Sharma (Accused No. 3), seeks regular bail in connection with C.R. No. 48/2024 registered with the Economic Offences Wing (EOW), Mumbai, for offences punishable under Section 409, Section 420, Section 467, Section 468, and Section 120B of the Indian Penal Code, 1860 ("IPC").',
        '',
        '2. The prosecution case, launched on the complaint of Deccan Cooperative Credit Society Ltd., alleges that between April 2022 and November 2023, Accused Nos. 1 and 2 (Managing Directors of M/s. Sahyadri Agro Exports) availed credit facilities of Rs. 12.50 Crores on the basis of fabricated warehouse receipts and stock statements. The Applicant, who was an external Statutory Auditor for FY 2022-23, was arrested on 10.01.2025.',
      ],
      [
        'BAIL APPLICATION NO. 1894 OF 2025                                            Page 2 of 3',
        '',
        'SUBMISSIONS AND COURT ANALYSIS',
        '',
        '3. Learned Counsel for the Applicant submitted that the Applicant merely conducted a statutory audit based on ledger confirmations and certificates furnished by the management, and there is no evidence of conspiracy under Section 120B of the Indian Penal Code, 1860. He emphasized that not a single rupee of the defrauded loan amount was credited to the bank account of the Applicant, save and except professional audit fees of Rs. 1,75,000/-.',
        '',
        '4. Learned Additional Public Prosecutor appearing for the State of Maharashtra and Counsel for the Complainant opposed the bail application under Section 439 of the Code of Criminal Procedure, 1973, contending that the offence under Section 409 and Section 467 of the Indian Penal Code, 1860 is serious and carries punishment up to life imprisonment. They argued that the Applicant ought to have physically verified the agro-warehouses.',
        '',
        '5. Having heard learned Counsel for the parties and examined the charge-sheet filed under Section 173 of the Code of Criminal Procedure, 1973 on 05.04.2025, this Court notes the following material aspects:',
        '(i) The investigation against the present Applicant is complete and the charge-sheet running into 2,400 pages has already been filed before the learned Additional Chief Metropolitan Magistrate.',
        '(ii) The entire documentary and electronic evidence has been seized by the Investigating Officer. Prima facie, the bank trail annexed at Volume-IV of the charge-sheet indicates that the loan proceeds of Rs. 12.50 Crores were diverted to shell entities controlled by Accused Nos. 1 and 2.',
        '(iii) Whether negligent certification of balance sheets by an external auditor amounts to intentional fabrication of valuable security under Section 467 of the Indian Penal Code, 1860 or criminal breach of trust under Section 409 of the Indian Penal Code, 1860 is a matter for trial.',
        '(iv) The Applicant has been in custody since 10.01.2025 (over six months) and has no criminal antecedents.',
      ],
      [
        'BAIL APPLICATION NO. 1894 OF 2025                                            Page 3 of 3',
        '',
        'OPERATIVE ORDER',
        '',
        '6. Keeping in view the settled principle that post-charge-sheet incarceration should not be punitive when documentary evidence is already in the custody of the Court, this Court is inclined to exercise discretion under Section 439 of the Code of Criminal Procedure, 1973 in favour of the Applicant.',
        '',
        '7. Hence, the following order is passed:',
        '(a) Criminal Bail Application No. 1894 of 2025 is allowed.',
        '(b) The Applicant, Vikramaditya Sharma, shall be released on bail in connection with C.R. No. 48/2024 registered with EOW, Mumbai, on furnishing a Personal Bond of Rs. 1,00,000/- (Rupees One Lakh Only) with one or two solvent sureties in the like amount.',
        '(c) The Applicant shall surrender his passport before the Trial Court within one week of his release and shall not leave India without prior permission of the Trial Court.',
        '(d) The Applicant shall report to the office of the EOW, Unit-III, Mumbai on the first Monday of every month between 11:00 AM and 2:00 PM for a period of six months.',
        '(e) It is clarified that the observations made in this order are strictly prima facie for the purpose of deciding the bail application under Section 439 of the Code of Criminal Procedure, 1973 and shall not influence the Trial Court at the stage of trial.',
        '',
        '8. Bail Application stands disposed of accordingly.',
        '',
        'Sd/-',
        '(JUSTICE ANANYA DESHMUKH)',
        'HIGH COURT, BOMBAY',
      ],
    ],
  },
];

/**
 * Generates an authentic, multi-page text-based PDF File object in the browser
 * so users can test the complete PDF upload -> PDF.js extraction -> Gemini API analysis pipeline.
 */
export function createSampleCourtPdfFile(preset: SampleCasePreset): File {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 52;
  const maxLineWidth = pageWidth - margin * 2;

  preset.pages.forEach((lines, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(11);

    let cursorY = 56;
    const lineHeight = 15.5;

    for (const paragraph of lines) {
      if (paragraph.trim() === '') {
        cursorY += 8;
        continue;
      }

      const isHeading =
        paragraph === paragraph.toUpperCase() && paragraph.length < 75;
      if (isHeading) {
        doc.setFont('times', 'bold');
      } else {
        doc.setFont('times', 'normal');
      }

      const wrappedLines: string[] = doc.splitTextToSize(
        paragraph,
        maxLineWidth
      );
      for (const wLine of wrappedLines) {
        doc.text(wLine, margin, cursorY);
        cursorY += lineHeight;
      }
      cursorY += 4;
    }
  });

  const pdfArrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  return new File([blob], preset.filename, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}
