export type DocumentType =
  | 'invoice'
  | 'purchase_order'
  | 'receipt'
  | 'contract'
  | 'application_form'
  | 'certificate'
  | 'financial_report'
  | 'business_report'
  | 'policy_document'
  | 'legal_document'
  | 'other_unknown';

export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'validating'
  | 'completed'
  | 'needs_review'
  | 'failed';

export type ReviewStatus =
  | 'not_required'
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected';

export type Severity = 'critical' | 'warning' | 'info';

export interface ValidationIssue {
  id?: string;
  document_id: string;
  issue_type: string;
  severity: Severity;
  field_path?: string | null;
  message: string;
  evidence: Record<string, any>;
  suggested_action?: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  created_at?: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  file_hash: string;
  document_type: DocumentType;
  language?: string | null;
  processing_status: ProcessingStatus;
  review_status: ReviewStatus;
  classification_confidence?: number | null;
  page_count?: number | null;
  extracted_text?: string | null;
  summary?: string | null;
  processing_error?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  validation_issues_count?: number;
  critical_issues_count?: number;
}

export interface LineItem {
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  total?: number | null;
}

export interface StructuredExtraction {
  document_type: DocumentType;
  document_title?: string | null;
  entities: Array<{ type: string; value: string; role?: string | null }>;
  fields: Record<string, any>;
  line_items: LineItem[];
  dates: Record<string, string | null>;
  amounts: Record<string, number | null>;
  obligations: string[];
  deadlines: Array<{ date: string; description: string }>;
  evidence: string[];
  uncertainties: string[];
}

export interface ReviewEvent {
  id: string;
  document_id: string;
  user_id: string;
  event_type: 'field_correction' | 'approved' | 'rejected' | 'returned_for_review';
  field_path?: string | null;
  previous_value?: any;
  new_value?: any;
  notes?: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  document_id: string;
  document_name: string;
  page?: number | null;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  document_id: string;
  document_name?: string;
  evidence?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  confidence?: number;
}

export interface DashboardMetrics {
  kpis: {
    total_uploaded: number;
    completed: number;
    awaiting_review: number;
    failed: number;
    open_issues: number;
  };
  category_distribution: Array<{ name: string; count: number; raw_type: string }>;
  severity_distribution: { critical: number; warning: number; info: number };
  status_distribution: Array<{ status: string; count: number }>;
  upcoming_deadlines: Array<{
    id: string;
    date: string;
    document_name: string;
    description: string;
    document_id: string;
  }>;
  recent_activity: Array<{
    id: string;
    file_name: string;
    document_type: string;
    processing_status: string;
    review_status: string;
    created_at: string;
  }>;
}

export interface InsightsOverview {
  summary: {
    total_documents: number;
    total_invoiced_usd: number;
    total_po_authorized_usd: number;
    variance_usd: number;
    active_organizations: string[];
    open_discrepancies_count: number;
    critical_issues_count: number;
  };
  discrepancies: ValidationIssue[];
  upcoming_deadlines: Array<{
    date: string;
    document_id: string;
    document_name: string;
    description: string;
  }>;
  recurring_patterns: string[];
}
