import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  User,
  ShieldCheck,
  Cpu,
  Database,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  Key,
} from 'lucide-react';
import { api } from '../services/api.js';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Fetch health
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.getHealth(),
  });

  // Fetch profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.getProfile();
      setDisplayName(res.profile.display_name);
      return res.profile;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (name: string) => api.updateProfile(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const integrations = healthData?.integrations || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Settings & System Health
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            System Operational
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Workspace preferences, user identity, Supabase connection status, and Gemini model diagnostics.
        </p>
      </div>

      {/* User Profile Form */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" />
          User Profile & Workspace Identity
        </h2>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Profile updated successfully.
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (displayName.trim()) {
              updateProfileMutation.mutate(displayName.trim());
            }
          }}
          className="space-y-4 pt-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Authorized Email
              </label>
              <input
                type="email"
                disabled
                value={profileData?.email || 'sarah.jenkins@nexusglobal.com'}
                className="w-full bg-navy-950/50 border border-slate-800/80 text-xs rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Integration Diagnostics */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent-cyan" />
          Integration Diagnostics & Pipeline Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Supabase Status */}
          <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-brand-400" />
                Supabase PostgreSQL & Storage
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  integrations.supabase === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {integrations.supabase === 'connected' ? 'LIVE CONNECTED' : 'LOCAL STORE ACTIVE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {integrations.supabase === 'connected'
                ? 'Connected to configured Supabase remote project with Row Level Security enabled.'
                : 'Using seeded high-performance local store. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to connect remote project.'}
            </p>
          </div>

          {/* Gemini AI Status */}
          <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-accent-cyan" />
                Google Gemini API
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  integrations.gemini === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {integrations.gemini === 'active' ? 'GEMINI LIVE' : 'DETERMINISTIC FALLBACK'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {integrations.gemini === 'active'
                ? 'Official @google/genai SDK active with configured model (gemini-2.5-flash).'
                : 'Deterministic regex & heuristic extraction engine active. Add GEMINI_API_KEY to .env to enable live Gemini multi-modal calls.'}
            </p>
          </div>
        </div>
      </div>

      {/* Export Workspace Section */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Download className="w-4 h-4 text-accent-cyan" />
            Full Workspace Intelligence Export
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Download your verified extractions, validation logs, and audit records as CSV or JSON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
          <a
            href={api.getExportJsonUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Export JSON
          </a>
        </div>
      </div>
    </div>
  );
};
