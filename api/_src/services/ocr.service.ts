/**
 * OCR Service for Medical Certificate Processing
 * 
 * This service provides OCR functionality to extract text from medical certificates.
 * Currently uses pattern matching on extracted text. Can be extended to use:
 * - Google Cloud Vision API
 * - AWS Textract
 * - Tesseract.js (server-side)
 * 
 * For production, consider integrating with a real OCR service.
 */

export interface OCRExtractionResult {
  success: boolean;
  rawText: string;
  extractedData: {
    date: string | null;
    patientName: string | null;
    doctorName: string | null;
    isMedicalCertificate: boolean;
  };
  confidence: number;
  error?: string;
}

/**
 * Common date formats found in medical certificates
 */
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
  // YYYY-MM-DD (ISO format)
  /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
  // Month DD, YYYY
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
  // DD Month YYYY
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
];

/**
 * Keywords that indicate a medical certificate
 */
const MEDICAL_CERTIFICATE_KEYWORDS = [
  'medical certificate',
  'medical cert',
  'doctor\'s certificate',
  'medical clearance',
  'certificate of illness',
  'unfit for work',
  'unable to work',
  'sick leave',
  'medical practitioner',
  'general practitioner',
  'dr.',
  'doctor',
  'clinic',
  'hospital',
  'surgery',
  'medical centre',
  'medical center',
  'health centre',
  'diagnosis',
  'patient',
];

/**
 * Parse a date string from various formats into ISO format
 */
function parseDate(dateMatch: RegExpMatchArray): string | null {
  try {
    // Check which pattern matched
    const [fullMatch, first, second, third] = dateMatch;
    
    // DD/MM/YYYY or DD-MM-YYYY pattern
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(fullMatch)) {
      const day = parseInt(first, 10);
      const month = parseInt(second, 10) - 1; // 0-indexed
      const year = parseInt(third, 10);
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
    
    // YYYY-MM-DD pattern
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(fullMatch)) {
      const year = parseInt(first, 10);
      const month = parseInt(second, 10) - 1;
      const day = parseInt(third, 10);
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
    
    // Month DD, YYYY pattern
    if (/[a-z]/i.test(first)) {
      const months: { [key: string]: number } = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11,
      };
      const month = months[first.toLowerCase()];
      const day = parseInt(second, 10);
      const year = parseInt(third, 10);
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
    
    // DD Month YYYY pattern
    const months: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11,
    };
    
    const day = parseInt(first, 10);
    const month = months[second.toLowerCase()];
    const year = parseInt(third, 10);
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Extract name following common patterns in medical certificates
 * Looks for: "Patient: Name", "Name: XXX", "This is to certify that XXX"
 */
function extractPatientName(text: string): string | null {
  const patterns = [
    /patient[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /name[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /certify\s+that\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /certifies\s+that\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /mr\.?\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /mrs\.?\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /ms\.?\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /miss\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract doctor name from the certificate
 */
function extractDoctorName(text: string): string | null {
  const patterns = [
    /dr\.?\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /doctor\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /practitioner[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /signed[\s:]*(?:by)?[\s:]*dr\.?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Check if text appears to be from a medical certificate
 */
function isMedicalCertificate(text: string): boolean {
  const lowerText = text.toLowerCase();
  const matchCount = MEDICAL_CERTIFICATE_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  ).length;
  
  // Need at least 2 keyword matches to consider it a medical certificate
  return matchCount >= 2;
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseDate(match);
      if (parsed) return parsed;
    }
  }
  return null;
}

/**
 * Process extracted OCR text and extract relevant information
 * 
 * This function takes raw text (from OCR or manual input) and extracts:
 * - Date of the certificate
 * - Patient name
 * - Doctor name
 * - Whether it appears to be a valid medical certificate
 */
export function processOCRText(rawText: string): OCRExtractionResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      rawText: '',
      extractedData: {
        date: null,
        patientName: null,
        doctorName: null,
        isMedicalCertificate: false,
      },
      confidence: 0,
      error: 'No text provided for processing',
    };
  }

  const cleanText = rawText.trim();
  
  // Extract data
  const date = extractDate(cleanText);
  const patientName = extractPatientName(cleanText);
  const doctorName = extractDoctorName(cleanText);
  const isMedCert = isMedicalCertificate(cleanText);

  // Calculate confidence score (0-1)
  let confidence = 0;
  if (isMedCert) confidence += 0.4;
  if (date) confidence += 0.3;
  if (patientName) confidence += 0.2;
  if (doctorName) confidence += 0.1;

  const success = isMedCert && date !== null && patientName !== null;

  return {
    success,
    rawText: cleanText,
    extractedData: {
      date,
      patientName,
      doctorName,
      isMedicalCertificate: isMedCert,
    },
    confidence,
    error: success ? undefined : 'Could not extract required information from certificate',
  };
}

/**
 * Mock OCR function for image processing
 * 
 * In production, this should call an actual OCR service:
 * - Google Cloud Vision: https://cloud.google.com/vision/docs/ocr
 * - AWS Textract: https://aws.amazon.com/textract/
 * - Tesseract.js: https://tesseract.projectnaptha.com/
 * 
 * For now, this returns a mock response indicating the image needs manual review.
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<OCRExtractionResult> {
  // In a real implementation, you would:
  // 1. Send the image buffer to an OCR service
  // 2. Receive the extracted text
  // 3. Process the text using processOCRText()
  
  // For now, return a result that flags for manual review
  console.log('[OCR] Image received for processing, size:', imageBuffer.length, 'bytes');
  
  // Mock implementation - in production, replace with actual OCR API call
  // Example with Google Cloud Vision:
  // const client = new ImageAnnotatorClient();
  // const [result] = await client.textDetection(imageBuffer);
  // const text = result.fullTextAnnotation?.text || '';
  // return processOCRText(text);
  
  return {
    success: false,
    rawText: '',
    extractedData: {
      date: null,
      patientName: null,
      doctorName: null,
      isMedicalCertificate: false,
    },
    confidence: 0,
    error: 'OCR processing requires manual review. Please wait for admin verification.',
  };
}

export default {
  processOCRText,
  extractTextFromImage,
};
