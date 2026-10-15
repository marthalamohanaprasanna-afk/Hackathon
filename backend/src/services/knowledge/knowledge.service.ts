import { DocumentEntity, EntityRelationship } from '../../schemas/document.schema.js';
import { StructuredExtraction } from '../../schemas/ai.schema.js';
import { v4 as uuidv4 } from 'uuid';

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
  type: string;
  confidence?: number;
}

export class KnowledgeGraphService {
  /**
   * Extract entities and relationships from a structured document extraction
   */
  public extractEntitiesAndRelationships(
    documentId: string,
    userId: string,
    documentName: string,
    documentType: string,
    extraction: StructuredExtraction
  ): { entities: DocumentEntity[]; relationships: EntityRelationship[] } {
    const entities: DocumentEntity[] = [];
    const relationships: EntityRelationship[] = [];
    const fields = extraction.fields || {};

    let mainDocEntityId = uuidv4();
    let orgSupplierEntityId: string | null = null;
    let orgClientEntityId: string | null = null;

    // 1. Primary Document Identifier Entity
    const docIdentifier =
      fields.invoice_number || fields.order_number || fields.folio_number || fields.contract_reference || documentName;

    const primaryType =
      documentType === 'invoice'
        ? 'invoice_number'
        : documentType === 'purchase_order'
        ? 'purchase_order'
        : documentType === 'contract'
        ? 'contract'
        : 'document_reference';

    entities.push({
      id: mainDocEntityId,
      document_id: documentId,
      user_id: userId,
      entity_type: primaryType,
      normalized_value: String(docIdentifier).toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      display_value: String(docIdentifier),
      evidence: { document_name: documentName, total: fields.total_amount },
    });

    // 2. Supplier / Vendor Organization
    const supplierName = fields.supplier || fields.vendor || fields.merchant || (typeof fields.supplier === 'object' ? fields.supplier?.name : null);
    if (supplierName) {
      orgSupplierEntityId = uuidv4();
      entities.push({
        id: orgSupplierEntityId,
        document_id: documentId,
        user_id: userId,
        entity_type: 'organization',
        normalized_value: String(supplierName).toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        display_value: String(supplierName),
        evidence: { role: 'supplier_or_merchant' },
      });

      relationships.push({
        id: uuidv4(),
        user_id: userId,
        source_entity_id: orgSupplierEntityId,
        target_entity_id: mainDocEntityId,
        relationship_type: 'issued_document',
        confidence: 0.98,
        evidence: { field: 'supplier' },
      });
    }

    // 3. Customer / Client Organization
    const clientName = fields.customer || fields.buyer || fields.client || (typeof fields.customer === 'object' ? fields.customer?.name : null);
    if (clientName) {
      orgClientEntityId = uuidv4();
      entities.push({
        id: orgClientEntityId,
        document_id: documentId,
        user_id: userId,
        entity_type: 'organization',
        normalized_value: String(clientName).toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        display_value: String(clientName),
        evidence: { role: 'customer_or_client' },
      });

      relationships.push({
        id: uuidv4(),
        user_id: userId,
        source_entity_id: mainDocEntityId,
        target_entity_id: orgClientEntityId,
        relationship_type: 'billed_to',
        confidence: 0.97,
        evidence: { field: 'customer' },
      });
    }

    // 4. Monetary Amount Entity
    const totalAmount = fields.total_amount || fields.total || fields.authorized_ceiling;
    if (totalAmount) {
      const amountEntityId = uuidv4();
      entities.push({
        id: amountEntityId,
        document_id: documentId,
        user_id: userId,
        entity_type: 'monetary_amount',
        normalized_value: `usd_${Number(totalAmount).toFixed(2).replace('.', '_')}`,
        display_value: `$${Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
        evidence: { field: 'total_amount' },
      });

      relationships.push({
        id: uuidv4(),
        user_id: userId,
        source_entity_id: mainDocEntityId,
        target_entity_id: amountEntityId,
        relationship_type: 'has_financial_value',
        confidence: 1.0,
        evidence: {},
      });
    }

    // 5. Date & Deadline Entity
    const dueDate = fields.due_date || fields.payment_due_date || fields.expiration_date;
    if (dueDate) {
      const dateEntityId = uuidv4();
      entities.push({
        id: dateEntityId,
        document_id: documentId,
        user_id: userId,
        entity_type: 'deadline',
        normalized_value: `date_${String(dueDate).replace(/[^a-z0-9_-]/g, '_')}`,
        display_value: String(dueDate),
        evidence: { field: 'due_date' },
      });

      relationships.push({
        id: uuidv4(),
        user_id: userId,
        source_entity_id: mainDocEntityId,
        target_entity_id: dateEntityId,
        relationship_type: 'payment_due_by',
        confidence: 0.98,
        evidence: {},
      });
    }

    // 6. Cross-document reference: PO reference in an Invoice
    const poRef = fields.purchase_order_ref || fields.po_reference || fields.po_number;
    if (poRef && documentType === 'invoice') {
      const poEntityId = uuidv4();
      entities.push({
        id: poEntityId,
        document_id: documentId,
        user_id: userId,
        entity_type: 'purchase_order',
        normalized_value: String(poRef).toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        display_value: String(poRef),
        evidence: { reference_source: 'invoice_po_reference' },
      });

      relationships.push({
        id: uuidv4(),
        user_id: userId,
        source_entity_id: mainDocEntityId,
        target_entity_id: poEntityId,
        relationship_type: 'references_po',
        confidence: 0.99,
        evidence: { field: 'purchase_order_ref' },
      });
    }

    return { entities, relationships };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
