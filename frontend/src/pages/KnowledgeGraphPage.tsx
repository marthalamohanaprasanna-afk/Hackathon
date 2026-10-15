import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Filter,
  ExternalLink,
  Info,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { GraphNode, GraphEdge } from '../types/index.js';

export const KnowledgeGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-graph', selectedEntityType],
    queryFn: () => api.getKnowledgeGraph(selectedEntityType !== 'all' ? selectedEntityType : undefined),
  });

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  // Layout node positions in a dynamic circular/force arrangement for SVG canvas
  const positionedNodes = useMemo(() => {
    const width = 800;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    return nodes.map((node, idx) => {
      const angle = (idx / Math.max(1, nodes.length)) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { ...node, x, y };
    });
  }, [nodes]);

  const nodeMap = useMemo(() => {
    return new Map(positionedNodes.map((n) => [n.id, n]));
  }, [positionedNodes]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'organization':
        return { bg: '#6366f1', text: '#e0e7ff', border: '#4f46e5' };
      case 'invoice_number':
        return { bg: '#06b6d4', text: '#cffafe', border: '#0891b2' };
      case 'purchase_order':
        return { bg: '#8b5cf6', text: '#ede9fe', border: '#7c3aed' };
      case 'monetary_amount':
        return { bg: '#10b981', text: '#d1fae5', border: '#059669' };
      case 'deadline':
        return { bg: '#f59e0b', text: '#fef3c7', border: '#d97706' };
      default:
        return { bg: '#64748b', text: '#f1f5f9', border: '#475569' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Document Intelligence Graph
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              Interactive Network
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual map connecting organizations, invoice references, purchase order caps, dates, and contractual obligations.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-navy-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-navy-900">All Entity Types</option>
            <option value="organization" className="bg-navy-900">Organizations</option>
            <option value="invoice_number" className="bg-navy-900">Invoices</option>
            <option value="purchase_order" className="bg-navy-900">Purchase Orders</option>
            <option value="monetary_amount" className="bg-navy-900">Monetary Amounts</option>
            <option value="deadline" className="bg-navy-900">Deadlines</option>
          </select>
        </div>
      </div>

      {/* Main Canvas and Details Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph Canvas Area (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-4 flex flex-col relative overflow-hidden min-h-[500px]">
          {/* Canvas Legend */}
          <div className="flex flex-wrap items-center gap-3 p-2 bg-navy-950/60 rounded-xl border border-slate-800 text-[11px] mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Organization
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Invoice
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Purchase Order
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Amount
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Deadline
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center relative">
              <svg viewBox="0 0 800 480" className="w-full h-full max-h-[460px]">
                {/* Edge definitions (arrows) */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="18"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#475569" />
                  </marker>
                </defs>

                {/* Render Edges */}
                {edges.map((edge) => {
                  const sourceNode = nodeMap.get(edge.source);
                  const targetNode = nodeMap.get(edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const midX = (sourceNode.x + targetNode.x) / 2;
                  const midY = (sourceNode.y + targetNode.y) / 2;

                  return (
                    <g key={edge.id}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4,2"
                        markerEnd="url(#arrowhead)"
                      />
                      {edge.label && (
                        <text
                          x={midX}
                          y={midY}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="middle"
                          dy="-4"
                          className="select-none font-mono"
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {positionedNodes.map((node) => {
                  const colors = getNodeColor(node.type);
                  const isSelected = activeNode?.id === node.id;

                  return (
                    <g
                      key={node.id}
                      onClick={() => setActiveNode(node)}
                      className="cursor-pointer transition-transform group"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? 26 : 22}
                        fill={colors.bg}
                        stroke={isSelected ? '#ffffff' : colors.border}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all hover:scale-110"
                        style={{ filter: isSelected ? 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.6))' : 'none' }}
                      />
                      <text
                        x={node.x}
                        y={node.y + 36}
                        fill="#f8fafc"
                        fontSize="11"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none select-none drop-shadow"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Right Panel: Selected Entity Inspection Panel (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-400" />
                Entity Details & Evidence
              </h2>
              {activeNode && (
                <button onClick={() => setActiveNode(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeNode ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Entity Identifier
                  </div>
                  <h3 className="text-base font-bold text-white">{activeNode.label}</h3>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30 uppercase">
                    {activeNode.type.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Source Document Reference
                  </div>
                  <p className="text-xs text-slate-200 font-semibold">{activeNode.document_name}</p>
                  <button
                    onClick={() => navigate(`/documents/${activeNode.document_id}`)}
                    className="mt-2 text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                  >
                    Inspect Source Document <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {activeNode.evidence && (
                  <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Extracted Metadata
                    </span>
                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                      {JSON.stringify(activeNode.evidence, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 space-y-2">
                <Network className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-300">Select any node on the graph</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Click on an entity node to inspect associated document sources, relationships, and extracted metadata.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => navigate('/assistant')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Ask AI about this Graph
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
