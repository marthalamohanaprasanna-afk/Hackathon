import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SeverityBadge } from '../components/common/SeverityBadge.js';

export const ReviewQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.getReviewQueue(),
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: (docId: string) => api.approveDocument(docId, 'Verified and approved from review queue.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const queue = data?.review_queue || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Human Verification Queue
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {queue.length} Pending Actions
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Documents with missing required fields, low AI confidence, or arithmetic discrepancies requiring human verification.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">Review Queue is Clear!</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All uploaded business documents have passed automated deterministic validation rules or have been approved by human reviewers.
          </p>
          <button
            onClick={() => navigate('/documents')}
            className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Explore Document Library
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="glass-panel p-6 rounded-2xl space-y-4 hover:border-amber-500/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      {item.file_name}
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {item.document_type}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Uploaded {new Date(item.created_at).toLocaleDateString()} • {item.page_count || 1} page(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm(`Fast-track approval for ${item.file_name}?`)) {
                        approveMutation.mutate(item.id);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Quick Approve
                  </button>

                  <button
                    onClick={() => navigate(`/documents/${item.id}/review`)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    Open Review Workflow
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Issues Preview */}
              {item.validation_issues && item.validation_issues.length > 0 && (
                <div className="p-3.5 bg-navy-950/70 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Flagged Discrepancies ({item.validation_issues.length})
                  </span>
                  <div className="space-y-1.5">
                    {item.validation_issues.map((iss: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <SeverityBadge severity={iss.severity} />
                        <span className="text-slate-300 font-medium">{iss.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
