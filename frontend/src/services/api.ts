import {
  DocumentRecord,
  DashboardMetrics,
  InsightsOverview,
  ChatSession,
  ChatMessage,
  GraphNode,
  GraphEdge,
  StructuredExtraction,
  ValidationIssue,
  ReviewEvent,
} from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('documind_token');

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        errorMessage = errJson.message || errJson.error || errorMessage;
      } catch {
        // ignore parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Health & Profile
  public getHealth() {
    return this.request<{ status: string; environment: string; integrations: Record<string, string> }>('/health');
  }

  public getProfile() {
    return this.request<{ profile: { id: string; display_name: string; email: string; role: string } }>('/profile');
  }

  public updateProfile(displayName: string) {
    return this.request('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    });
  }

  // Documents
  public getDocuments(params: { category?: string; status?: string; review_status?: string; q?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    if (params.review_status) query.set('review_status', params.review_status);
    if (params.q) query.set('q', params.q);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return this.request<{ documents: DocumentRecord[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
      `/documents?${query.toString()}`
    );
  }

  public getDocument(id: string) {
    return this.request<{ document: DocumentRecord; extraction: StructuredExtraction | null; validation_issues: ValidationIssue[] }>(
      `/documents/${id}`
    );
  }

  public getDocumentExtraction(id: string) {
    return this.request<{ document_id: string; extracted_data: StructuredExtraction | null; field_confidence: Record<string, number> }>(
      `/documents/${id}/extraction`
    );
  }

  public uploadDocuments(files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.request<{ message: string; documents: DocumentRecord[]; duplicates_skipped: string[] }>(
      '/documents/upload',
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  public deleteDocument(id: string) {
    return this.request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' });
  }

  public reprocessDocument(id: string) {
    return this.request<{ message: string; document: DocumentRecord }>(`/documents/${id}/reprocess`, { method: 'POST' });
  }

  // Reviews
  public getReviewQueue() {
    return this.request<{ review_queue: any[]; total_requiring_review: number }>('/reviews');
  }

  public correctField(documentId: string, fieldPath: string, newValue: any, notes?: string) {
    return this.request(`/documents/${documentId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ field_path: fieldPath, new_value: newValue, notes }),
    });
  }

  public approveDocument(documentId: string, notes?: string) {
    return this.request(`/documents/${documentId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  public rejectDocument(documentId: string, reason: string) {
    return this.request(`/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public getDocumentAudit(documentId: string) {
    return this.request<{ document_id: string; document_name: string; audit_trail: ReviewEvent[] }>(
      `/documents/${documentId}/audit`
    );
  }

  // Chat / Assistant
  public getChatSessions() {
    return this.request<{ sessions: ChatSession[] }>('/chat/sessions');
  }

  public createChatSession(title?: string) {
    return this.request<{ session: ChatSession }>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  public getChatMessages(sessionId: string) {
    return this.request<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
  }

  public sendChatMessage(sessionId: string, content: string, documentIds?: string[]) {
    return this.request<{ user_message: ChatMessage; assistant_message: ChatMessage; supporting_facts: string[]; limitations: string | null }>(
      `/chat/sessions/${sessionId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content, document_ids: documentIds }),
      }
    );
  }

  public deleteChatSession(sessionId: string) {
    return this.request<{ message: string }>(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // Insights & Knowledge Discovery
  public getInsightsOverview() {
    return this.request<InsightsOverview>('/insights/overview');
  }

  public getCrossDocAnalysis(documentIds: string[]) {
    return this.request('/insights/cross-document', {
      method: 'POST',
      body: JSON.stringify({ document_ids: documentIds }),
    });
  }

  public getKnowledgeGraph(entityType?: string) {
    const q = entityType ? `?entity_type=${entityType}` : '';
    return this.request<{ nodes: GraphNode[]; edges: GraphEdge[]; total_nodes: number; total_edges: number }>(
      `/insights/knowledge-graph${q}`
    );
  }

  public getEntityDetails(entityId: string) {
    return this.request(`/insights/knowledge-graph/entities/${entityId}`);
  }

  // Analytics
  public getDashboardMetrics() {
    return this.request<DashboardMetrics>('/analytics/dashboard');
  }

  // Exports
  public getExportCsvUrl() {
    return `${API_BASE}/exports/documents.csv`;
  }

  public getExportJsonUrl() {
    return `${API_BASE}/exports/documents.json`;
  }
}

export const api = new ApiService();
