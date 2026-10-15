-- ==============================================================================
-- DocuMind AI: Intelligent Document Processing Platform
-- Migration: 00001_initial_schema.sql
-- Description: Complete schema, RLS, storage, triggers, and env config generator
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not installed or permission denied; continuing with standard text indexing.';
END $$;

-- 2. Trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- Table: profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Auto-create profile trigger on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- Table: documents
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_hash TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'unknown',
    language TEXT,
    processing_status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (processing_status IN ('uploaded', 'queued', 'extracting', 'validating', 'completed', 'needs_review', 'failed')),
    review_status TEXT NOT NULL DEFAULT 'not_required'
        CHECK (review_status IN ('not_required', 'pending_review', 'in_review', 'approved', 'rejected')),
    classification_confidence NUMERIC CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
    page_count INTEGER CHECK (page_count IS NULL OR page_count >= 1),
    extracted_text TEXT,
    summary TEXT,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT unique_user_file_hash UNIQUE (user_id, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON public.documents(review_status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- Table: document_extractions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL DEFAULT '1.0.0',
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    field_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_user_id ON public.document_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_extractions_data_gin ON public.document_extractions USING gin (extracted_data);

-- ------------------------------------------------------------------------------
-- Table: document_chunks
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    content TEXT NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON public.document_chunks USING gin(tsv);

-- ------------------------------------------------------------------------------
-- Table: validation_issues
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.validation_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    field_path TEXT,
    message TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    suggested_action TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_validation_document_id ON public.validation_issues(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_user_id ON public.validation_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_severity ON public.validation_issues(severity);
CREATE INDEX IF NOT EXISTS idx_validation_status ON public.validation_issues(status);

-- ------------------------------------------------------------------------------
-- Table: document_entities
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    display_value TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_document_id ON public.document_entities(document_id);
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON public.document_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_entities_normalized ON public.document_entities(normalized_value);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.document_entities(entity_type);

-- ------------------------------------------------------------------------------
-- Table: entity_relationships
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL REFERENCES public.document_entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES public.document_entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_self_referencing_relationship CHECK (source_entity_id <> target_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON public.entity_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON public.entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON public.entity_relationships(target_entity_id);

-- ------------------------------------------------------------------------------
-- Table: processing_jobs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'retrying')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_document_id ON public.processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.processing_jobs(status);

-- ------------------------------------------------------------------------------
-- Table: review_events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('field_correction', 'approved', 'rejected', 'returned_for_review')),
    field_path TEXT,
    previous_value JSONB,
    new_value JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_events_doc ON public.review_events(document_id);
CREATE INDEX IF NOT EXISTS idx_review_events_user ON public.review_events(user_id);

-- ------------------------------------------------------------------------------
-- Table: chat_sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trigger_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- Table: chat_messages
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Documents Policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Extractions Policies
DROP POLICY IF EXISTS "Users can view own extractions" ON public.document_extractions;
CREATE POLICY "Users can view own extractions" ON public.document_extractions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own extractions" ON public.document_extractions;
CREATE POLICY "Users can insert own extractions" ON public.document_extractions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own extractions" ON public.document_extractions;
CREATE POLICY "Users can update own extractions" ON public.document_extractions FOR UPDATE USING (auth.uid() = user_id);

-- Chunks Policies
DROP POLICY IF EXISTS "Users can view own chunks" ON public.document_chunks;
CREATE POLICY "Users can view own chunks" ON public.document_chunks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own chunks" ON public.document_chunks;
CREATE POLICY "Users can insert own chunks" ON public.document_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Validation Issues Policies
DROP POLICY IF EXISTS "Users can view own validation issues" ON public.validation_issues;
CREATE POLICY "Users can view own validation issues" ON public.validation_issues FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own validation issues" ON public.validation_issues;
CREATE POLICY "Users can insert own validation issues" ON public.validation_issues FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own validation issues" ON public.validation_issues;
CREATE POLICY "Users can update own validation issues" ON public.validation_issues FOR UPDATE USING (auth.uid() = user_id);

-- Entities Policies
DROP POLICY IF EXISTS "Users can view own entities" ON public.document_entities;
CREATE POLICY "Users can view own entities" ON public.document_entities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own entities" ON public.document_entities;
CREATE POLICY "Users can insert own entities" ON public.document_entities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own entities" ON public.document_entities;
CREATE POLICY "Users can delete own entities" ON public.document_entities FOR DELETE USING (auth.uid() = user_id);

-- Relationships Policies
DROP POLICY IF EXISTS "Users can view own relationships" ON public.entity_relationships;
CREATE POLICY "Users can view own relationships" ON public.entity_relationships FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own relationships" ON public.entity_relationships;
CREATE POLICY "Users can insert own relationships" ON public.entity_relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own relationships" ON public.entity_relationships;
CREATE POLICY "Users can delete own relationships" ON public.entity_relationships FOR DELETE USING (auth.uid() = user_id);

-- Processing Jobs Policies
DROP POLICY IF EXISTS "Users can view own jobs" ON public.processing_jobs;
CREATE POLICY "Users can view own jobs" ON public.processing_jobs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.processing_jobs;
CREATE POLICY "Users can insert own jobs" ON public.processing_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own jobs" ON public.processing_jobs;
CREATE POLICY "Users can update own jobs" ON public.processing_jobs FOR UPDATE USING (auth.uid() = user_id);

-- Review Events Policies
DROP POLICY IF EXISTS "Users can view own review events" ON public.review_events;
CREATE POLICY "Users can view own review events" ON public.review_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own review events" ON public.review_events;
CREATE POLICY "Users can insert own review events" ON public.review_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat Sessions Policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages Policies
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Storage Setup
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documind-documents', 'documind-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own documents to storage" ON storage.objects;
CREATE POLICY "Users can upload own documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documind-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own documents in storage" ON storage.objects;
CREATE POLICY "Users can view own documents in storage"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documind-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own documents in storage" ON storage.objects;
CREATE POLICY "Users can delete own documents in storage"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documind-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ------------------------------------------------------------------------------
-- Environment Variables Generator Functions & Views
-- ------------------------------------------------------------------------------

-- 1. Returns a structured table of every required variable with value template & explanation
CREATE OR REPLACE FUNCTION public.get_documind_env(project_ref TEXT DEFAULT NULL)
RETURNS TABLE (
    target_app TEXT,
    variable_name TEXT,
    suggested_value TEXT,
    is_secret TEXT,
    source_location TEXT,
    description TEXT
) AS $$
DECLARE
    ref TEXT := COALESCE(project_ref, 'your-project-ref');
    base_url TEXT := 'https://' || ref || '.supabase.co';
BEGIN
    RETURN QUERY VALUES
    -- Backend Variables (apps/api/.env)
    ('Backend (apps/api/.env)', 'NODE_ENV', 'development', 'NO', 'Local environment', 'Node execution environment (development/production/test)'),
    ('Backend (apps/api/.env)', 'PORT', '5000', 'NO', 'Local environment', 'Backend REST API port'),
    ('Backend (apps/api/.env)', 'FRONTEND_URL', 'http://localhost:5173', 'NO', 'Local environment', 'Frontend origin allowed by CORS'),
    ('Backend (apps/api/.env)', 'SUPABASE_URL', base_url, 'NO', 'Supabase Dashboard -> Settings -> API', 'Supabase Project URL'),
    ('Backend (apps/api/.env)', 'SUPABASE_ANON_KEY', 'your_supabase_anon_key_here', 'NO', 'Supabase Dashboard -> Settings -> API', 'Supabase public anon key for API authentication'),
    ('Backend (apps/api/.env)', 'SUPABASE_SERVICE_ROLE_KEY', 'your_supabase_service_role_key_here', 'YES', 'Supabase Dashboard -> Settings -> API', 'Supabase secret service-role key (Keep server-side only!)'),
    ('Backend (apps/api/.env)', 'SUPABASE_STORAGE_BUCKET', 'documind-documents', 'NO', 'Supabase Dashboard -> Storage', 'Private document storage bucket (created by this migration)'),
    ('Backend (apps/api/.env)', 'GEMINI_API_KEY', 'your_gemini_api_key_here', 'YES', 'Google AI Studio (https://aistudio.google.com/)', 'Google Gemini API key for document extraction, validation, & chat'),
    ('Backend (apps/api/.env)', 'GEMINI_MODEL', 'gemini-2.5-flash', 'NO', 'Google AI Model Registry', 'Gemini model identifier (gemini-2.5-flash or gemini-1.5-flash)'),
    ('Backend (apps/api/.env)', 'MAX_FILE_SIZE_MB', '25', 'NO', 'Application Configuration', 'Maximum document upload size limit in MB'),
    ('Backend (apps/api/.env)', 'MAX_FILES_PER_UPLOAD', '10', 'NO', 'Application Configuration', 'Maximum files permitted in a single multi-file upload batch'),
    ('Backend (apps/api/.env)', 'OCR_LANGUAGE', 'eng', 'NO', 'Tesseract OCR', 'Language dictionary code for OCR (e.g. eng, spa, fra, deu)'),
    ('Backend (apps/api/.env)', 'AI_REQUEST_TIMEOUT_MS', '30000', 'NO', 'Application Configuration', 'Timeout in milliseconds for Google Gemini AI processing requests'),
    ('Backend (apps/api/.env)', 'AI_MAX_RETRIES', '3', 'NO', 'Application Configuration', 'Maximum exponential backoff retries for transient AI API errors'),
    ('Backend (apps/api/.env)', 'RATE_LIMIT_WINDOW_MS', '60000', 'NO', 'Security Configuration', 'Rate limiting sliding window in milliseconds (1 minute)'),
    ('Backend (apps/api/.env)', 'RATE_LIMIT_MAX_REQUESTS', '100', 'NO', 'Security Configuration', 'Maximum allowed API requests per IP in sliding window'),

    -- Frontend Variables (apps/web/.env)
    ('Frontend (apps/web/.env)', 'VITE_API_BASE_URL', 'http://localhost:5000/api', 'NO', 'Local environment', 'Backend API REST endpoint for frontend fetch requests'),
    ('Frontend (apps/web/.env)', 'VITE_SUPABASE_URL', base_url, 'NO', 'Supabase Dashboard -> Settings -> API', 'Public Supabase URL for client authentication & real-time'),
    ('Frontend (apps/web/.env)', 'VITE_SUPABASE_ANON_KEY', 'your_supabase_anon_key_here', 'NO', 'Supabase Dashboard -> Settings -> API', 'Public Supabase anon key safe for browser exposure');
END;
$$ LANGUAGE plpgsql;

-- 2. Returns formatted, copy-pasteable .env file blocks
CREATE OR REPLACE FUNCTION public.get_documind_env_block(project_ref TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    ref TEXT := COALESCE(project_ref, 'your-project-ref');
    url TEXT := 'https://' || ref || '.supabase.co';
    output TEXT;
BEGIN
    output := E'# ==============================================================================\n'
           || E'# DOCUMIND AI — GENERATED ENVIRONMENT CONFIGURATION\n'
           || E'# ==============================================================================\n\n'
           || E'# ------------------------------------------------------------------------------\n'
           || E'# 1. apps/api/.env (BACKEND SERVER)\n'
           || E'# ------------------------------------------------------------------------------\n'
           || E'NODE_ENV=development\n'
           || E'PORT=5000\n'
           || E'FRONTEND_URL=http://localhost:5173\n'
           || E'SUPABASE_URL=' || url || E'\n'
           || E'SUPABASE_ANON_KEY=your_supabase_anon_key_here\n'
           || E'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here\n'
           || E'SUPABASE_STORAGE_BUCKET=documind-documents\n'
           || E'GEMINI_API_KEY=your_gemini_api_key_here\n'
           || E'GEMINI_MODEL=gemini-2.5-flash\n'
           || E'MAX_FILE_SIZE_MB=25\n'
           || E'MAX_FILES_PER_UPLOAD=10\n'
           || E'OCR_LANGUAGE=eng\n'
           || E'AI_REQUEST_TIMEOUT_MS=30000\n'
           || E'AI_MAX_RETRIES=3\n'
           || E'RATE_LIMIT_WINDOW_MS=60000\n'
           || E'RATE_LIMIT_MAX_REQUESTS=100\n\n'
           || E'# ------------------------------------------------------------------------------\n'
           || E'# 2. apps/web/.env (FRONTEND APPLICATION)\n'
           || E'# ------------------------------------------------------------------------------\n'
           || E'VITE_API_BASE_URL=http://localhost:5000/api\n'
           || E'VITE_SUPABASE_URL=' || url || E'\n'
           || E'VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here\n';
           
    RETURN output;
END;
$$ LANGUAGE plpgsql;

-- 3. Convenient Public Views for instant inspection
CREATE OR REPLACE VIEW public.documind_environment_variables AS
SELECT 
    target_app,
    variable_name,
    suggested_value,
    is_secret,
    source_location,
    description
FROM public.get_documind_env();

CREATE OR REPLACE VIEW public.documind_env_template AS
SELECT public.get_documind_env_block() AS env_file_template;

-- ==============================================================================
-- IMMEDIATE EXECUTION OUTPUT
-- Executing this single migration script immediately returns all required variables:
-- ==============================================================================
SELECT 
    target_app,
    variable_name,
    suggested_value,
    is_secret,
    source_location,
    description
FROM public.documind_environment_variables;
