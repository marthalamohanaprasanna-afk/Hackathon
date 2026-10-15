import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  Search,
  User,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';

interface TopbarProps {
  onSearchChange?: (term: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onSearchChange }) => {
  const navigate = useNavigate();

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const handleExportJson = () => {
    window.open(api.getExportJsonUrl(), '_blank');
  };

  return (
    <header className="h-16 px-6 bg-navy-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search documents, entities, or amounts..."
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate(`/documents?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
            }
          }}
          className="w-full bg-navy-950/70 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />
      </div>

      {/* Action Controls & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Export Controls */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Download CSV of all workspace records"
          >
            <Download className="w-3.5 h-3.5 text-accent-cyan" />
            CSV
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Download JSON structured export"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
            JSON
          </button>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => navigate('/documents/upload')}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-xs font-semibold shadow-glow-brand transition-all hover:scale-105"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Files
        </button>

        {/* User Workspace Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold text-xs shadow-sm">
            SJ
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-semibold text-slate-200 block leading-tight">
              Sarah Jenkins
            </span>
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Procurement Officer
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
