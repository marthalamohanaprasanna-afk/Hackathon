import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config/index.js';
import { DocumentRecord, ValidationIssue, DocumentEntity, EntityRelationship } from '../schemas/document.schema.js';
import { StructuredExtraction } from '../schemas/ai.schema.js';
import { DocumentChunk } from '../services/retrieval/retrieval.service.js';

// Default demo user ID
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface ChatSessionRecord {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: any[];
  created_at: string;
}

export interface ReviewEventRecord {
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

// In-Memory store fallback for immediate local testing and seed data
class InMemoryDatabase {
  public profiles: Map<string, { id: string; display_name: string; created_at: string }> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public extractions: Map<string, { id: string; document_id: string; user_id: string; schema_version: string; extracted_data: StructuredExtraction; field_confidence: any; model_name: string; created_at: string }> = new Map();
  public chunks: Map<string, DocumentChunk> = new Map();
  public validationIssues: Map<string, ValidationIssue> = new Map();
  public entities: Map<string, DocumentEntity> = new Map();
  public relationships: Map<string, EntityRelationship> = new Map();
  public reviewEvents: Map<string, ReviewEventRecord> = new Map();
  public chatSessions: Map<string, ChatSessionRecord> = new Map();
  public chatMessages: Map<string, ChatMessageRecord> = new Map();

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData() {
    // 1. Profile
    this.profiles.set(DEMO_USER_ID, {
      id: DEMO_USER_ID,
      display_name: 'Sarah Jenkins (Chief Procurement Officer)',
      created_at: new Date().toISOString(),
    });

    // 2. Sample Invoices & POs
    const docInvId = '11111111-1111-1111-1111-111111111111';
    const docPoId = '22222222-2222-2222-2222-222222222222';
    const docCntrId = '33333333-3333-3333-3333-333333333333';
    const docRcptId = '44444444-4444-4444-4444-444444444444';
    const docRepId = '55555555-5555-5555-5555-555555555555';

    this.documents.set(docInvId, {
      id: docInvId,
      user_id: DEMO_USER_ID,
      file_name: 'Invoice_INV-2024-8841_AcmeTech.pdf',
      storage_path: `${DEMO_USER_ID}/Invoice_INV-2024-8841_AcmeTech.pdf`,
      mime_type: 'application/pdf',
      file_size: 142850,
      file_hash: 'hash_inv_8841_demo_sha256',
      document_type: 'invoice',
      language: 'en',
      processing_status: 'completed',
      review_status: 'approved',
      classification_confidence: 0.98,
      page_count: 2,
      summary: 'Commercial invoice from Acme Technologies Inc. to Nexus Global Logistics for Cloud Infrastructure and Data Engineering consulting services. Total amount due is $45,850.00 payable within net 30 days (due November 15, 2024).',
      extracted_text: `ACME TECHNOLOGIES INC.\n100 Silicon Way, San Jose, CA 95112\n\nINVOICE\nInvoice Number: INV-2024-8841\nDate: October 15, 2024\nDue Date: November 15, 2024\nPO Reference: PO-99420\n\nBilled To:\nNexus Global Logistics\n450 Harbor Boulevard, Seattle, WA 98101\n\nLine Items:\n1. Cloud Migration Consulting Services (120 hrs @ $250/hr): $30,000.00\n2. High-Availability Kubernetes Architecture (50 hrs @ $230/hr): $11,500.00\n\nSubtotal: $41,500.00\nTax (8.0%): $3,320.00\nHandling / Surcharge: $1,030.00\nTotal Due: $45,850.00\nPayment Terms: Net 30 days via Wire Transfer`,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    this.documents.set(docPoId, {
      id: docPoId,
      user_id: DEMO_USER_ID,
      file_name: 'PurchaseOrder_PO-99420_Nexus.pdf',
      storage_path: `${DEMO_USER_ID}/PurchaseOrder_PO-99420_Nexus.pdf`,
      mime_type: 'application/pdf',
      file_size: 98400,
      file_hash: 'hash_po_99420_demo_sha256',
      document_type: 'purchase_order',
      language: 'en',
      processing_status: 'needs_review',
      review_status: 'pending_review',
      classification_confidence: 0.96,
      page_count: 1,
      summary: 'Authorized purchase order issued by Nexus Global Logistics to Acme Technologies Inc. for Enterprise Cloud Modernization. Authorized ceiling total is $42,000.00.',
      extracted_text: `PURCHASE ORDER\nNexus Global Logistics\nPO Number: PO-99420\nDate: October 01, 2024\nVendor: Acme Technologies Inc.\n\nApproved Scope:\n1. Cloud Infrastructure & Migration Consulting: $42,000.00 Cap\n\nTotal Authorized Amount: $42,000.00\nAuthorized By: Sarah Jenkins\nNote: Invoices exceeding authorized purchase order cap require written change-order approval.`,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    this.documents.set(docCntrId, {
      id: docCntrId,
      user_id: DEMO_USER_ID,
      file_name: 'Master_Services_Agreement_Acme_Nexus.pdf',
      storage_path: `${DEMO_USER_ID}/Master_Services_Agreement_Acme_Nexus.pdf`,
      mime_type: 'application/pdf',
      file_size: 312000,
      file_hash: 'hash_contract_demo_sha256',
      document_type: 'contract',
      language: 'en',
      processing_status: 'completed',
      review_status: 'approved',
      classification_confidence: 0.99,
      page_count: 8,
      summary: 'Master Services Agreement executed between Nexus Global Logistics and Acme Technologies Inc. Effective January 1, 2024 with 2-year duration and automatic 12-month renewal unless 60 days advance written termination notice is given.',
      extracted_text: `MASTER SERVICES AGREEMENT\nEffective Date: January 1, 2024\nParties: Nexus Global Logistics ("Client") and Acme Technologies Inc. ("Provider")\nGoverning Law: State of Washington\n\nKey Obligations:\n1. Provider shall maintain 99.9% uptime for managed services.\n2. Invoices shall be payable within Net 30 days.\n3. Renewal: Automatically renews on December 31, 2025 unless notice provided by November 1, 2025.`,
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    this.documents.set(docRcptId, {
      id: docRcptId,
      user_id: DEMO_USER_ID,
      file_name: 'Receipt_GrandHyatt_Oct2024.jpg',
      storage_path: `${DEMO_USER_ID}/Receipt_GrandHyatt_Oct2024.jpg`,
      mime_type: 'image/jpeg',
      file_size: 241000,
      file_hash: 'hash_receipt_demo_sha256',
      document_type: 'receipt',
      language: 'en',
      processing_status: 'needs_review',
      review_status: 'pending_review',
      classification_confidence: 0.94,
      page_count: 1,
      summary: 'Hotel stay receipt at Grand Hyatt Seattle for business conference. Total charged is $1,142.50. Discrepancy detected in state lodging tax calculation.',
      extracted_text: `GRAND HYATT SEATTLE\n721 Pine Street, Seattle, WA 98101\nGuest: Sarah Jenkins\nRoom Charges (3 nights): $840.00\nRoom Service Dining: $195.00\nValet Parking: $90.00\nSubtotal: $1,125.00\nLodging Tax (15.6%): $17.50\nTotal Charged: $1,142.50`,
      created_at: new Date(Date.now() - 18000000).toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    this.documents.set(docRepId, {
      id: docRepId,
      user_id: DEMO_USER_ID,
      file_name: 'Q3_2024_Financial_Operations_Report.pdf',
      storage_path: `${DEMO_USER_ID}/Q3_2024_Financial_Operations_Report.pdf`,
      mime_type: 'application/pdf',
      file_size: 540000,
      file_hash: 'hash_report_demo_sha256',
      document_type: 'financial_report',
      language: 'en',
      processing_status: 'completed',
      review_status: 'approved',
      classification_confidence: 0.97,
      page_count: 14,
      summary: 'Comprehensive Q3 2024 enterprise performance report detailing 24% YoY revenue growth, logistics cost optimizations, and key capital expenditure milestones.',
      extracted_text: `EXECUTIVE FINANCIAL REPORT - Q3 2024\nNexus Global Logistics\nNet Revenue: $18.4M (+24% YoY)\nOperating Margin: 18.2%\nTechnology & Cloud Modernization Spend: $1.2M`,
      created_at: new Date(Date.now() - 345600000).toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    // Extractions
    this.extractions.set(docInvId, {
      id: 'ext-inv-1',
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      schema_version: '1.0.0',
      model_name: 'gemini-2.5-flash',
      extracted_data: {
        document_type: 'invoice',
        document_title: 'Commercial Consulting Invoice',
        entities: [
          { type: 'organization', value: 'Acme Technologies Inc.', role: 'supplier' },
          { type: 'organization', value: 'Nexus Global Logistics', role: 'customer' },
        ],
        fields: {
          invoice_number: 'INV-2024-8841',
          supplier: 'Acme Technologies Inc.',
          customer: 'Nexus Global Logistics',
          invoice_date: '2024-10-15',
          due_date: '2024-11-15',
          currency: 'USD',
          subtotal: 41500.0,
          tax: 3320.0,
          surcharge: 1030.0,
          total_amount: 45850.0,
          purchase_order_ref: 'PO-99420',
          payment_terms: 'Net 30 days',
        },
        line_items: [
          { description: 'Cloud Migration Consulting Services', quantity: 120, unit_price: 250, total: 30000 },
          { description: 'High-Availability Kubernetes Architecture', quantity: 50, unit_price: 230, total: 11500 },
        ],
        dates: { invoice_date: '2024-10-15', due_date: '2024-11-15' },
        amounts: { subtotal: 41500.0, tax: 3320.0, surcharge: 1030.0, total_amount: 45850.0 },
        obligations: ['Payment terms Net 30 days via wire transfer.'],
        deadlines: [{ date: '2024-11-15', description: 'Payment Due Date' }],
        evidence: ['ACME TECHNOLOGIES INC. | INVOICE INV-2024-8841'],
        uncertainties: [],
      },
      field_confidence: { invoice_number: 0.99, supplier: 0.98, total_amount: 0.99, due_date: 0.97 },
      created_at: new Date().toISOString(),
    });

    this.extractions.set(docPoId, {
      id: 'ext-po-1',
      document_id: docPoId,
      user_id: DEMO_USER_ID,
      schema_version: '1.0.0',
      model_name: 'gemini-2.5-flash',
      extracted_data: {
        document_type: 'purchase_order',
        document_title: 'Enterprise Cloud Modernization Purchase Order',
        entities: [
          { type: 'organization', value: 'Nexus Global Logistics', role: 'buyer' },
          { type: 'organization', value: 'Acme Technologies Inc.', role: 'supplier' },
        ],
        fields: {
          order_number: 'PO-99420',
          buyer: 'Nexus Global Logistics',
          supplier: 'Acme Technologies Inc.',
          order_date: '2024-10-01',
          total_amount: 42000.0,
          authorized_ceiling: 42000.0,
          authorized_by: 'Sarah Jenkins',
          currency: 'USD',
        },
        line_items: [{ description: 'Cloud Infrastructure Modernization Consulting', total: 42000 }],
        dates: { order_date: '2024-10-01' },
        amounts: { total_amount: 42000.0, authorized_ceiling: 42000.0 },
        obligations: ['Invoices exceeding $42,000 require written change-order approval.'],
        deadlines: [],
        evidence: ['PURCHASE ORDER PO-99420'],
        uncertainties: [],
      },
      field_confidence: { order_number: 0.99, supplier: 0.97, total_amount: 0.98 },
      created_at: new Date().toISOString(),
    });

    // Validation Issues
    this.validationIssues.set('val-iss-1', {
      id: 'val-iss-1',
      document_id: docPoId,
      user_id: DEMO_USER_ID,
      issue_type: 'cross_document_amount_mismatch',
      severity: 'critical',
      field_path: 'total_amount',
      message: 'Cross-Document Discrepancy: Invoice INV-2024-8841 claims $45,850.00, which exceeds authorized Purchase Order PO-99420 cap of $42,000.00 by $3,850.00.',
      evidence: { invoice_id: docInvId, invoice_no: 'INV-2024-8841', invoice_amount: 45850.0, po_cap: 42000.0, difference: 3850.0 },
      suggested_action: 'Request vendor justification or execute approved change order before authorizing payout.',
      status: 'open',
      created_at: new Date().toISOString(),
    });

    this.validationIssues.set('val-iss-2', {
      id: 'val-iss-2',
      document_id: docRcptId,
      user_id: DEMO_USER_ID,
      issue_type: 'arithmetic_inconsistency',
      severity: 'warning',
      field_path: 'tax_amount',
      message: 'Arithmetic Inconsistency: Extracted lodging tax of $17.50 does not match stated rate of 15.6% on eligible subtotal ($1,125.00), which yields approximately $175.50.',
      evidence: { subtotal: 1125.0, extracted_tax: 17.5, expected_tax: 175.5, total: 1142.5 },
      suggested_action: 'Review original receipt image to confirm handwritten or printed itemization details.',
      status: 'open',
      created_at: new Date().toISOString(),
    });

    this.validationIssues.set('val-iss-3', {
      id: 'val-iss-3',
      document_id: docCntrId,
      user_id: DEMO_USER_ID,
      issue_type: 'obligation_deadline',
      severity: 'info',
      field_path: 'renewal_terms',
      message: 'Contract Milestone: 60-day written non-renewal notice deadline occurs on November 1, 2025 prior to auto-renewal.',
      evidence: { effective_date: '2024-01-01', expiration_date: '2025-12-31', notice_window_days: 60 },
      suggested_action: 'Calendar reminder scheduled for legal & procurement review.',
      status: 'open',
      created_at: new Date().toISOString(),
    });

    // Entities & Relationships for Knowledge Graph
    const entAcmeId = 'ent-acme-1';
    const entNexusId = 'ent-nexus-1';
    const entInvId = 'ent-inv-1';
    const entPoId = 'ent-po-1';
    const entAmountId = 'ent-amt-1';
    const entDateId = 'ent-date-1';

    this.entities.set(entAcmeId, {
      id: entAcmeId,
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      entity_type: 'organization',
      normalized_value: 'acme_technologies_inc',
      display_value: 'Acme Technologies Inc.',
      evidence: { role: 'Cloud & Infrastructure Provider' },
    });
    this.entities.set(entNexusId, {
      id: entNexusId,
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      entity_type: 'organization',
      normalized_value: 'nexus_global_logistics',
      display_value: 'Nexus Global Logistics',
      evidence: { role: 'Enterprise Client' },
    });
    this.entities.set(entInvId, {
      id: entInvId,
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      entity_type: 'invoice_number',
      normalized_value: 'inv_2024_8841',
      display_value: 'INV-2024-8841',
      evidence: { amount: '$45,850.00 USD' },
    });
    this.entities.set(entPoId, {
      id: entPoId,
      document_id: docPoId,
      user_id: DEMO_USER_ID,
      entity_type: 'purchase_order',
      normalized_value: 'po_99420',
      display_value: 'PO-99420',
      evidence: { amount_cap: '$42,000.00 USD' },
    });
    this.entities.set(entAmountId, {
      id: entAmountId,
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      entity_type: 'monetary_amount',
      normalized_value: 'usd_45850_00',
      display_value: '$45,850.00 USD',
      evidence: { type: 'Billed Total' },
    });
    this.entities.set(entDateId, {
      id: entDateId,
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      entity_type: 'deadline',
      normalized_value: 'date_2024_11_15',
      display_value: 'Nov 15, 2024',
      evidence: { type: 'Payment Due Date' },
    });

    this.relationships.set('rel-1', {
      id: 'rel-1',
      user_id: DEMO_USER_ID,
      source_entity_id: entAcmeId,
      target_entity_id: entInvId,
      relationship_type: 'issued_document',
      confidence: 0.99,
      evidence: { source: 'Invoice Header' },
    });
    this.relationships.set('rel-2', {
      id: 'rel-2',
      user_id: DEMO_USER_ID,
      source_entity_id: entInvId,
      target_entity_id: entNexusId,
      relationship_type: 'billed_to',
      confidence: 0.98,
      evidence: { source: 'Invoice Recipient' },
    });
    this.relationships.set('rel-3', {
      id: 'rel-3',
      user_id: DEMO_USER_ID,
      source_entity_id: entInvId,
      target_entity_id: entPoId,
      relationship_type: 'references_po',
      confidence: 0.97,
      evidence: { source: 'PO Reference Field' },
    });
    this.relationships.set('rel-4', {
      id: 'rel-4',
      user_id: DEMO_USER_ID,
      source_entity_id: entNexusId,
      target_entity_id: entPoId,
      relationship_type: 'authorized_purchase_order',
      confidence: 0.99,
      evidence: { source: 'PO Signature' },
    });
    this.relationships.set('rel-5', {
      id: 'rel-5',
      user_id: DEMO_USER_ID,
      source_entity_id: entInvId,
      target_entity_id: entAmountId,
      relationship_type: 'has_financial_value',
      confidence: 1.0,
      evidence: {},
    });
    this.relationships.set('rel-6', {
      id: 'rel-6',
      user_id: DEMO_USER_ID,
      source_entity_id: entInvId,
      target_entity_id: entDateId,
      relationship_type: 'payment_due_by',
      confidence: 0.98,
      evidence: {},
    });

    // Review Event
    this.reviewEvents.set('rev-1', {
      id: 'rev-1',
      document_id: docInvId,
      user_id: DEMO_USER_ID,
      event_type: 'field_correction',
      field_path: 'surcharge',
      previous_value: '0.00',
      new_value: '1030.00',
      notes: 'Corrected fuel and infrastructure surcharge from itemization breakdown.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    });

    // Chat Session
    const demoChatId = 'chat-sess-1';
    this.chatSessions.set(demoChatId, {
      id: demoChatId,
      user_id: DEMO_USER_ID,
      title: 'Invoice & PO Cap Verification',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.chatMessages.set('msg-1', {
      id: 'msg-1',
      session_id: demoChatId,
      user_id: DEMO_USER_ID,
      role: 'user',
      content: 'What is the payment due date for the Acme Technologies invoice, and does it match our purchase order?',
      citations: [],
      created_at: new Date(Date.now() - 60000).toISOString(),
    });

    this.chatMessages.set('msg-2', {
      id: 'msg-2',
      session_id: demoChatId,
      user_id: DEMO_USER_ID,
      role: 'assistant',
      content: `Based on your uploaded documents:

1. **Invoice Due Date**: The invoice **INV-2024-8841** from Acme Technologies Inc. is dated October 15, 2024, with payment due on **November 15, 2024** (Net 30 terms).
2. **Purchase Order Discrepancy**: The invoice references Purchase Order **PO-99420**, but there is an active discrepancy. The invoice total is **$45,850.00**, whereas PO-99420 specifies an authorized expenditure cap of **$42,000.00**. This exceeds the approved ceiling by **$3,850.00**.

Recommended action: Review the additional $3,850.00 with procurement before releasing payment.`,
      citations: [
        {
          document_id: docInvId,
          document_name: 'Invoice_INV-2024-8841_AcmeTech.pdf',
          page: 1,
          excerpt: 'Invoice Number: INV-2024-8841 | Date: October 15, 2024 | Due Date: November 15, 2024 | Total Due: $45,850.00',
        },
        {
          document_id: docPoId,
          document_name: 'PurchaseOrder_PO-99420_Nexus.pdf',
          page: 1,
          excerpt: 'PO Number: PO-99420 | Total Authorized Amount: $42,000.00',
        },
      ],
      created_at: new Date().toISOString(),
    });
  }
}

export const inMemoryDb = new InMemoryDatabase();

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY
  );
}

export const supabase = supabaseClient;
