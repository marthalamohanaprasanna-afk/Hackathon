import React from 'react';
import { ProcessingStatus, ReviewStatus } from '../../types/index.js';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileSearch, ShieldCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: ProcessingStatus | ReviewStatus | string;
  type?: 'processing' | 'review';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'processing' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'completed':
      case 'approved':
        return {
          label: status === 'approved' ? 'Approved' : 'Completed',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
        };
      case 'needs_review':
      case 'pending_review':
        return {
          label: status === 'pending_review' ? 'Pending Review' : 'Needs Review',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
        };
      case 'in_review':
        return {
          label: 'In Review',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
        };
      case 'extracting':
      case 'validating':
      case 'queued':
        return {
          label: status === 'extracting' ? 'Extracting AI' : status === 'validating' ? 'Validating' : 'Queued',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: <FileSearch className="w-3.5 h-3.5 mr-1 animate-pulse" />,
        };
      case 'failed':
      case 'rejected':
        return {
          label: status === 'rejected' ? 'Rejected' : 'Failed',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
        };
      case 'not_required':
      default:
        return {
          label: 'Standard',
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <ShieldCheck className="w-3.5 h-3.5 mr-1" />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
