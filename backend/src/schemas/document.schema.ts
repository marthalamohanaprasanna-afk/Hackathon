import { z } from 'zod';

export const DocumentTypeEnum = z.enum([
  'invoice',
  'purchase_order',
  'receipt',
  'contract',
  'application_form',
  'certificate',
  'financial_report',
  'business_report',
  'policy_document',
  'legal_document',
  'other_unknown'
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const ProcessingStatusEnum = z.enum([
  'uploaded',
  'queued',
  'extracting',
  'validating',
  'completed',
  'needs_review',
  'failed'
]);

export type ProcessingStatus = z.infer<typeof ProcessingStatusEnum>;

export const ReviewStatusEnum = z.enum([
  'not_required',
  'pending_review',
  'in_review',
  'approved',
  'rejected'
]);

export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

export const SeverityEnum = z.enum(['critical', 'warning', 'info']);
export type Severity = z.infer<typeof SeverityEnum>;

export const ValidationIssueSchema = z.object({
  id: z.string().uuid().optional(),
  document_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  issue_type: z.string(),
  severity: SeverityEnum,
  field_path: z.string().nullable().optional(),
  message: z.string(),
  evidence: z.record(z.any()).default({}),
  suggested_action: z.string().nullable().optional(),
  status: z.enum(['open', 'acknowledged', 'resolved', 'ignored']).default('open'),
  created_at: z.string().optional(),
  resolved_at: z.string().nullable().optional(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const DocumentEntitySchema = z.object({
  id: z.string().uuid().optional(),
  document_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  entity_type: z.string(),
  normalized_value: z.string(),
  display_value: z.string(),
  evidence: z.record(z.any()).default({}),
  created_at: z.string().optional(),
});

export type DocumentEntity = z.infer<typeof DocumentEntitySchema>;

export const EntityRelationshipSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  source_entity_id: z.string().uuid(),
  target_entity_id: z.string().uuid(),
  relationship_type: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.record(z.any()).optional().default({}),
  created_at: z.string().optional(),
});

export type EntityRelationship = z.infer<typeof EntityRelationshipSchema>;

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  file_name: z.string(),
  storage_path: z.string(),
  mime_type: z.string(),
  file_size: z.number().positive(),
  file_hash: z.string(),
  document_type: DocumentTypeEnum.default('other_unknown'),
  language: z.string().nullable().optional(),
  processing_status: ProcessingStatusEnum.default('uploaded'),
  review_status: ReviewStatusEnum.default('not_required'),
  classification_confidence: z.number().min(0).max(1).nullable().optional(),
  page_count: z.number().int().positive().nullable().optional(),
  extracted_text: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  processing_error: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  processed_at: z.string().nullable().optional(),
});

export type DocumentRecord = z.infer<typeof DocumentSchema>;
