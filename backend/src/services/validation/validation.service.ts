import { ValidationIssue } from '../../schemas/document.schema.js';
import { StructuredExtraction } from '../../schemas/ai.schema.js';

export interface ValidationContext {
  documentId: string;
  userId: string;
  documentType: string;
  extractedData: StructuredExtraction;
  classificationConfidence?: number | null;
  existingDocuments?: Array<{
    id: string;
    fileName: string;
    type: string;
    extractedData: any;
  }>;
}

export class ValidationEngineService {
  /**
   * Run full deterministic validation suite against a document extraction
   */
  public validate(context: ValidationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { documentId, userId, documentType, extractedData, classificationConfidence, existingDocuments = [] } = context;
    const fields = extractedData.fields || {};

    // 1. Classification Confidence Check
    if (classificationConfidence !== null && classificationConfidence !== undefined && classificationConfidence < 0.80) {
      issues.push({
        document_id: documentId,
        user_id: userId,
        issue_type: 'low_classification_confidence',
        severity: 'warning',
        field_path: 'document_type',
        message: `Low classification confidence (${(classificationConfidence * 100).toFixed(1)}%). Requires manual verification.`,
        evidence: { confidence: classificationConfidence, predicted_type: documentType },
        suggested_action: 'Verify or re-categorize the document type in the review queue.',
        status: 'open',
      });
    }

    // 2. Required Fields Check by Document Category
    this.validateRequiredFields(documentId, userId, documentType, fields, issues);

    // 3. Arithmetic Consistency Check (Invoices & Receipts)
    this.validateArithmetic(documentId, userId, documentType, fields, extractedData, issues);

    // 4. Date Logic & Timeline Validation
    this.validateDates(documentId, userId, fields, extractedData, issues);

    // 5. Cross-Document Verification (e.g. Invoices matching POs)
    this.validateCrossDocument(documentId, userId, documentType, fields, existingDocuments, issues);

    return issues;
  }

  private validateRequiredFields(
    documentId: string,
    userId: string,
    type: string,
    fields: Record<string, any>,
    issues: ValidationIssue[]
  ) {
    const requiredMap: Record<string, string[]> = {
      invoice: ['invoice_number', 'supplier', 'total_amount'],
      purchase_order: ['order_number', 'buyer', 'total_amount'],
      receipt: ['merchant', 'total_amount'],
      contract: ['parties', 'effective_date'],
      application_form: ['applicant_name', 'tax_id'],
    };

    const required = requiredMap[type] || [];
    for (const field of required) {
      const val = fields[field];
      if (val === undefined || val === null || val === '' || String(val).includes('MISSING')) {
        issues.push({
          document_id: documentId,
          user_id: userId,
          issue_type: 'missing_required_field',
          severity: 'critical',
          field_path: field,
          message: `Mandatory required field "${field.replace('_', ' ')}" is missing or unreadable.`,
          evidence: { required_field: field, current_value: val ?? null },
          suggested_action: `Enter the missing ${field.replace('_', ' ')} value in the manual review editor.`,
          status: 'open',
        });
      }
    }
  }

  private validateArithmetic(
    documentId: string,
    userId: string,
    type: string,
    fields: Record<string, any>,
    extractedData: StructuredExtraction,
    issues: ValidationIssue[]
  ) {
    // Check line items sum vs subtotal / total
    if (extractedData.line_items && extractedData.line_items.length > 0) {
      const sumLineItems = extractedData.line_items.reduce((acc, item) => acc + (item.total || 0), 0);
      const totalAmount = fields.total_amount || fields.total || fields.amount;
      const subtotal = fields.subtotal;

      if (subtotal && Math.abs(sumLineItems - subtotal) > 0.10) {
        issues.push({
          document_id: documentId,
          user_id: userId,
          issue_type: 'arithmetic_line_items_mismatch',
          severity: 'warning',
          field_path: 'subtotal',
          message: `Sum of itemized lines ($${sumLineItems.toFixed(2)}) differs from stated subtotal ($${Number(subtotal).toFixed(2)}).`,
          evidence: { line_items_sum: sumLineItems, stated_subtotal: subtotal },
          suggested_action: 'Inspect line items table to ensure no missing discount or unrecorded charge.',
          status: 'open',
        });
      }

      // Check subtotal + tax = total
      const tax = fields.tax || fields.tax_amount || 0;
      const surcharge = fields.surcharge || 0;
      if (subtotal && totalAmount) {
        const expectedTotal = Number(subtotal) + Number(tax) + Number(surcharge);
        if (Math.abs(expectedTotal - Number(totalAmount)) > 0.10) {
          issues.push({
            document_id: documentId,
            user_id: userId,
            issue_type: 'arithmetic_total_inconsistency',
            severity: 'critical',
            field_path: 'total_amount',
            message: `Arithmetic inconsistency: Subtotal ($${subtotal}) + Tax ($${tax}) + Surcharge ($${surcharge}) = $${expectedTotal.toFixed(2)}, but document claims Total of $${totalAmount}.`,
            evidence: { subtotal, tax, surcharge, expected_total: expectedTotal, stated_total: totalAmount },
            suggested_action: 'Review document calculations and correct either the tax, surcharge, or total in the review form.',
            status: 'open',
          });
        }
      }
    }
  }

