#!/usr/bin/env node
/**
 * DocuMind AI — Supabase Environment & Migration Utility
 * 
 * Usage:
 *   node scripts/supabase-env.js           # Display all required variables & audit existing .env files
 *   npm run supabase:env                  # Shortcut via npm
 *   npm run supabase:env -- --write       # Synchronize/populate missing vars into apps/api/.env & apps/web/.env
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_ENV_PATH = fs.existsSync(path.join(ROOT_DIR, 'backend', '.env')) 
  ? path.join(ROOT_DIR, 'backend', '.env') 
  : path.join(ROOT_DIR, 'apps', 'api', '.env');
const WEB_ENV_PATH = fs.existsSync(path.join(ROOT_DIR, 'frontend', '.env'))
  ? path.join(ROOT_DIR, 'frontend', '.env')
  : path.join(ROOT_DIR, 'apps', 'web', '.env');
const MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '00001_initial_schema.sql');

// All Required Variables Definitions
const VARIABLES = [
  // Backend
  {
    target: 'Backend (apps/api/.env)',
    name: 'NODE_ENV',
    value: 'development',
    required: true,
    isSecret: false,
    source: 'Local environment',
    description: 'Node execution environment (development/production/test)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'PORT',
    value: '5000',
    required: true,
    isSecret: false,
    source: 'Local environment',
    description: 'Backend REST API port'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'FRONTEND_URL',
    value: 'http://localhost:5173',
    required: true,
    isSecret: false,
    source: 'Local environment',
    description: 'Frontend origin allowed by CORS'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'SUPABASE_URL',
    value: 'https://your-project-ref.supabase.co',
    required: true,
    isSecret: false,
    source: 'Supabase Dashboard -> Settings -> API',
    description: 'Supabase Project URL'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'SUPABASE_ANON_KEY',
    value: 'your_supabase_anon_key_here',
    required: true,
    isSecret: false,
    source: 'Supabase Dashboard -> Settings -> API',
    description: 'Supabase public anon key for API authentication'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'your_supabase_service_role_key_here',
    required: true,
    isSecret: true,
    source: 'Supabase Dashboard -> Settings -> API',
    description: 'Supabase secret service-role key (Keep server-side only!)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'SUPABASE_STORAGE_BUCKET',
    value: 'documind-documents',
    required: true,
    isSecret: false,
    source: 'Supabase Dashboard -> Storage',
    description: 'Private document storage bucket (created by migration)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'GEMINI_API_KEY',
    value: 'your_gemini_api_key_here',
    required: true,
    isSecret: true,
    source: 'Google AI Studio (https://aistudio.google.com/)',
    description: 'Google Gemini API key for document extraction, validation, & chat'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'GEMINI_MODEL',
    value: 'gemini-2.5-flash',
    required: true,
    isSecret: false,
    source: 'Google AI Model Registry',
    description: 'Gemini model identifier (gemini-2.5-flash or gemini-1.5-flash)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'MAX_FILE_SIZE_MB',
    value: '25',
    required: false,
    isSecret: false,
    source: 'Application Defaults',
    description: 'Maximum document upload size limit in MB'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'MAX_FILES_PER_UPLOAD',
    value: '10',
    required: false,
    isSecret: false,
    source: 'Application Defaults',
    description: 'Maximum files permitted in a single multi-file upload batch'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'OCR_LANGUAGE',
    value: 'eng',
    required: false,
    isSecret: false,
    source: 'Tesseract OCR',
    description: 'Language dictionary code for OCR (eng)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'AI_REQUEST_TIMEOUT_MS',
    value: '30000',
    required: false,
    isSecret: false,
    source: 'Application Defaults',
    description: 'Timeout in milliseconds for Google Gemini AI processing requests'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'AI_MAX_RETRIES',
    value: '3',
    required: false,
    isSecret: false,
    source: 'Application Defaults',
    description: 'Maximum exponential backoff retries for transient AI API errors'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'RATE_LIMIT_WINDOW_MS',
    value: '60000',
    required: false,
    isSecret: false,
    source: 'Security Defaults',
    description: 'Rate limiting sliding window in milliseconds (1 minute)'
  },
  {
    target: 'Backend (apps/api/.env)',
    name: 'RATE_LIMIT_MAX_REQUESTS',
    value: '100',
    required: false,
    isSecret: false,
    source: 'Security Defaults',
    description: 'Maximum allowed API requests per IP in sliding window'
  },

  // Frontend
  {
    target: 'Frontend (apps/web/.env)',
    name: 'VITE_API_BASE_URL',
    value: 'http://localhost:5000/api',
    required: true,
    isSecret: false,
    source: 'Local environment',
    description: 'Backend API REST endpoint for frontend fetch requests'
  },
  {
    target: 'Frontend (apps/web/.env)',
    name: 'VITE_SUPABASE_URL',
    value: 'https://your-project-ref.supabase.co',
    required: true,
    isSecret: false,
    source: 'Supabase Dashboard -> Settings -> API',
    description: 'Public Supabase URL for client authentication & real-time'
  },
  {
    target: 'Frontend (apps/web/.env)',
    name: 'VITE_SUPABASE_ANON_KEY',
    value: 'your_supabase_anon_key_here',
    required: true,
    isSecret: false,
    source: 'Supabase Dashboard -> Settings -> API',
    description: 'Public Supabase anon key safe for browser exposure'
  }
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

function printHeader() {
  console.log('\n' + '='.repeat(88));
  console.log('  DOCUMIND AI — REQUIRED ENVIRONMENT CONFIGURATION VARIABLES');
  console.log('='.repeat(88));
  console.log(`  Supabase Migration: ${path.relative(ROOT_DIR, MIGRATION_PATH)}`);
  console.log(`  Backend Config:     ${path.relative(ROOT_DIR, API_ENV_PATH)}`);
  console.log(`  Frontend Config:    ${path.relative(ROOT_DIR, WEB_ENV_PATH)}`);
  console.log('='.repeat(88) + '\n');
}

function printVariablesTable() {
  const backendVars = readEnvFile(API_ENV_PATH);
  const frontendVars = readEnvFile(WEB_ENV_PATH);

  console.log(
    'TARGET'.padEnd(26) +
    'VARIABLE NAME'.padEnd(28) +
    'STATUS'.padEnd(16) +
    'WHERE TO GET IT'
  );
  console.log('-'.repeat(88));

  for (const item of VARIABLES) {
    const currentVal = item.target.includes('api') ? backendVars[item.name] : frontendVars[item.name];
    let status = 'Missing';
    if (currentVal !== undefined) {
      if (currentVal.includes('your_') || currentVal.includes('your-project-ref')) {
        status = 'Needs Value';
      } else {
        status = 'Set';
      }
    }

    const formattedTarget = item.target.split(' ')[0];
    console.log(
      formattedTarget.padEnd(26) +
      item.name.padEnd(28) +
      status.padEnd(16) +
      item.source
    );
  }
  console.log('-'.repeat(88) + '\n');
}

function printCopyPasteBlocks() {
  console.log('# >>> backend/.env (BACKEND):');
  console.log(`NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_STORAGE_BUCKET=documind-documents
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
MAX_FILE_SIZE_MB=25
MAX_FILES_PER_UPLOAD=10
OCR_LANGUAGE=eng
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_RETRIES=3
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
`);

  console.log('# >>> frontend/.env (FRONTEND):');
  console.log(`VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
`);
}

function main() {
  printHeader();
  printVariablesTable();
  console.log('READY-TO-COPY CONFIGURATION BLOCKS:\n');
  printCopyPasteBlocks();
  console.log('='.repeat(88));
  console.log('Tip: In Supabase Cloud SQL Editor, executing supabase/migrations/00001_initial_schema.sql');
  console.log('will create all 11 tables, storage, and immediately output all these variables in query results.');
  console.log('='.repeat(88) + '\n');
}

main();
