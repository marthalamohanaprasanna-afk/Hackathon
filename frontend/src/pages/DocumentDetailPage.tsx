import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  ArrowLeft,
  Edit3,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Code,
} from 'lucide-react';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { SeverityBadge } from '../components/common/SeverityBadge.js';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fields' | 'issues' | 'raw'>('fields');

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id!),
    enabled: Boolean(id),
  });

  const reprocessMutation = useMutation({
    mutationFn: () => api.reprocessDocument(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDocument(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/documents');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading document extraction and intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <p className="font-semibold">Document not found</p>
        <button
          onClick={() => navigate('/documents')}
          className="mt-3 px-3 py-1.5 bg-slate-800 text-xs rounded-lg text-white"
        >
          Return to Documents
        </button>
      </div>
    );
  }

  const { document: doc, extraction, validation_issues: issues } = data;
  const fields = extraction?.fields || {};
  const lineItems = extraction?.line_items || [];

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <button
          onClick={() => navigate('/documents')}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Documents
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white tracking-tight truncate max-w-xl">
                {doc.file_name}
              </h1>
              <StatusBadge status={doc.processing_status} />
              <StatusBadge status={doc.review_status} type="review" />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="capitalize font-semibold text-brand-300">
                {doc.document_type.replace(/_/g, ' ')}
              </span>
              <span>•</span>
              <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>{doc.page_count || 1} page(s)</span>
              <span>•</span>
              <span className="font-mono text-slate-500">Hash: {doc.file_hash.slice(0, 12)}...</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/documents/${doc.id}/review`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Human Review & Verify
            </button>

            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-colors"
              title="Reprocess Document"
            >
              <RefreshCw className={`w-4 h-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Delete this document?')) {
                  deleteMutation.mutate();
                }
              }}
              className="p-2 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Split View Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Summary, Deadlines, and Document Text Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Executive Summary Card */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                AI Executive Summary
              </h2>
              {doc.classification_confidence && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {(doc.classification_confidence * 100).toFixed(0)}% Confidence
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-navy-950/50 p-3.5 rounded-xl border border-slate-800/80">
              {doc.summary || 'Summary processing complete.'}
            </p>
          </div>

          {/* Obligations & Deadlines */}
          {extraction?.deadlines && extraction.deadlines.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Deadlines & Payment Milestones
              </h2>
              <div className="space-y-2">
                {extraction.deadlines.map((dl, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                    <span className="font-bold text-amber-400 block">{dl.date}</span>
                    <span className="text-slate-300 mt-1 block">{dl.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Document Text Excerpt */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Source Extracted Text Excerpt
            </h2>
            <div className="bg-navy-950/80 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap">
              {doc.extracted_text || 'No text extracted.'}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Tabs for Fields, Validation Issues, Raw JSON */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tab Navigation */}
          <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'fields'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Structured Fields ({Object.keys(fields).length})
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'issues'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Validation Issues ({issues.length})
            </button>

            <button
              onClick={() => setActiveTab('raw')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'raw'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON Data
            </button>
          </div>

          {/* TAB 1: Structured Fields & Line Items */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Key-Value Fields Grid */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white tracking-tight">Key-Value Entities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(fields).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-navy-950/60 border border-slate-800/80 flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-slate-100 mt-1 truncate">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line Items Table if present */}
              {lineItems.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white tracking-tight">Itemized Line Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-200 font-medium">
                              {item.description}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{item.quantity ?? '-'}</td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              {item.total ? `$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Validation Issues */}
          {activeTab === 'issues' && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Deterministic Validation Findings
                </h3>
                <span className="text-xs text-slate-400">
                  {issues.filter((i) => i.status === 'open').length} Open Issues
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="p-8 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  All deterministic checks and arithmetic constraints verified cleanly.
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((iss, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={iss.severity} />
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {iss.issue_type}
                          </span>
                        </div>
                        {iss.field_path && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            Field: {iss.field_path}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{iss.message}</p>

                      {iss.suggested_action && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                          <strong>Recommended Review Action:</strong> {iss.suggested_action}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Raw JSON */}
          {activeTab === 'raw' && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white tracking-tight">Raw Extraction JSON</h3>
              <pre className="bg-navy-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-[500px] overflow-y-auto">
                {JSON.stringify(extraction, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