  private validateDates(
    documentId: string,
    userId: string,
    fields: Record<string, any>,
    extractedData: StructuredExtraction,
    issues: ValidationIssue[]
  ) {
    const issueDateStr = fields.invoice_date || fields.issue_date || fields.date;
    const dueDateStr = fields.due_date || fields.payment_due_date || fields.expiration_date;

    if (issueDateStr && dueDateStr) {
      const issueDate = new Date(issueDateStr);
      const dueDate = new Date(dueDateStr);

      if (!isNaN(issueDate.getTime()) && !isNaN(dueDate.getTime())) {
        if (issueDate.getTime() > dueDate.getTime()) {
          issues.push({
            document_id: documentId,
            user_id: userId,
            issue_type: 'invalid_date_relationship',
            severity: 'critical',
            field_path: 'due_date',
            message: `Impossible date timeline: Due/Expiration date (${dueDateStr}) precedes Issue date (${issueDateStr}).`,
            evidence: { issue_date: issueDateStr, due_date: dueDateStr },
            suggested_action: 'Verify and fix inverted dates.',
            status: 'open',
          });
        }
      }
    }
  }

  private validateCrossDocument(
    documentId: string,
    userId: string,
    documentType: string,
    fields: Record<string, any>,
    existingDocuments: Array<{ id: string; fileName: string; type: string; extractedData: any }>,
    issues: ValidationIssue[]
  ) {
    // If current doc is an Invoice and specifies a PO Reference
    if (documentType === 'invoice') {
      const poRef = fields.purchase_order_ref || fields.po_number || fields.po_reference;
      const invTotal = Number(fields.total_amount || 0);

      if (poRef && invTotal > 0) {
        // Find matching PO in existing documents
        const matchingPO = existingDocuments.find((d) => {
          if (d.type !== 'purchase_order') return false;
          const poNo = d.extractedData?.fields?.order_number || d.extractedData?.fields?.po_number;
          return poNo && String(poNo).toLowerCase().includes(String(poRef).toLowerCase());
        });

        if (matchingPO) {
          const poCap = Number(matchingPO.extractedData?.fields?.total_amount || matchingPO.extractedData?.fields?.authorized_ceiling || 0);
          if (poCap > 0 && invTotal > poCap) {
            issues.push({
              document_id: documentId,
              user_id: userId,
              issue_type: 'cross_document_amount_mismatch',
              severity: 'critical',
              field_path: 'total_amount',
              message: `Cross-Document Discrepancy: Invoice claims $${invTotal.toFixed(2)}, exceeding authorized Purchase Order (${matchingPO.fileName}) cap of $${poCap.toFixed(2)} by $${(invTotal - poCap).toFixed(2)}.`,
              evidence: {
                invoice_amount: invTotal,
                purchase_order_file: matchingPO.fileName,
                purchase_order_id: matchingPO.id,
                purchase_order_cap: poCap,
                variance: invTotal - poCap,
              },
              suggested_action: 'Hold invoice approval until authorized change order amendment is filed.',
              status: 'open',
            });
          }
        }
      }
    }
  }
}

export const validationEngineService = new ValidationEngineService();
