import { inMemoryDb } from '../../repositories/database.js';
import { textExtractorService } from '../documents/text-extractor.service.js';
import { ocrService } from '../ocr/ocr.service.js';
import { geminiService } from '../gemini/gemini.service.js';
import { validationEngineService } from '../validation/validation.service.js';
import { retrievalService } from '../retrieval/retrieval.service.js';
import { knowledgeGraphService } from '../knowledge/knowledge.service.js';
import { v4 as uuidv4 } from 'uuid';

export class ProcessingPipelineService {
  private activeJobs: Set<string> = new Set();

  /**
   * Process document through the end-to-end IDP pipeline
   */
  public async processDocument(documentId: string, filePath: string): Promise<void> {
    if (this.activeJobs.has(documentId)) {
      console.warn(`Document ${documentId} is already actively processing. Skipping duplicate job.`);
      return;
    }

    this.activeJobs.add(documentId);
    const doc = inMemoryDb.documents.get(documentId);
    if (!doc) {
      this.activeJobs.delete(documentId);
      throw new Error(`Document ${documentId} not found in repository`);
    }

    try {
      // Stage 1: Update status to extracting
      doc.processing_status = 'extracting';
      doc.updated_at = new Date().toISOString();

      // Step 1: Text extraction / OCR
      let text = '';
      let pageCount = 1;

      try {
        const textResult = await textExtractorService.extract(filePath, doc.mime_type);
        text = textResult.text;
        pageCount = textResult.pageCount;

        if (textResult.isScannedSuspected || text.length < 30) {
          console.log(`Document ${doc.file_name} appears scanned. Triggering OCR engine.`);
          const ocrResult = await ocrService.recognize(filePath);
          if (ocrResult.text.length > text.length) {
            text = ocrResult.text;
          }
        }
      } catch (err: any) {
        console.warn(`Standard text extract failed: ${err.message}. Trying OCR...`);
        const ocrResult = await ocrService.recognize(filePath);
        text = ocrResult.text;
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Unable to extract readable text from document. File may be encrypted, corrupted, or blank.');
      }

      doc.extracted_text = text;
      doc.page_count = pageCount;

      // Step 2: Document Classification
      const classification = await geminiService.classifyDocument(text, doc.file_name);
      doc.document_type = classification.document_type;
      doc.classification_confidence = classification.confidence;
      doc.language = classification.language || 'en';

      // Step 3: Structured Information Extraction
      const structuredExtraction = await geminiService.extractStructuredData(text, classification.document_type);

      inMemoryDb.extractions.set(documentId, {
        id: uuidv4(),
        document_id: documentId,
        user_id: doc.user_id,
        schema_version: '1.0.0',
        model_name: 'gemini-2.5-flash',
        extracted_data: structuredExtraction,
        field_confidence: {},
        created_at: new Date().toISOString(),
      });

      // Step 4: Deterministic Validation
      doc.processing_status = 'validating';
      const existingDocs = Array.from(inMemoryDb.documents.values()).map((d) => ({
        id: d.id,
        fileName: d.file_name,
        type: d.document_type,
        extractedData: inMemoryDb.extractions.get(d.id)?.extracted_data,
      }));

      const issues = validationEngineService.validate({
        documentId,
        userId: doc.user_id,
        documentType: classification.document_type,
        extractedData: structuredExtraction,
        classificationConfidence: classification.confidence,
        existingDocuments: existingDocs,
      });

      // Save validation issues
      for (const issue of issues) {
        const issueId = uuidv4();
        inMemoryDb.validationIssues.set(issueId, { ...issue, id: issueId });
      }

      // Step 5: Document Summary & Obligations
      const summaryResult = await geminiService.generateSummary(text, classification.document_type);
      doc.summary = summaryResult.summary;

      // Step 6: Knowledge Discovery Entities & Relationships
      const { entities, relationships } = knowledgeGraphService.extractEntitiesAndRelationships(
        documentId,
        doc.user_id,
        doc.file_name,
        classification.document_type,
        structuredExtraction
      );

      for (const ent of entities) {
        inMemoryDb.entities.set(ent.id!, ent);
      }
      for (const rel of relationships) {
        inMemoryDb.relationships.set(rel.id!, rel);
      }

      // Step 7: Document Chunking for RAG
      const chunks = retrievalService.chunkText(documentId, doc.user_id, text);
      for (const chunk of chunks) {
        const chunkId = uuidv4();
        inMemoryDb.chunks.set(chunkId, { ...chunk, id: chunkId });
      }

      // Step 8: Final Status Assessment
      const hasCriticalIssues = issues.some((i) => i.severity === 'critical');
      const hasWarningIssues = issues.some((i) => i.severity === 'warning');

      if (hasCriticalIssues || hasWarningIssues || classification.requires_review) {
        doc.processing_status = 'needs_review';
        doc.review_status = 'pending_review';
      } else {
        doc.processing_status = 'completed';
        doc.review_status = 'approved';
      }

      doc.processed_at = new Date().toISOString();
      doc.updated_at = new Date().toISOString();
      doc.processing_error = null;
    } catch (error: any) {
      console.error(`Pipeline processing failed for document ${documentId}:`, error);
      doc.processing_status = 'failed';
      doc.processing_error = error.message || 'Processing error';
      doc.updated_at = new Date().toISOString();
    } finally {
      this.activeJobs.delete(documentId);
    }
  }
}

export const processingPipelineService = new ProcessingPipelineService();
