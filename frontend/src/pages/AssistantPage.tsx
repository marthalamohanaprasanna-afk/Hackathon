import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Send,
  Sparkles,
  Files,
  FileText,
  AlertCircle,
  PlusCircle,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ChatSession, ChatMessage } from '../types/index.js';

const SUGGESTED_QUESTIONS = [
  'What is the total amount across these invoices?',
  'Which documents have missing information or math inconsistencies?',
  'What are the upcoming deadlines and payment due dates?',
  'Compare the purchase order PO-99420 with invoice INV-2024-8841.',
  'Summarize the key obligations and renewal terms in the Master Services Agreement.',
];

export const AssistantPage: React.FC = () => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [selectedDocScope, setSelectedDocScope] = useState<string>('all');

  // Fetch all chat sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.getChatSessions(),
  });

  const sessions = sessionsData?.sessions || [];

  // Auto-select first session or initialize
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Fetch messages for active session
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', activeSessionId],
    queryFn: () => api.getChatMessages(activeSessionId!),
    enabled: Boolean(activeSessionId),
  });

  const messages = messagesData?.messages || [];

  // Fetch user documents for scope dropdown
  const { data: docsData } = useQuery({
    queryKey: ['documents-scope'],
    queryFn: () => api.getDocuments({ limit: 50 }),
  });
  const availableDocs = docsData?.documents || [];

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: () => api.createChatSession(`Document Inquiry ${sessions.length + 1}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setActiveSessionId(data.session.id);
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => api.deleteChatSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setActiveSessionId(null);
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.sendChatMessage(
        activeSessionId!,
        content,
        selectedDocScope !== 'all' ? [selectedDocScope] : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeSessionId] });
      setQuestionInput('');
    },
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendMutation.isPending]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionInput.trim() || sendMutation.isPending) return;

    if (!activeSessionId) {
      createSessionMutation.mutate();
      return;
    }

    sendMutation.mutate(questionInput.trim());
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            AI Document Assistant
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Evidence-Grounded RAG
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ask questions across your business documents with strict citations and verified excerpts.
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Scope:</span>
          <select
            value={selectedDocScope}
            onChange={(e) => setSelectedDocScope(e.target.value)}
            className="bg-navy-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Documents ({availableDocs.length})</option>
            {availableDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name} ({doc.document_type})
              </option>
            ))}
          </select>

          <button
            onClick={() => createSessionMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-400" />
            New Thread
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sessions Sidebar (1 col) */}
        <div className="hidden md:flex flex-col glass-panel p-3 rounded-2xl overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
            Conversations
          </span>

          <div className="flex-1 overflow-y-auto space-y-1 mt-2">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all group ${
                  activeSessionId === sess.id
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="truncate max-w-[140px] font-medium">{sess.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation?')) {
                      deleteSessionMutation.mutate(sess.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Timeline (3 cols) */}
        <div className="md:col-span-3 glass-panel rounded-2xl flex flex-col overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600/20 to-accent-cyan/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-3 shadow-glow-brand">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Evidence-Grounded Document Assistant
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ask questions about contracts, invoices, payment due dates, or cross-document variances. Answers cite exact document files and excerpts.
                </p>

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 gap-2 mt-6 w-full text-left">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuestionInput(q);
                        if (activeSessionId) {
                          sendMutation.mutate(q);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-brand-500/40 text-xs text-slate-300 hover:text-brand-300 transition-all flex items-center justify-between"
                    >
                      <span>{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-navy-950/80 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-bold text-[11px] opacity-75">
                      {msg.role === 'user' ? (
                        <span>You</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-accent-cyan">
                          <Bot className="w-3.5 h-3.5" />
                          DocuMind AI
                        </span>
                      )}
                    </div>

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Citations list if present */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-cyan flex items-center gap-1">
                          <Files className="w-3 h-3" />
                          Grounding Citations ({msg.citations.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.citations.map((cite, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300"
                            >
                              <div className="font-semibold text-brand-300 truncate">
                                {cite.document_name}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                                "{cite.excerpt}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sendMutation.isPending && (
              <div className="flex items-start">
                <div className="p-4 rounded-2xl bg-navy-950/80 border border-slate-800 text-xs flex items-center gap-2.5 text-brand-300">
                  <div className="w-4 h-4 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                  <span>Searching document chunks and formulating grounded answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-800/80 bg-navy-950/60">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask anything about your uploaded documents..."
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={sendMutation.isPending}
                className="flex-1 bg-navy-950 border border-slate-800 text-xs rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!questionInput.trim() || sendMutation.isPending}
                className="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-glow-brand transition-all disabled:opacity-40 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Ask AI
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
