import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Supabase Configuration
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('documind-documents'),

  // Google Gemini Configuration
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  // Upload limits
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  MAX_FILES_PER_UPLOAD: z.coerce.number().default(10),

  // OCR
  OCR_LANGUAGE: z.string().default('eng'),

  // AI Pipeline settings
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_MAX_RETRIES: z.coerce.number().default(3),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const config = loadConfig();

export const isSupabaseConfigured = Boolean(
  config.SUPABASE_URL &&
  !config.SUPABASE_URL.includes('your-project-ref') &&
  (config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY)
);

export const isGeminiConfigured = Boolean(
  config.GEMINI_API_KEY &&
  !config.GEMINI_API_KEY.includes('your_gemini_api_key')
);
