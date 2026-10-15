import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';

export const reviewsQueueRouter = Router();
export const documentReviewRouter = Router();

/**
 * GET /api/reviews
 * Retrieve the review queue
 */
reviewsQueueRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  const queue = Array.from(inMemoryDb.documents.values())
    .filter(
      (d) =>
        d.user_id === userId &&
        (d.review_status === 'pending_review' ||
          d.processing_status === 'needs_review' ||
          d.review_status === 'in_review')
    )
    .map((doc) => {
      const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.document_id === doc.id);
      const extraction = inMemoryDb.extractions.get(doc.id);

      return {
        ...doc,
        validation_issues: issues,
        critical_count: issues.filter((i) => i.severity === 'critical').length,
        extracted_fields_summary: extraction?.extracted_data?.fields || {},
      };
    });

  queue.sort((a, b) => b.critical_count - a.critical_count);

  res.json({
    review_queue: queue,
    total_requiring_review: queue.length,
  });
});

const fieldCorrectionSchema = z.object({
  field_path: z.string().min(1),
  new_value: z.any(),
  notes: z.string().optional(),
});

/**
 * PATCH /api/documents/:id/review
 * Save field corrections with immutable audit log preservation
 */
documentReviewRouter.patch('/:id/review', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const { field_path, new_value, notes } = fieldCorrectionSchema.parse(req.body);
  const extraction = inMemoryDb.extractions.get(doc.id);

  if (!extraction) {
    res.status(400).json({ error: 'No structured extraction found for this document to modify.' });
    return;
  }

  // Preserve previous value
  const previousValue = extraction.extracted_data?.fields?.[field_path] ?? null;

  // Apply correction
  if (!extraction.extracted_data.fields) {
    extraction.extracted_data.fields = {};
  }
  extraction.extracted_data.fields[field_path] = new_value;

  // Record append-only review event
  const eventId = uuidv4();
  const event = {
    id: eventId,
    document_id: doc.id,
    user_id: userId,
    event_type: 'field_correction' as const,
    field_path,
    previous_value: previousValue,
    new_value,
    notes: notes || 'Field manually corrected by human reviewer.',
    created_at: new Date().toISOString(),
  };
  inMemoryDb.reviewEvents.set(eventId, event);

  // Update doc status
  doc.review_status = 'in_review';
  doc.updated_at = new Date().toISOString();

  res.json({
    message: `Field "${field_path}" corrected successfully.`,
    corrected_field: field_path,
    new_value,
    audit_event: event,
  });
});

/**
 * POST /api/documents/:id/approve
 */
documentReviewRouter.post('/:id/approve', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const { notes } = req.body;

  doc.review_status = 'approved';
  doc.processing_status = 'completed';
  doc.updated_at = new Date().toISOString();

  // Mark open validation issues as resolved
  for (const issue of inMemoryDb.validationIssues.values()) {
    if (issue.document_id === doc.id && issue.status === 'open') {
      issue.status = 'resolved';
      issue.resolved_at = new Date().toISOString();
    }
  }

  // Record approval event
  const eventId = uuidv4();
  const event = {
    id: eventId,
    document_id: doc.id,
    user_id: userId,
    event_type: 'approved' as const,
    notes: notes || 'Document verified and approved by authorized reviewer.',
    created_at: new Date().toISOString(),
  };
  inMemoryDb.reviewEvents.set(eventId, event);

  res.json({
    message: 'Document successfully approved.',
    document: doc,
    audit_event: event,
  });
});

/**
 * POST /api/documents/:id/reject
 */
documentReviewRouter.post('/:id/reject', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const { reason } = req.body;
  if (!reason || typeof reason !== 'string') {
    res.status(400).json({ error: 'A specific reason is required to reject a document.' });
    return;
  }

  doc.review_status = 'rejected';
  doc.updated_at = new Date().toISOString();

  const eventId = uuidv4();
  const event = {
    id: eventId,
    document_id: doc.id,
    user_id: userId,
    event_type: 'rejected' as const,
    notes: reason,
    created_at: new Date().toISOString(),
  };
  inMemoryDb.reviewEvents.set(eventId, event);

  res.json({
    message: 'Document marked as rejected.',
    document: doc,
    audit_event: event,
  });
});

/**
 * GET /api/documents/:id/audit
 */
documentReviewRouter.get('/:id/audit', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const events = Array.from(inMemoryDb.reviewEvents.values())
    .filter((e) => e.document_id === doc.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    document_id: doc.id,
    document_name: doc.file_name,
    audit_trail: events,
  });
});

export default reviewsQueueRouter;
