import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';
import { retrievalService } from '../services/retrieval/retrieval.service.js';
import { geminiService } from '../services/gemini/gemini.service.js';

const router = Router();

/**
 * POST /api/chat/sessions
 */
router.post('/sessions', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { title } = req.body;

  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    user_id: userId,
    title: title || 'New document inquiry',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDb.chatSessions.set(sessionId, session);
  res.status(201).json({ session });
});

/**
 * GET /api/chat/sessions
 */
router.get('/sessions', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  const sessions = Array.from(inMemoryDb.chatSessions.values())
    .filter((s) => s.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  res.json({ sessions });
});

/**
 * GET /api/chat/sessions/:id/messages
 */
router.get('/sessions/:id/messages', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const session = inMemoryDb.chatSessions.get(req.params.id);

  if (!session || session.user_id !== userId) {
    res.status(404).json({ error: 'Chat session not found or unauthorized.' });
    return;
  }

  const messages = Array.from(inMemoryDb.chatMessages.values())
    .filter((m) => m.session_id === session.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  res.json({ session, messages });
});

const askQuestionSchema = z.object({
  content: z.string().min(2).max(2000),
  document_ids: z.array(z.string().uuid()).optional(),
});

/**
 * POST /api/chat/sessions/:id/messages
 * Evidence-grounded Question Answering with Citations
 */
router.post('/sessions/:id/messages', authenticateUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const session = inMemoryDb.chatSessions.get(req.params.id);

  if (!session || session.user_id !== userId) {
    res.status(404).json({ error: 'Chat session not found or unauthorized.' });
    return;
  }

  const { content, document_ids } = askQuestionSchema.parse(req.body);

  // 1. Record User Message
  const userMsgId = uuidv4();
  const userMessage = {
    id: userMsgId,
    session_id: session.id,
    user_id: userId,
    role: 'user' as const,
    content,
    citations: [],
    created_at: new Date().toISOString(),
  };
  inMemoryDb.chatMessages.set(userMsgId, userMessage);

  // 2. Gather Document Chunks for Retrieval
  const userDocs = Array.from(inMemoryDb.documents.values()).filter((d) => {
    if (d.user_id !== userId) return false;
    if (document_ids && document_ids.length > 0) {
      return document_ids.includes(d.id);
    }
    return true;
  });

  const docNameMap = new Map(userDocs.map((d) => [d.id, d.file_name]));
  const candidateChunks = Array.from(inMemoryDb.chunks.values())
    .filter((c) => docNameMap.has(c.document_id))
    .map((c) => ({
      ...c,
      document_name: docNameMap.get(c.document_id) || 'Document',
    }));

  // 3. Search and Retrieve relevant evidence
  const retrievedEvidence = retrievalService.searchChunks(content, candidateChunks, 4);

  // 4. Generate Grounded AI Answer with Gemini
  const aiResponse = await geminiService.answerQuestion(
    content,
    retrievedEvidence.map((r) => ({
      document_id: r.document_id,
      document_name: r.document_name,
      page: r.page,
      excerpt: r.excerpt,
    }))
  );

  // 5. Save Assistant Message
  const assistantMsgId = uuidv4();
  const assistantMessage = {
    id: assistantMsgId,
    session_id: session.id,
    user_id: userId,
    role: 'assistant' as const,
    content: aiResponse.answer,
    citations: aiResponse.citations,
    created_at: new Date().toISOString(),
  };
  inMemoryDb.chatMessages.set(assistantMsgId, assistantMessage);

  // Update session updated_at
  session.updated_at = new Date().toISOString();

  res.status(201).json({
    user_message: userMessage,
    assistant_message: assistantMessage,
    supporting_facts: aiResponse.supporting_facts,
    limitations: aiResponse.limitations,
  });
});

/**
 * DELETE /api/chat/sessions/:id
 */
router.delete('/sessions/:id', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const session = inMemoryDb.chatSessions.get(req.params.id);

  if (!session || session.user_id !== userId) {
    res.status(404).json({ error: 'Chat session not found or unauthorized.' });
    return;
  }

  inMemoryDb.chatSessions.delete(session.id);
  for (const [id, msg] of inMemoryDb.chatMessages.entries()) {
    if (msg.session_id === session.id) {
      inMemoryDb.chatMessages.delete(id);
    }
  }

  res.json({ message: 'Chat session deleted successfully.' });
});

export default router;
