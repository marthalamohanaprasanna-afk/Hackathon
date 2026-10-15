import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Save,
  AlertTriangle,
  History,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { SeverityBadge } from '../components/common/SeverityBadge.js';

export const DocumentReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form states
  const [selectedField, setSelectedField] = useState<string>('');
  const [correctedValue, setCorrectedValue] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch document & extractions
  const { data, isLoading } = useQuery({
    queryKey: ['document-review', id],
    queryFn: () => api.getDocument(id!),
    enabled: Boolean(id),
  });

  // Fetch audit history
  const { data: auditData } = useQuery({
    queryKey: ['document-audit', id],
    queryFn: () => api.getDocumentAudit(id!),
    enabled: Boolean(id),
  });

  // Correction Mutation
  const correctMutation = useMutation({
    mutationFn: (vars: { field: string; value: any; notes?: string }) =>
      api.correctField(id!, vars.field, vars.value, vars.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', id] });
      queryClient.invalidateQueries({ queryKey: ['document-audit', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-count'] });
      setFeedbackMsg({ type: 'success', text: `Field "${selectedField}" corrected and recorded in audit log.` });
      setSelectedField('');
      setCorrectedValue('');
      setReviewNotes('');
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save correction' });
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (notes?: string) => api.approveDocument(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setFeedbackMsg({ type: 'success', text: 'Document has been formally approved!' });
      setTimeout(() => navigate('/review-queue'), 1200);
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectDocument(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-count'] });
      setFeedbackMsg({ type: 'success', text: 'Document has been marked as rejected.' });
      setTimeout(() => navigate('/review-queue'), 1200);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;
  const { document: doc, extraction, validation_issues: issues } = data;
  const fields = extraction?.fields || {};
  const auditTrail = auditData?.audit_trail || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/documents/${doc.id}`)}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Document Inspection
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Verification & Approval Workflow
              </h1>
              <StatusBadge status={doc.review_status} type="review" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Review extracted fields against source document evidence. Correct values, resolve discrepancies, and authorize release.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Approve this document and mark validation issues as resolved?')) {
                  approveMutation.mutate('Verified against contract terms and line items.');
                }
              }}
              disabled={approveMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Document
            </button>

            <button
              onClick={() => {
                const reason = prompt('Please enter the reason for rejection:');
                if (reason) rejectMutation.mutate(reason);
              }}
              disabled={rejectMutation.isPending}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Reject Document
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Main Review Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Original Source Content Excerpt */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Original Document Evidence
            </h2>
            <div className="p-3 bg-navy-950/80 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {doc.extracted_text || 'No source text available.'}
            </div>
          </div>

          {/* Validation Issues for this document */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Detected Discrepancies ({issues.length})
            </h2>
            <div className="space-y-2">
              {issues.map((iss, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={iss.severity} />
                    <span className="font-mono text-[10px] text-slate-400">{iss.field_path || 'general'}</span>
                  </div>
                  <p className="text-slate-300">{iss.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Editable Fields & Correction Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Field Correction Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-cyan" />
              Human Field Correction Editor
            </h2>
            <p className="text-xs text-slate-400">
              Select any extracted field, enter the corrected value, and save. The original value is permanently preserved in the audit trail.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedField) return;
                correctMutation.mutate({
                  field: selectedField,
                  value: correctedValue,
                  notes: reviewNotes,
                });
              }}
              className="space-y-3 pt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Select Target Field
                  </label>
                  <select
                    value={selectedField}
                    onChange={(e) => {
                      const f = e.target.value;
                      setSelectedField(f);
                      setCorrectedValue(f ? String(fields[f] ?? '') : '');
                    }}
                    className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose field to correct --</option>
                    {Object.keys(fields).map((k) => (
                      <option key={k} value={k}>
                        {k.replace(/_/g, ' ')} ({String(fields[k]).slice(0, 30)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Corrected Value
                  </label>
                  <input
                    type="text"
                    value={correctedValue}
                    onChange={(e) => setCorrectedValue(e.target.value)}
                    placeholder="Enter verified value..."
                    className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Reviewer Audit Note (Optional)
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Corrected tax calculation based on printed invoice scan."
                  className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!selectedField || correctMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Field Correction
                </button>
              </div>
            </form>
          </div>

          {/* Current Extracted Values Overview */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Current Values
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold text-slate-200 truncate block mt-0.5">
                    {String(v ?? 'null')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-brand-400" />
              Immutable Audit History ({auditTrail.length})
            </h3>

            {auditTrail.length === 0 ? (
              <p className="text-xs text-slate-500">No manual changes recorded yet for this document.</p>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-brand-300 capitalize">
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.field_path && (
                      <div className="text-[11px] text-slate-300">
                        Field: <code className="text-brand-400 font-mono">{ev.field_path}</code>
                        {' '}| Prev: <span className="text-rose-400">{JSON.stringify(ev.previous_value)}</span>
                        {' '}→ New: <span className="text-emerald-400">{JSON.stringify(ev.new_value)}</span>
                      </div>
                    )}
                    {ev.notes && <p className="text-slate-400 text-[11px] italic">"{ev.notes}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
