import { describe, it, expect } from 'vitest';
import { retrievalService } from '../../src/services/retrieval/retrieval.service.js';

describe('RetrievalService', () => {
  const sampleText = `
ACME TECHNOLOGIES INC. — ENTERPRISE CLOUD SOLUTIONS
100 Silicon Way, Suite 400, San Jose, CA 95112
INVOICE INV-2024-8841
Date: October 15, 2024
Due Date: November 15, 2024
Total Amount Due: $45,850.00 USD
Payment terms Net 30 days via Wire Transfer.
Purchase order reference PO-99420.
  `.repeat(10); // make it multi-chunk length

  it('splits text into sliding-window chunks with overlap', () => {
    const chunks = retrievalService.chunkText('doc-test-1', 'user-test-1', sampleText, 400, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[1].chunk_index).toBe(1);
    expect(chunks[0].content.length).toBeGreaterThan(20);
  });

  it('scores and retrieves matching chunks based on search query terms', () => {
    const chunks = [
      {
        document_id: 'doc-1',
        user_id: 'user-1',
        chunk_index: 0,
        page_number: 1,
        content: 'Acme Technologies invoice payment is due on November 15, 2024.',
        document_name: 'Invoice_Acme.pdf',
      },
      {
        document_id: 'doc-2',
        user_id: 'user-1',
        chunk_index: 0,
        page_number: 1,
        content: 'Grand Hyatt hotel lodging receipt in Seattle charged $1,142.50.',
        document_name: 'Receipt_Hyatt.jpg',
      },
    ];

    const results = retrievalService.searchChunks('Acme invoice due date', chunks);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].document_name).toBe('Invoice_Acme.pdf');
    expect(results[0].excerpt).toContain('November 15, 2024');
  });
});
