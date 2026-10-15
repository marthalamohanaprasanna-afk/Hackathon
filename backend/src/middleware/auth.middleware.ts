import { Request, Response, NextFunction } from 'express';
import { supabase, DEMO_USER_ID, inMemoryDb } from '../repositories/database.js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // 1. If Supabase is configured and bearer token is provided
  if (authHeader && authHeader.startsWith('Bearer ') && supabase) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
        return next();
      }
    } catch (err) {
      console.warn('Supabase token verification failed, falling back to workspace session.');
    }
  }

  // 2. Default to authenticated workspace session (demo user)
  req.user = {
    id: DEMO_USER_ID,
    email: 'sarah.jenkins@nexusglobal.com',
    role: 'authenticated',
  };

  // Ensure demo profile exists
  if (!inMemoryDb.profiles.has(DEMO_USER_ID)) {
    inMemoryDb.profiles.set(DEMO_USER_ID, {
      id: DEMO_USER_ID,
      display_name: 'Sarah Jenkins (Chief Procurement Officer)',
      created_at: new Date().toISOString(),
    });
  }

  return next();
};
