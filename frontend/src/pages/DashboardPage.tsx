import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Files,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Sparkles,
  UploadCloud,
  ShieldAlert,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/common/StatusBadge.js';

const CATEGORY_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.getDashboardMetrics(),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading document intelligence analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <p className="font-semibold">Unable to fetch dashboard metrics</p>
        <p className="text-xs text-rose-400/80 mt-1">{(error as any)?.message || 'Service unavailable'}</p>
      </div>
    );
  }

  const { kpis, category_distribution, severity_distribution, upcoming_deadlines, recent_activity } = metrics;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Intelligence Overview
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Live Pipeline
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics across extracted business documents, validation discrepancies, and obligations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents/upload')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-glow-brand transition-all hover:scale-105"
          >
            <UploadCloud className="w-4 h-4" />
            Upload New Documents
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Documents
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{kpis.total_uploaded}</span>
            <span className="text-xs text-slate-400">files indexed</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Multi-modal processing enabled</span>
          </div>
        </div>

        {/* Successfully Verified */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified & Approved
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{kpis.completed}</span>
            <span className="text-xs text-slate-400">
              ({kpis.total_uploaded > 0 ? Math.round((kpis.completed / kpis.total_uploaded) * 100) : 0}% of workspace)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400/80">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed arithmetic & schema rules</span>
          </div>
        </div>

        {/* Review Queue Count */}
        <div
          onClick={() => navigate('/review-queue')}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-amber-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Awaiting Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{kpis.awaiting_review}</span>
            <span className="text-xs text-amber-400/70 font-medium">pending verification</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Human-in-the-loop queue
            </span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Critical Discrepancies */}
        <div
          onClick={() => navigate('/insights')}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-rose-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open Discrepancies
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{severity_distribution.critical}</span>
            <span className="text-xs text-rose-400/70 font-medium">critical variances</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-rose-300">
            <span>PO caps & math anomalies</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Documents by Category</h2>
              <p className="text-xs text-slate-400 mt-0.5">Automated classification distribution</p>
            </div>
            <span className="text-xs text-brand-400 font-semibold">{category_distribution.length} categories</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {category_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {category_distribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No categorized documents yet</p>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800">
            {category_distribution.map((cat, idx) => (
              <div key={cat.name} className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="truncate">{cat.name}:</span>
                <span className="font-bold text-white">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Issues Severity Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Validation Issues by Severity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Deterministic rule violations & anomalies</p>
            </div>
            <span className="text-xs text-amber-400 font-semibold">
              {kpis.open_issues} active issues
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Critical', count: severity_distribution.critical, fill: '#f43f5e' },
                  { name: 'Warning', count: severity_distribution.warning, fill: '#f59e0b' },
                  { name: 'Info / Notice', count: severity_distribution.info, fill: '#06b6d4' },
                ]}
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800">
            <span>Critical issues require human approval before release.</span>
            <button
              onClick={() => navigate('/review-queue')}
              className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
            >
              Open Queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Documents & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 columns) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Recent Processed Documents</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any document to inspect structured extraction</p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Processing Status</th>
                  <th className="py-2.5 px-3">Review State</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recent_activity.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-200 flex items-center gap-2">
                      <Files className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{doc.file_name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={doc.review_status} type="review" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-brand-400 hover:text-brand-300 font-medium">Inspect</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Deadlines & Obligations (1 column) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent-cyan" />
                  Upcoming Deadlines
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Extracted payment due dates & renewal milestones</p>
              </div>
            </div>

            <div className="space-y-3">
              {upcoming_deadlines.length > 0 ? (
                upcoming_deadlines.map((dl) => (
                  <div
                    key={dl.id}
                    onClick={() => navigate(`/documents/${dl.document_id}`)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-brand-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dl.date}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {dl.document_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">{dl.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">No upcoming deadlines detected</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => navigate('/assistant')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600/30 to-accent-cyan/20 border border-brand-500/30 hover:border-brand-500/60 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
              Ask AI Assistant about Deadlines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
