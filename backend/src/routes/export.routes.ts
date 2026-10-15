import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';

const router = Router();

/**
 * GET /api/exports/documents.csv
 * Export authorized documents and extracted metadata as CSV
 */
router.get('/documents.csv', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const docs = Array.from(inMemoryDb.documents.values()).filter((d) => d.user_id === userId);

  const headers = [
    'Document ID',
    'File Name',
    'Document Type',
    'Processing Status',
    'Review Status',
    'Confidence',
    'Page Count',
    'Total Amount (USD)',
    'Supplier / Vendor',
    'Customer / Buyer',
    'Due / Expiration Date',
    'Created At',
  ];

  const rows = docs.map((d) => {
    const ext = inMemoryDb.extractions.get(d.id)?.extracted_data;
    const fields = ext?.fields || {};
    const totalAmount = fields.total_amount || fields.total || fields.authorized_ceiling || '';
    const supplier = fields.supplier || fields.vendor || fields.merchant || '';
    const customer = fields.customer || fields.buyer || '';
    const dueDate = fields.due_date || fields.expiration_date || '';

    return [
      `"${d.id}"`,
      `"${d.file_name.replace(/"/g, '""')}"`,
      `"${d.document_type}"`,
      `"${d.processing_status}"`,
      `"${d.review_status}"`,
      d.classification_confidence ? (d.classification_confidence * 100).toFixed(1) + '%' : 'N/A',
      d.page_count || 1,
      totalAmount ? `"${totalAmount}"` : '""',
      `"${String(supplier).replace(/"/g, '""')}"`,
      `"${String(customer).replace(/"/g, '""')}"`,
      `"${dueDate}"`,
      `"${d.created_at}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="documind_documents_export.csv"');
  res.send(csvContent);
});

/**
 * GET /api/exports/documents.json
 * Full structured JSON export of authorized workspace
 */
router.get('/documents.json', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const docs = Array.from(inMemoryDb.documents.values()).filter((d) => d.user_id === userId);

  const exportData = docs.map((doc) => {
    const extraction = inMemoryDb.extractions.get(doc.id);
    const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.document_id === doc.id);
    const reviewHistory = Array.from(inMemoryDb.reviewEvents.values()).filter((r) => r.document_id === doc.id);

    return {
      document_id: doc.id,
      file_name: doc.file_name,
      document_type: doc.document_type,
      processing_status: doc.processing_status,
      review_status: doc.review_status,
      classification_confidence: doc.classification_confidence,
      page_count: doc.page_count,
      summary: doc.summary,
      extracted_data: extraction?.extracted_data || null,
      validation_issues: issues,
      audit_review_history: reviewHistory,
      created_at: doc.created_at,
      processed_at: doc.processed_at,
    };
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="documind_workspace_export.json"');
  res.json({
    export_metadata: {
      generated_at: new Date().toISOString(),
      user_id: userId,
      total_records: exportData.length,
    },
    documents: exportData,
  });
});

/**
 * GET /api/exports/documents/:id/report
 * Generate detailed document processing report
 */
router.get('/documents/:id/report', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const doc = inMemoryDb.documents.get(req.params.id);

  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: 'Document not found or unauthorized.' });
    return;
  }

  const extraction = inMemoryDb.extractions.get(doc.id);
  const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.document_id === doc.id);
  const reviews = Array.from(inMemoryDb.reviewEvents.values()).filter((r) => r.document_id === doc.id);

  const report = {
    title: `DocuMind Processing Report: ${doc.file_name}`,
    generated_at: new Date().toISOString(),
    document_summary: {
      id: doc.id,
      file_name: doc.file_name,
      type: doc.document_type,
      status: doc.processing_status,
      review_status: doc.review_status,
      confidence: doc.classification_confidence,
      page_count: doc.page_count,
      executive_summary: doc.summary,
    },
    extracted_fields: extraction?.extracted_data?.fields || {},
    itemized_lines: extraction?.extracted_data?.line_items || [],
    validation_discrepancies: issues.map((i) => ({
      type: i.issue_type,
      severity: i.severity,
      field: i.field_path,
      message: i.message,
      suggested_action: i.suggested_action,
      status: i.status,
    })),
    audit_events: reviews,
  };

  res.json({ report });
});

export default router;
