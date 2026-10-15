import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (filesToUpload: File[]) => api.uploadDocuments(filesToUpload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-count'] });

      setUploadSuccess(`Successfully uploaded ${data.documents.length} document(s). Processing pipeline triggered.`);
      setFiles([]);
      setTimeout(() => {
        navigate('/documents');
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Upload failed');
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const valid: File[] = [];
    const maxBytes = 25 * 1024 * 1024; // 25MB

    for (const f of newFiles) {
      if (f.size > maxBytes) {
        setErrorMsg(`File "${f.name}" exceeds the 25MB limit.`);
        return;
      }
      valid.push(f);
    }

    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick-load demo documents handler for demonstration
  const loadDemoDocument = async (name: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const file = new (window as any).File([blob], name, { type: mimeType }) as File;
    addFiles([file]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Document Ingestion Pipeline
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
            Multi-Modal
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload digital or scanned business documents (PDF, PNG, JPG, JPEG, TXT) for automated classification, structured extraction, and deterministic validation.
        </p>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{uploadSuccess} Redirecting to repository...</span>
          </div>
          <ArrowRight className="w-4 h-4 animate-pulse" />
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-panel p-10 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer relative overflow-hidden group ${
          dragActive
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-brand-500/50 hover:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.md"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/20 to-accent-cyan/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-glow-brand">
          <UploadCloud className="w-8 h-8 text-brand-400" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">
          Drop business documents here or click to browse
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Supports multi-page PDF invoices, purchase orders, contracts, receipts, and images (OCR enabled). Maximum 25MB per file.
        </p>

        <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
          <span>• PDF</span>
          <span>• PNG / JPG</span>
          <span>• TXT / CSV</span>
          <span>• SHA-256 Verified</span>
        </div>
      </div>

      {/* Demonstration Sample Documents Preset Bar */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            Quick Test: Load Pre-Built Business Documents
          </span>
          <span className="text-[10px] text-slate-400">Click to stage for immediate demonstration</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              loadDemoDocument(
                'Sample_Acme_Invoice_INV-8841.txt',
                `ACME TECHNOLOGIES INC.\nINVOICE INV-2024-8841\nDate: October 15, 2024\nDue Date: November 15, 2024\nPO Reference: PO-99420\nBilled To: Nexus Global Logistics\nLine Items:\n1. Cloud Migration: $30,000.00\n2. Kubernetes Setup: $11,500.00\nSubtotal: $41,500.00\nTax (8.0%): $3,320.00\nSurcharge: $1,030.00\nTotal Due: $45,850.00 USD`,
                'text/plain'
              )
            }
            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-500/40 text-left text-xs transition-colors"
          >
            <span className="font-semibold text-slate-200 block truncate">Invoice INV-2024-8841</span>
            <span className="text-[10px] text-brand-400">Total $45,850.00 USD</span>
          </button>

          <button
            type="button"
            onClick={() =>
              loadDemoDocument(
                'Sample_GrandHyatt_Receipt_MathError.txt',
                `GRAND HYATT SEATTLE\nGuest: Sarah Jenkins\nRoom Charges: $840.00\nDining: $195.00\nValet: $90.00\nSubtotal: $1,125.00\nLodging Tax (15.6%): $17.50\nTotal Charged: $1,142.50 USD`,
                'text/plain'
              )
            }
            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 text-left text-xs transition-colors"
          >
            <span className="font-semibold text-slate-200 block truncate">Hotel Receipt (Discrepancy)</span>
            <span className="text-[10px] text-amber-400">Lodging tax math variance</span>
          </button>

          <button
            type="button"
            onClick={() =>
              loadDemoDocument(
                'Sample_Nexus_Vendor_Application_MissingFields.txt',
                `ENTERPRISE VENDOR APPLICATION\nApplication ID: APP-VND-2024-902\nCompany: Pacific Freight Solutions LLC\nTax ID: 88-2910482\nBank Name: [MISSING - REQUIRED FIELD]\nBank Account: [MISSING - REQUIRED FIELD]`,
                'text/plain'
              )
            }
            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 text-left text-xs transition-colors"
          >
            <span className="font-semibold text-slate-200 block truncate">Application Form</span>
            <span className="text-[10px] text-rose-400">Missing banking data</span>
          </button>
        </div>
      </div>

      {/* Staged Files List */}
      {files.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Staged Documents ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {files.map((file, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Plain Document'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={() => setFiles([])}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={uploadMutation.isPending}
              onClick={() => uploadMutation.mutate(files)}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-glow-brand transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing Ingestion...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Initiate Document Processing ({files.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
