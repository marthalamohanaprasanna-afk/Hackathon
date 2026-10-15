export interface DocumentChunk {
  id?: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
}

export interface RetrievalResult {
  document_id: string;
  document_name: string;
  page: number;
  excerpt: string;
  score: number;
}

export class RetrievalService {
  /**
   * Split document text into sliding-window overlapping chunks
   */
  public chunkText(
    documentId: string,
    userId: string,
    fullText: string,
    chunkSize = 800,
    chunkOverlap = 150
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    if (!fullText || fullText.trim().length === 0) return chunks;

    const cleaned = fullText.replace(/\r\n/g, '\n');
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
      const end = Math.min(start + chunkSize, cleaned.length);
      const chunkText = cleaned.slice(start, end).trim();

      if (chunkText.length > 20) {
        // Approximate page number (roughly 2000 chars per page)
        const approximatePage = Math.max(1, Math.floor(start / 2000) + 1);

        chunks.push({
          document_id: documentId,
          user_id: userId,
          chunk_index: index++,
          page_number: approximatePage,
          content: chunkText,
        });
      }

      start += chunkSize - chunkOverlap;
    }

    return chunks;
  }

  /**
   * Retrieve relevant document excerpts based on query terms
   */
  public searchChunks(
    query: string,
    chunks: Array<DocumentChunk & { document_name: string }>,
    limit = 5
  ): RetrievalResult[] {
    if (!query || query.trim().length === 0 || chunks.length === 0) {
      return [];
    }

    const queryTerms = query
      .toLowerCase()
      .replace(/[^\w\s$]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored: RetrievalResult[] = [];

    for (const chunk of chunks) {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          // Term frequency boost
          const matches = contentLower.split(term).length - 1;
          score += matches * (term.startsWith('$') || !isNaN(Number(term)) ? 3 : 1);
        }
      }

      if (score > 0) {
        scored.push({
          document_id: chunk.document_id,
          document_name: chunk.document_name,
          page: chunk.page_number,
          excerpt: chunk.content,
          score,
        });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}

export const retrievalService = new RetrievalService();
