import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import path from 'path';

describe('DocuMind AI REST API Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.integrations).toBeDefined();
  });

  it('GET /api/profile returns authenticated user profile', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.display_name).toContain('Sarah Jenkins');
  });

  it('GET /api/documents returns seeded documents list with pagination', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(res.body.documents).toBeDefined();
    expect(res.body.documents.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('GET /api/reviews returns documents awaiting human review', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(200);
    expect(res.body.review_queue).toBeDefined();
    expect(Array.isArray(res.body.review_queue)).toBe(true);
  });

  it('GET /api/insights/overview returns cross-document summary & metrics', async () => {
    const res = await request(app).get('/api/insights/overview');
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.discrepancies).toBeDefined();
    expect(res.body.recurring_patterns).toBeDefined();
  });

  it('GET /api/knowledge-graph returns nodes and edges', async () => {
    const res = await request(app).get('/api/insights/knowledge-graph');
    expect(res.status).toBe(200);
    expect(res.body.nodes).toBeDefined();
    expect(res.body.edges).toBeDefined();
    expect(res.body.nodes.length).toBeGreaterThan(0);
  });

  it('GET /api/analytics/dashboard returns database-backed metrics', async () => {
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.kpis.total_uploaded).toBeGreaterThan(0);
    expect(res.body.category_distribution).toBeDefined();
    expect(res.body.severity_distribution).toBeDefined();
  });

  it('GET /api/exports/documents.csv exports CSV formatted data', async () => {
    const res = await request(app).get('/api/exports/documents.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Document ID');
    expect(res.text).toContain('File Name');
  });

  it('GET /api/exports/documents.json exports structured JSON workspace', async () => {
    const res = await request(app).get('/api/exports/documents.json');
    expect(res.status).toBe(200);
    expect(res.body.documents).toBeDefined();
    expect(res.body.export_metadata).toBeDefined();
  });

  it('POST /api/chat/sessions/:id/messages answers questions with citations', async () => {
    const sessionRes = await request(app).post('/api/chat/sessions').send({ title: 'Test QA' });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.session.id;

    const chatRes = await request(app)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .send({ content: 'What is the payment due date for the invoice?' });

    expect(chatRes.status).toBe(201);
    expect(chatRes.body.assistant_message).toBeDefined();
    expect(chatRes.body.assistant_message.content).toBeDefined();
  });
});
