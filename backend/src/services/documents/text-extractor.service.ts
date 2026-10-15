import pdfParse from 'pdf-parse';
import fs from 'fs';

export interface ExtractedDocumentContent {
  text: string;
  pageCount: number;
  metadata?: Record<string, any>;
  isScannedSuspected: boolean;
}

export class TextExtractorService {
  /**
   * Extract text and metadata from PDF or text file
   */
  public async extract(filePath: string, mimeType: string): Promise<ExtractedDocumentContent> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    // 1. Plain text / Markdown / CSV files
    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'text/csv' ||
      filePath.endsWith('.txt') ||
      filePath.endsWith('.md')
    ) {
      const text = fileBuffer.toString('utf-8');
      const approximatePages = Math.max(1, Math.ceil(text.length / 2500));
      return {
        text: text.trim(),
        pageCount: approximatePages,
        isScannedSuspected: false,
      };
    }

    // 2. PDF extraction
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      try {
        const parsed = await pdfParse(fileBuffer);
        const extractedText = (parsed.text || '').trim();
        const pageCount = parsed.numpages || 1;

        // If a PDF has multiple pages but very little text (< 50 chars per page),
        // it is likely a scanned document that requires OCR!
        const isScannedSuspected = extractedText.length < (pageCount * 50);

        return {
          text: extractedText,
          pageCount,
          metadata: parsed.info || {},
          isScannedSuspected,
        };
      } catch (err: any) {
        console.warn(`Direct PDF parse failed (${err.message}). Flagging for OCR analysis.`);
        return {
          text: '',
          pageCount: 1,
          isScannedSuspected: true,
        };
      }
    }

    // 3. Image file mime types
    if (mimeType.startsWith('image/')) {
      return {
        text: '',
        pageCount: 1,
        isScannedSuspected: true,
      };
    }

    throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
  }
}

export const textExtractorService = new TextExtractorService();
