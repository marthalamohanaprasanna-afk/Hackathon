import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SeverityBadge } from '../components/common/SeverityBadge.js';

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ['insights-overview'],
    queryFn: () => api.getInsightsOverview(),
  });

  const { data: docsData } = useQuery({
    queryKey: ['documents-list-insights'],
    queryFn: () => api.getDocuments({ limit: 50 }),
  });

  const analyzeMutation = useMutation({
    mutationFn: (ids: string[]) => api.getCrossDocAnalysis(ids),
    onSuccess: (data: any) => {
      setAnalysisResult(data.discovery);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const summary = insightsData?.summary;
  const discrepancies = insightsData?.discrepancies || [];
  const deadlines = insightsData?.upcoming_deadlines || [];
  const patterns = insightsData?.recurring_patterns || [];
  const availableDocs = docsData?.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Cross-Document Intelligence & Discrepancies
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
            Multi-Document Graph
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Detect conflicting monetary figures, PO ceiling overruns, contractual obligations, and shared entity patterns across documents.
        </p>
      </div>

      {/* Spend Variance & Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Invoiced Billed
            </span>
            <div className="text-2xl font-extrabold text-white mt-2">
              ${summary.total_invoiced_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Across all verified invoices</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Authorized PO Ceiling
            </span>
            <div className="text-2xl font-extrabold text-brand-300 mt-2">
              ${summary.total_po_authorized_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Approved purchase order caps</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-rose-500/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Cross-Document Spend Variance
            </span>
            <div className="text-2xl font-extrabold text-rose-400 mt-2">
              +${summary.variance_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-rose-400/80 block mt-1">
              Invoice INV-8841 exceeds PO-99420 ceiling
            </span>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Enterprise Entities
            </span>
            <div className="text-2xl font-extrabold text-accent-cyan mt-2">
              {summary.active_organizations.length} Organizations
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Acme Technologies, Nexus Global</span>
          </div>
        </div>
      )}

      {/* Cross-Document Discrepancies Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Detected Multi-Document Discrepancies ({discrepancies.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic rule violations comparing transactions and itemizations across documents
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {discrepancies.map((disc, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={disc.severity} />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {disc.issue_type}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/documents/${disc.document_id}/review`)}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
                >
                  Resolve in Review
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <p className="text-xs text-slate-200 font-medium leading-relaxed">{disc.message}</p>

              {disc.suggested_action && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  <strong>Recommended Procurement Action:</strong> {disc.suggested_action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ad-hoc Cross-Document Comparison Tool */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Ad-hoc Multi-Document Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select two or more documents to analyze shared entities, obligations, and relationship conflicts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {availableDocs.map((d) => {
            const isSelected = selectedDocIds.includes(d.id);
            return (
              <div
                key={d.id}
                onClick={() => {
                  setSelectedDocIds((prev) =>
                    isSelected ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                  );
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-600/20 border-brand-500 text-white'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold truncate">{d.file_name}</div>
                <div className="text-[10px] opacity-75 capitalize mt-0.5">
                  {d.document_type.replace(/_/g, ' ')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => analyzeMutation.mutate(selectedDocIds)}
            disabled={selectedDocIds.length < 2 || analyzeMutation.isPending}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-glow-brand transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {analyzeMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing Multi-Document Graph...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Compare Selected Documents ({selectedDocIds.length})
              </>
            )}
          </button>
        </div>

        {/* Ad-hoc Analysis Results */}
        {analysisResult && (
          <div className="p-4 rounded-xl bg-navy-950/80 border border-brand-500/30 space-y-3 mt-4">
            <h3 className="text-xs font-bold text-brand-300 uppercase tracking-wider">
              Cross-Document Discovery Results
            </h3>
            <div className="space-y-2">
              {analysisResult.insights?.map((ins: string, i: number) => (
                <div key={i} className="text-xs text-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strategic Patterns */}
      <div className="glass-panel p-6 rounded-2xl space-y-3">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Recurring Strategic Insights & Operational Patterns
        </h2>
        <div className="space-y-2">
          {patterns.map((pat, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-1.5" />
              <span>{pat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
