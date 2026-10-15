import { createWorker } from 'tesseract.js';
import fs from 'fs';
import { config } from '../../config/index.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export class OcrService {
  /**
   * Run OCR on image file (PNG, JPG, JPEG)
   */
  public async recognize(filePath: string): Promise<OcrResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist for OCR: ${filePath}`);
    }

    let worker;
    try {
      worker = await createWorker(config.OCR_LANGUAGE || 'eng');
      const ret = await worker.recognize(filePath);
      await worker.terminate();

      return {
        text: (ret.data.text || '').trim(),
        confidence: (ret.data.confidence || 0) / 100,
      };
    } catch (error: any) {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
      console.error(`OCR processing failed for ${filePath}:`, error.message);
      throw new Error(`OCR processing error: ${error.message}`);
    }
  }
}

export const ocrService = new OcrService();
