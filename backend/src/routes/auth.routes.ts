import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { inMemoryDb } from '../repositories/database.js';
import { isSupabaseConfigured, isGeminiConfigured, config } from '../config/index.js';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/health
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    integrations: {
      supabase: isSupabaseConfigured ? 'connected' : 'local_store',
      gemini: isGeminiConfigured ? 'active' : 'deterministic_engine',
    },
    version: '1.0.0',
  });
});

/**
 * GET /api/profile
 */
router.get('/profile', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = inMemoryDb.profiles.get(userId) || {
    id: userId,
    display_name: 'Sarah Jenkins',
    created_at: new Date().toISOString(),
  };

  res.json({
    profile: {
      ...profile,
      email: req.user!.email || 'sarah.jenkins@nexusglobal.com',
      role: req.user!.role || 'Chief Procurement Officer',
    },
  });
});

const profileUpdateSchema = z.object({
  display_name: z.string().min(2).max(100),
});

/**
 * PATCH /api/profile
 */
router.patch('/profile', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const validated = profileUpdateSchema.parse(req.body);

  const existing = inMemoryDb.profiles.get(userId) || {
    id: userId,
    display_name: validated.display_name,
    created_at: new Date().toISOString(),
  };

  existing.display_name = validated.display_name;
  inMemoryDb.profiles.set(userId, existing);

  res.json({
    message: 'Profile updated successfully',
    profile: existing,
  });
});

export default router;
