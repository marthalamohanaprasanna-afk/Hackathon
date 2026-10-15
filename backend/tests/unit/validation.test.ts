import { describe, it, expect } from 'vitest';
import { validationEngineService } from '../../src/services/validation/validation.service.js';

describe('ValidationEngineService', () => {
  it('detects missing required fields in invoice', () => {
    const issues = validationEngineService.validate({
      documentId: 'doc-1',
      userId: 'user-1',
      documentType: 'invoice',
      extractedData: {
        document_type: 'invoice',
        fields: {
          // invoice_number and supplier are missing
          total_amount: 1500,
        },
        entities: [],
        line_items: [],
        dates: {},
        amounts: {},
        obligations: [],
        deadlines: [],
        evidence: [],
        uncertainties: [],
      },
      classificationConfidence: 0.95,
    });

    const missingFields = issues.filter((i) => i.issue_type === 'missing_required_field');
    expect(missingFields.length).toBeGreaterThanOrEqual(2);
    expect(missingFields.some((i) => i.field_path === 'invoice_number')).toBe(true);
    expect(missingFields.some((i) => i.field_path === 'supplier')).toBe(true);
  });

  it('detects arithmetic inconsistencies when subtotal + tax != total', () => {
    const issues = validationEngineService.validate({
      documentId: 'doc-2',
      userId: 'user-1',
      documentType: 'invoice',
      extractedData: {
        document_type: 'invoice',
        fields: {
          invoice_number: 'INV-100',
          supplier: 'Acme',
          subtotal: 1000,
          tax: 100,
          surcharge: 0,
          total_amount: 1250, // Should be 1100, 1250 is an inconsistency
        },
        entities: [],
        line_items: [{ description: 'Dev hours', total: 1000 }],
        dates: {},
        amounts: {},
        obligations: [],
        deadlines: [],
        evidence: [],
        uncertainties: [],
      },
      classificationConfidence: 0.98,
    });

    const arithmeticIssue = issues.find((i) => i.issue_type === 'arithmetic_total_inconsistency');
    expect(arithmeticIssue).toBeDefined();
    expect(arithmeticIssue?.severity).toBe('critical');
  });

  it('detects inverted date relationships when due date precedes issue date', () => {
    const issues = validationEngineService.validate({
      documentId: 'doc-3',
      userId: 'user-1',
      documentType: 'invoice',
      extractedData: {
        document_type: 'invoice',
        fields: {
          invoice_number: 'INV-200',
          supplier: 'Acme',
          total_amount: 500,
          invoice_date: '2024-11-20',
          due_date: '2024-10-01', // Due date is before invoice date!
        },
        entities: [],
        line_items: [],
        dates: {},
        amounts: {},
        obligations: [],
        deadlines: [],
        evidence: [],
        uncertainties: [],
      },
      classificationConfidence: 0.95,
    });

    const dateIssue = issues.find((i) => i.issue_type === 'invalid_date_relationship');
    expect(dateIssue).toBeDefined();
    expect(dateIssue?.severity).toBe('critical');
  });

  it('detects cross-document variance when Invoice exceeds Purchase Order cap', () => {
    const issues = validationEngineService.validate({
      documentId: 'doc-inv',
      userId: 'user-1',
      documentType: 'invoice',
      extractedData: {
        document_type: 'invoice',
        fields: {
          invoice_number: 'INV-8841',
          supplier: 'Acme Technologies',
          purchase_order_ref: 'PO-99420',
          total_amount: 45850.0,
        },
        entities: [],
        line_items: [],
        dates: {},
        amounts: {},
        obligations: [],
        deadlines: [],
        evidence: [],
        uncertainties: [],
      },
      classificationConfidence: 0.98,
      existingDocuments: [
        {
          id: 'doc-po',
          fileName: 'PO-99420_Nexus.pdf',
          type: 'purchase_order',
          extractedData: {
            fields: {
              order_number: 'PO-99420',
              total_amount: 42000.0,
              authorized_ceiling: 42000.0,
            },
          },
        },
      ],
    });

    const crossDocIssue = issues.find((i) => i.issue_type === 'cross_document_amount_mismatch');
    expect(crossDocIssue).toBeDefined();
    expect(crossDocIssue?.severity).toBe('critical');
    expect(crossDocIssue?.evidence?.variance).toBe(3850.0);
  });
});
