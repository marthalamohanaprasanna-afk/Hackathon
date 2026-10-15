import { z } from 'zod';
import { DocumentTypeEnum } from './document.schema.js';

// A. Document Classification Schema
export const ClassificationResultSchema = z.object({
  document_type: DocumentTypeEnum,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  language: z.string().nullable().optional(),
  requires_review: z.boolean().default(false),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// B. Structured Information Extraction Schema
export const ExtractedFieldItemSchema = z.object({
  value: z.any(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().nullable().optional(),
});

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
});

export const StructuredExtractionSchema = z.object({
  document_type: DocumentTypeEnum,
  document_title: z.string().nullable().optional(),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    role: z.string().nullable().optional(),
  })).default([]),
  fields: z.record(z.any()).default({}),
  line_items: z.array(LineItemSchema).default([]),
  dates: z.record(z.string().nullable().optional()).default({}),
  amounts: z.record(z.number().nullable().optional()).default({}),
  obligations: z.array(z.string()).default([]),
  deadlines: z.array(z.object({
    date: z.string(),
    description: z.string(),
  })).default([]),
  evidence: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export type StructuredExtraction = z.infer<typeof StructuredExtractionSchema>;

// C. Document Summary Schema
export const DocumentSummarySchema = z.object({
  summary: z.string(),
  key_points: z.array(z.string()).default([]),
  important_dates: z.array(z.object({
    date: z.string(),
    label: z.string(),
  })).default([]),
  important_amounts: z.array(z.object({
    amount: z.number(),
    currency: z.string().default('USD'),
    label: z.string(),
  })).default([]),
  obligations: z.array(z.string()).default([]),
  potential_issues: z.array(z.string()).default([]),
  recommended_review_actions: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

// D. Validation Findings Schema
export const ValidationFindingSchema = z.object({
  issue_type: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  affected_fields: z.array(z.string()).default([]),
  explanation: z.string(),
  evidence: z.record(z.any()).default({}),
  suggested_action: z.string(),
  requires_human_review: z.boolean().default(false),
});

export const ValidationAnalysisSchema = z.object({
  findings: z.array(ValidationFindingSchema).default([]),
});

export type ValidationAnalysis = z.infer<typeof ValidationAnalysisSchema>;

// E. Cross-Document Knowledge Discovery Schema
export const CrossDocumentDiscoverySchema = z.object({
  entities: z.array(z.object({
    type: z.string(),
    normalized_value: z.string(),
    display_value: z.string(),
    document_ids: z.array(z.string()).default([]),
  })).default([]),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    relationship_type: z.string(),
    confidence: z.number().min(0).max(1).default(1),
    evidence: z.string().nullable().optional(),
  })).default([]),
  discrepancies: z.array(z.object({
    type: z.string(),
    description: z.string(),
    affected_document_ids: z.array(z.string()).default([]),
    severity: z.enum(['critical', 'warning', 'info']).default('warning'),
    suggested_action: z.string(),
  })).default([]),
  patterns: z.array(z.string()).default([]),
  upcoming_deadlines: z.array(z.object({
    date: z.string(),
    document_id: z.string().optional(),
    document_name: z.string().optional(),
    description: z.string(),
  })).default([]),
  insights: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.95),
});

export type CrossDocumentDiscovery = z.infer<typeof CrossDocumentDiscoverySchema>;

// F. Document Question Answering Schema
export const CitationSchema = z.object({
  document_id: z.string(),
  document_name: z.string(),
  page: z.number().nullable().optional(),
  excerpt: z.string(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const QuestionAnsweringResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema).default([]),
  supporting_facts: z.array(z.string()).default([]),
  limitations: z.string().nullable().optional(),
  requires_review: z.boolean().default(false),
});

export type QuestionAnsweringResponse = z.infer<typeof QuestionAnsweringResponseSchema>;
