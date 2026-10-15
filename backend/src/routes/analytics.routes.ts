import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Return real database-backed metrics for the dashboard
 */
router.get('/dashboard', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const docs = Array.from(inMemoryDb.documents.values()).filter((d) => d.user_id === userId);
  const issues = Array.from(inMemoryDb.validationIssues.values()).filter((i) => i.user_id === userId);

  // 1. Core KPIs
  const totalUploaded = docs.length;
  const completedCount = docs.filter((d) => d.processing_status === 'completed').length;
  const awaitingReviewCount = docs.filter(
    (d) => d.review_status === 'pending_review' || d.processing_status === 'needs_review'
  ).length;
  const failedCount = docs.filter((d) => d.processing_status === 'failed').length;

  // 2. Category Distribution
  const categoryCountMap: Record<string, number> = {};
  for (const doc of docs) {
    const type = doc.document_type || 'other_unknown';
    categoryCountMap[type] = (categoryCountMap[type] || 0) + 1;
  }
  const categoryDistribution = Object.entries(categoryCountMap).map(([name, count]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count,
    raw_type: name,
  }));

  // 3. Validation Issues by Severity
  const severityCount = {
    critical: issues.filter((i) => i.severity === 'critical' && i.status === 'open').length,
    warning: issues.filter((i) => i.severity === 'warning' && i.status === 'open').length,
    info: issues.filter((i) => i.severity === 'info' && i.status === 'open').length,
  };

  // 4. Processing Status Breakdown
  const statusCountMap: Record<string, number> = {};
  for (const doc of docs) {
    statusCountMap[doc.processing_status] = (statusCountMap[doc.processing_status] || 0) + 1;
  }
  const statusDistribution = Object.entries(statusCountMap).map(([status, count]) => ({
    status,
    count,
  }));

  // 5. Upcoming Deadlines
  const upcomingDeadlines: Array<{
    id: string;
    date: string;
    document_name: string;
    description: string;
    document_id: string;
  }> = [];

  for (const doc of docs) {
    const ext = inMemoryDb.extractions.get(doc.id)?.extracted_data;
    if (ext?.deadlines) {
      for (const dl of ext.deadlines) {
        upcomingDeadlines.push({
          id: `${doc.id}-${dl.date}`,
          date: dl.date,
          document_name: doc.file_name,
          description: dl.description,
          document_id: doc.id,
        });
      }
    }
  }

  // 6. Recent Activity Feed
  const recentDocs = [...docs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      file_name: d.file_name,
      document_type: d.document_type,
      processing_status: d.processing_status,
      review_status: d.review_status,
      created_at: d.created_at,
    }));

  res.json({
    kpis: {
      total_uploaded: totalUploaded,
      completed: completedCount,
      awaiting_review: awaitingReviewCount,
      failed: failedCount,
      open_issues: issues.filter((i) => i.status === 'open').length,
    },
    category_distribution: categoryDistribution,
    severity_distribution: severityCount,
    status_distribution: statusDistribution,
    upcoming_deadlines: upcomingDeadlines,
    recent_activity: recentDocs,
  });
});

export default router;
