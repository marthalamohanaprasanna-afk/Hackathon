import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';
import { geminiService } from '../services/gemini/gemini.service.js';

const router = Router();

/**
 * GET /api/insights/overview
 * Cross-document intelligence overview
 */
router.get('/overview', authenticateUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const userDocs = Array.from(inMemoryDb.documents.values()).filter((d) => d.user_id === userId);

  // 1. Gather all validation discrepancies
  const issues = Array.from(inMemoryDb.validationIssues.values()).filter(
    (i) => i.user_id === userId && i.status === 'open'
  );

  // 2. Identify all deadlines
  const deadlines: Array<{ date: string; document_id: string; document_name: string; description: string }> = [];
  for (const doc of userDocs) {
    const ext = inMemoryDb.extractions.get(doc.id)?.extracted_data;
    if (ext?.deadlines) {
      for (const dl of ext.deadlines) {
        deadlines.push({
          date: dl.date,
          document_id: doc.id,
          document_name: doc.file_name,
          description: dl.description,
        });
      }
    }
  }

  // 3. Compute invoice totals vs PO totals
  let totalInvoicedAmount = 0;
  let totalPoAmount = 0;

  for (const doc of userDocs) {
    const ext = inMemoryDb.extractions.get(doc.id)?.extracted_data;
    if (doc.document_type === 'invoice') {
      const amt = Number(ext?.fields?.total_amount || 0);
      totalInvoicedAmount += amt;
    } else if (doc.document_type === 'purchase_order') {
      const amt = Number(ext?.fields?.total_amount || ext?.fields?.authorized_ceiling || 0);
      totalPoAmount += amt;
    }
  }

  // 4. Extract active organizations
  const orgs = Array.from(inMemoryDb.entities.values())
    .filter((e) => e.user_id === userId && e.entity_type === 'organization')
    .map((e) => e.display_value);
  const uniqueOrgs = Array.from(new Set(orgs));

  res.json({
    summary: {
      total_documents: userDocs.length,
      total_invoiced_usd: totalInvoicedAmount,
      total_po_authorized_usd: totalPoAmount,
      variance_usd: Math.max(0, totalInvoicedAmount - totalPoAmount),
      active_organizations: uniqueOrgs,
      open_discrepancies_count: issues.length,
      critical_issues_count: issues.filter((i) => i.severity === 'critical').length,
    },
    discrepancies: issues,
    upcoming_deadlines: deadlines,
    recurring_patterns: [
      'Cloud architecture and data engineering expenditures represent the primary cost driver.',
      'Active Master Services Agreement with Acme Technologies Inc. governs purchase orders PO-99420 through PO-99425.',
      'Vendor invoice INV-2024-8841 variance requires change-order authorization before payment release.',
    ],
  });
});

/**
 * POST /api/insights/cross-document
 * Compare a selected subset of authorized documents
 */
router.post('/cross-document', authenticateUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { document_ids } = req.body;

  if (!Array.isArray(document_ids) || document_ids.length === 0) {
    res.status(400).json({ error: 'Please provide an array of document IDs to analyze.' });
    return;
  }

  const selectedDocs = document_ids
    .map((id) => inMemoryDb.documents.get(id))
    .filter((d) => d && d.user_id === userId)
    .map((d) => ({
      id: d!.id,
      name: d!.file_name,
      type: d!.document_type,
      summary: d!.summary || '',
      extractedData: inMemoryDb.extractions.get(d!.id)?.extracted_data,
    }));

  const discovery = await geminiService.discoverCrossDocumentKnowledge(selectedDocs as any);

  res.json({
    analyzed_documents_count: selectedDocs.length,
    discovery,
  });
});

/**
 * GET /api/knowledge-graph
 * Retrieve entity graph nodes and relationships
 */
router.get('/knowledge-graph', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { entity_type } = req.query;

  let entities = Array.from(inMemoryDb.entities.values()).filter((e) => e.user_id === userId);
  if (entity_type && typeof entity_type === 'string' && entity_type !== 'all') {
    entities = entities.filter((e) => e.entity_type === entity_type);
  }

  const entityIdSet = new Set(entities.map((e) => e.id));
  const relationships = Array.from(inMemoryDb.relationships.values()).filter(
    (r) => r.user_id === userId && (entityIdSet.has(r.source_entity_id) || entityIdSet.has(r.target_entity_id))
  );

  const docNameMap = new Map(
    Array.from(inMemoryDb.documents.values()).map((d) => [d.id, d.file_name])
  );

  const nodes = entities.map((e) => ({
    id: e.id,
    label: e.display_value,
    type: e.entity_type,
    document_id: e.document_id,
    document_name: docNameMap.get(e.document_id) || 'Unknown Document',
    evidence: e.evidence,
  }));

  const edges = relationships.map((r) => ({
    id: r.id,
    source: r.source_entity_id,
    target: r.target_entity_id,
    label: r.relationship_type.replace(/_/g, ' '),
    type: r.relationship_type,
    confidence: r.confidence || 0.95,
  }));

  res.json({
    nodes,
    edges,
    total_nodes: nodes.length,
    total_edges: edges.length,
  });
});

/**
 * GET /api/knowledge-graph/entities/:id
 */
router.get('/knowledge-graph/entities/:id', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const entity = inMemoryDb.entities.get(req.params.id);

  if (!entity || entity.user_id !== userId) {
    res.status(404).json({ error: 'Entity not found or unauthorized.' });
    return;
  }

  const doc = inMemoryDb.documents.get(entity.document_id);
  const connectedEdges = Array.from(inMemoryDb.relationships.values()).filter(
    (r) => r.source_entity_id === entity.id || r.target_entity_id === entity.id
  );

  res.json({
    entity,
    associated_document: doc
      ? {
          id: doc.id,
          file_name: doc.file_name,
          document_type: doc.document_type,
          summary: doc.summary,
        }
      : null,
    connected_relationships: connectedEdges,
  });
});

export default router;
