import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  CheckSquare,
  Bot,
  Network,
  Lightbulb,
  Settings,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api.js';

export const Sidebar: React.FC = () => {
  const { data: reviewData } = useQuery({
    queryKey: ['review-queue-count'],
    queryFn: () => api.getReviewQueue(),
    refetchInterval: 10000,
  });

  const pendingReviewCount = reviewData?.total_requiring_review || 0;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents', icon: Files },
    { to: '/documents/upload', label: 'Upload Files', icon: UploadCloud },
    {
      to: '/review-queue',
      label: 'Review Queue',
      icon: CheckSquare,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    { to: '/assistant', label: 'AI Assistant', icon: Bot, highlight: true },
    { to: '/insights', label: 'Discrepancies & Insights', icon: Lightbulb },
    { to: '/knowledge-graph', label: 'Knowledge Graph', icon: Network },
    { to: '/settings', label: 'Settings & Health', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800/80 flex flex-col h-screen select-none z-20">
      {/* Brand Logo Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-navy-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-glow-brand">
          <FileCheck2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            DocuMind <span className="text-brand-400">AI</span>
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
            Document Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
          Core Workflows
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    item.highlight ? 'text-accent-cyan' : ''
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footnote */}
      <div className="p-4 border-t border-slate-800/80 bg-navy-950/30">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              IDP Pipeline Active
            </span>
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Gemini Flash 2.5 + Deterministic Engine
          </p>
        </div>
      </div>
    </aside>
  );
};
