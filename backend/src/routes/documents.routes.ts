import { Router, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import { inMemoryDb } from '../repositories/database.js';
import { DocumentRecord } from '../schemas/document.schema.js';
import { processingPipelineService } from '../services/queue/processing-queue.service.js';
import { geminiService } from '../services/gemini/gemini.service.js';
import { validationEngineService } from '../services/validation/validation.service.js';

const router = Router();

/**
 * POST /api/documents/upload
 * Multi-file and single-file upload with cryptographic hash duplicate detection
 */
router.post(
  '/upload',
  authenticateUser,
  uploadMiddleware.array('files', 10),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided for upload.' });
      return;
    }

    const createdDocuments: DocumentRecord[] = [];
    const duplicates: string[] = [];

    for (const file of files) {
      // 1. Calculate SHA-256 cryptographic file hash
      const fileBuffer = await fs.promises.readFile(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // 2. Check for duplicate upload within user workspace
      const existingDuplicate = Array.from(inMemoryDb.documents.values()).find(
        (d) => d.user_id === userId && d.file_hash === fileHash
      );

      if (existingDuplicate) {
        duplicates.push(file.originalname);
        // Clean up uploaded temp file
        fs.unlink(file.path, () => {});
        continue;
      }

      // 3. Create document record
      const docId = uuidv4();
      const newDoc: DocumentRecord = {
        id: docId,
        user_id: userId,
        file_name: file.originalname,
        storage_path: file.path,
        mime_type: file.mimetype,
        file_size: file.size,
        file_hash: fileHash,
        document_type: 'other_unknown',
        language: 'en',
        processing_status: 'queued',
        review_status: 'not_required',
        classification_confidence: null,
        page_count: 1,
        extracted_text: null,
        summary: null,
        processing_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      inMemoryDb.documents.set(docId, newDoc);
      createdDocuments.push(newDoc);

      // Trigger asynchronous processing pipeline
      processingPipelineService.processDocument(docId, file.path).catch((err) => {
        console.error(`Pipeline error for ${docId}:`, err);
      });
    }

    res.status(201).json({
      message: `Uploaded ${createdDocuments.length} document(s). Processing initiated.`,
      documents: createdDocuments,
      duplicates_skipped: duplicates,
    });
  }
);

/**
 * GET /api/documents
 * List documents with search, category filtering, status filtering, and pagination
 */
router.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { category, status, review_status, q, page = '1', limit = '10' } = req.query;

  let docs = Array.from(inMemoryDb.documents.values()).filter((d) => d.user_id === userId);

  // Search query
  if (q && typeof q === 'string') {
    const searchLower = q.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.file_name.toLowerCase().includes(searchLower) ||
        (d.summary && d.summary.toLowerCase().includes(searchLower)) ||
        (d.extracted_text && d.extracted_text.toLowerCase().includes(searchLower))
    );
  }

  // Filter by category
  if (category && typeof category === 'string' && category !== 'all') {
    docs = docs.filter((d) => d.document_type === category);
  }

  // Filter by processing status
  if (status && typeof status === 'string' && status !== 'all') {
    docs = docs.filter((d) => d.processing_status === status);
  }

  // Filter by review status
  if (review_status && typeof review_status === 'string' && review_status !== 'all') {
    docs = docs.filter((d) => d.review_status === review_status);
  }

  // Sort by created_at descending
  docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Pagination
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
  const total = docs.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginated = docs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Attach issue counts
  const docsWithStats = paginated.map((d) => {
    const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.document_id === d.id);
    return {
      ...d,
      validation_issues_count: issues.length,
      critical_issues_count: issues.filter((i) => i.severity === 'critical').length,
    };
  });

  res.json({
    documents: docsWithStats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: totalPages,
    },
  });
});

/**
 * GET /api/documents/:id
 * Retrieve specific document details
 */
router.get('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.document_id === doc.id);
  const extraction = inMemoryDb.extractions.get(doc.id);

  res.json({
    document: doc,
    extraction: extraction?.extracted_data || null,
    validation_issues: issues,
  });
});

/**
 * GET /api/documents/:id/preview-url
 * Retrieve preview stream or safe text preview
 */
router.get('/:id/preview-url', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  // If local file exists, serve or stream
  if (fs.existsSync(doc.storage_path)) {
    res.sendFile(path.resolve(doc.storage_path));
    return;
  }

  // Fallback to text preview
  res.json({
    file_name: doc.file_name,
    mime_type: doc.mime_type,
    text_preview: doc.extracted_text?.slice(0, 5000) || 'Preview not available for this file.',
  });
});

/**
 * GET /api/documents/:id/extraction
 */
router.get('/:id/extraction', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const extraction = inMemoryDb.extractions.get(doc.id);
  res.json({
    document_id: doc.id,
    schema_version: extraction?.schema_version || '1.0.0',
    model_name: extraction?.model_name || 'gemini-2.5-flash',
    extracted_data: extraction?.extracted_data || null,
    field_confidence: extraction?.field_confidence || {},
  });
});

/**
 * GET /api/documents/:id/summary
 */
router.get('/:id/summary', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  res.json({
    document_id: doc.id,
    summary: doc.summary,
    document_type: doc.document_type,
    page_count: doc.page_count,
    processed_at: doc.processed_at,
  });
});

/**
 * DELETE /api/documents/:id
 */
router.delete('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  // Clean up disk file if exists
  if (fs.existsSync(doc.storage_path)) {
    fs.unlink(doc.storage_path, () => {});
  }

  // Remove document and cascading records
  inMemoryDb.documents.delete(doc.id);
  inMemoryDb.extractions.delete(doc.id);

  for (const [id, issue] of inMemoryDb.validationIssues.entries()) {
    if (issue.document_id === doc.id) inMemoryDb.validationIssues.delete(id);
  }
  for (const [id, entity] of inMemoryDb.entities.entries()) {
    if (entity.document_id === doc.id) inMemoryDb.entities.delete(id);
  }
  for (const [id, chunk] of inMemoryDb.chunks.entries()) {
    if (chunk.document_id === doc.id) inMemoryDb.chunks.delete(id);
  }
  for (const [id, rev] of inMemoryDb.reviewEvents.entries()) {
    if (rev.document_id === doc.id) inMemoryDb.reviewEvents.delete(id);
  }

  res.json({ message: 'Document and associated intelligence records deleted successfully.' });
});

/**
 * POST /api/documents/:id/reprocess
 */
router.post('/:id/reprocess', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  doc.processing_status = 'queued';
  doc.processing_error = null;
  doc.updated_at = new Date().toISOString();

  // If local file exists, trigger pipeline; else simulate reprocessing with existing extracted_text
  processingPipelineService.processDocument(doc.id, doc.storage_path).catch((err) => {
    console.error(`Reprocessing failed for ${doc.id}:`, err);
  });

  res.json({ message: 'Document queued for reprocessing.', document: doc });
});

/**
 * GET /api/documents/:id/status
 */
router.get('/:id/status', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  res.json({
    id: doc.id,
    processing_status: doc.processing_status,
    review_status: doc.review_status,
    classification_confidence: doc.classification_confidence,
    processing_error: doc.processing_error,
    updated_at: doc.updated_at,
  });
});

export default router;
