import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Files,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  ExternalLink,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { DocumentType } from '../types/index.js';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState<string>(searchParams.get('category') || 'all');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'all');
  const [reviewStatus, setReviewStatus] = useState<string>(searchParams.get('review_status') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', { category, status, review_status: reviewStatus, q: searchQuery, page }],
    queryFn: () =>
      api.getDocuments({
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        review_status: reviewStatus !== 'all' ? reviewStatus : undefined,
        q: searchQuery || undefined,
        page,
        limit: 10,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => api.reprocessDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const documents = data?.documents || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Document Repository
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {pagination?.total ?? documents.length} Files
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, filter, and inspect processed multi-format business documents.
          </p>
        </div>

        <button
          onClick={() => navigate('/documents/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-glow-brand transition-all hover:scale-105"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Files
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename or extracted text..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-navy-950/70 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-navy-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-navy-900">All Categories</option>
              <option value="invoice" className="bg-navy-900">Invoice</option>
              <option value="purchase_order" className="bg-navy-900">Purchase Order</option>
              <option value="receipt" className="bg-navy-900">Receipt</option>
              <option value="contract" className="bg-navy-900">Contract</option>
              <option value="application_form" className="bg-navy-900">Application Form</option>
              <option value="financial_report" className="bg-navy-900">Financial Report</option>
              <option value="certificate" className="bg-navy-900">Certificate</option>
            </select>
          </div>

          {/* Processing Status Filter */}
          <div className="flex items-center gap-1.5 bg-navy-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-navy-900">All Processing States</option>
              <option value="completed" className="bg-navy-900">Completed</option>
              <option value="needs_review" className="bg-navy-900">Needs Review</option>
              <option value="failed" className="bg-navy-900">Failed</option>
              <option value="extracting" className="bg-navy-900">Extracting</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div className="flex items-center gap-1.5 bg-navy-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <select
              value={reviewStatus}
              onChange={(e) => {
                setReviewStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-navy-900">All Review States</option>
              <option value="approved" className="bg-navy-900">Approved</option>
              <option value="pending_review" className="bg-navy-900">Pending Review</option>
              <option value="in_review" className="bg-navy-900">In Review</option>
              <option value="rejected" className="bg-navy-900">Rejected</option>
            </select>
          </div>

          {(category !== 'all' || status !== 'all' || reviewStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setCategory('all');
                setStatus('all');
                setReviewStatus('all');
                setSearchQuery('');
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center">
            <Files className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No documents found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No files match your current filter parameters or workspace. Upload your first business document to get started.
            </p>
            <button
              onClick={() => navigate('/documents/upload')}
              className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 hover:bg-brand-500 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Processing</th>
                  <th className="py-3 px-4">Review State</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Issues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    {/* Filename & size */}
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400 flex-shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 group-hover:text-brand-300 transition-colors truncate max-w-[220px] block">
                            {doc.file_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {(doc.file_size / 1024).toFixed(1)} KB • {doc.page_count || 1} pg
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                      {doc.document_type.replace(/_/g, ' ')}
                    </td>

                    {/* Processing Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={doc.processing_status} />
                    </td>

                    {/* Review Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={doc.review_status} type="review" />
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-4">
                      {doc.classification_confidence !== null && doc.classification_confidence !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                doc.classification_confidence > 0.9
                                  ? 'bg-emerald-400'
                                  : doc.classification_confidence > 0.8
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${doc.classification_confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-300">
                            {(doc.classification_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>

                    {/* Issues Flag */}
                    <td className="py-3.5 px-4">
                      {doc.critical_issues_count && doc.critical_issues_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          {doc.critical_issues_count} critical
                        </span>
                      ) : doc.validation_issues_count && doc.validation_issues_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {doc.validation_issues_count} notice
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">Clean</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {doc.review_status === 'pending_review' && (
                          <button
                            onClick={() => navigate(`/documents/${doc.id}/review`)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-lg font-semibold border border-amber-500/30 transition-all"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => reprocessMutation.mutate(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Reprocess Document"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete document "${doc.file_name}"?`)) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
