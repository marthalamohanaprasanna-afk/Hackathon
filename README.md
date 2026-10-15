# DocuMind AI — Intelligent Document Processing Platform

![DocuMind AI Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ecf8e.svg)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%202.5-orange.svg)](https://aistudio.google.com/)
[![Tests](https://img.shields.io/badge/Tests-16%20Passed-emerald.svg)]()

**DocuMind AI** is an enterprise-grade Intelligent Document Processing (IDP) platform that transforms structured and unstructured business documents into validated, searchable, cross-referenced, and actionable intelligence. Built with React, Vite, Node.js, Express, Supabase PostgreSQL with Row Level Security (RLS), and Google's official `@google/genai` SDK.

---

## 🌟 Key Capabilities

### 1. Multi-Modal Document Ingestion & Pipeline
- **Digital & Scanned Processing**: Native PDF text parsing via `pdf-parse` and OCR for scanned documents/images via `tesseract.js`.
- **Supported Formats**: PDF, PNG, JPG, JPEG, TXT, CSV, Markdown.
- **Cryptographic Duplicate Protection**: Automatic SHA-256 file hashing to prevent duplicate uploads within user workspaces.
- **Sequential Pipeline**: Upload $\rightarrow$ OCR $\rightarrow$ Gemini Classification $\rightarrow$ Structured Extraction $\rightarrow$ Deterministic Validation $\rightarrow$ Summary Generation $\rightarrow$ Entity Graph Linking $\rightarrow$ RAG Indexing $\rightarrow$ Human Review Queuing.

### 2. Automated Multi-Category Classification
- Automatically categorizes business documents into:
  - **Invoices** & **Purchase Orders**
  - **Receipts** & Expense Statements
  - **Contracts** & Master Services Agreements (MSAs)
  - **Application Forms** & Identity Records
  - **Financial Reports** & Executive Business Reports
  - **Certificates** & Policy Documents
- Confidence scoring with automatic human review routing for low-confidence documents.

### 3. Structured Information Extraction
- Converts unstructured document prose into strongly-typed JSON records validated with **Zod**.
- Extracts itemized line items (quantity, unit price, totals), dates, monetary amounts, parties, supplier/buyer entities, obligations, and deadlines.
- Distinguishes absent/unreadable fields from zero values without inventing false information.

### 4. Deterministic Validation & Discrepancy Engine
- Independent deterministic rule verification operating alongside AI review:
  - **Arithmetic Consistency**: Verifies that $\text{Subtotal} + \text{Tax} + \text{Surcharge} = \text{Total}$ (flags math inconsistencies).
  - **Cross-Document Variance**: Detects when an Invoice amount exceeds an authorized Purchase Order ceiling (e.g. INV-2024-8841 vs PO-99420).
  - **Date Logic Verification**: Detects inverted date sequences (e.g. payment due date preceding issue date).
  - **Missing Required Fields**: Flags missing mandatory metadata per category.
  - **Upcoming Deadlines**: Detects contract renewal milestones, notice windows, and payment due dates.

### 5. Grounded Conversational AI Assistant (RAG)
- Conversational interface powered by Google Gemini and sliding-window chunk retrieval.
- Answers are strictly grounded in retrieved document evidence and include **exact citations** (document name, page number, excerpt).
- Document scope selector allows querying across all workspace documents or filtering to specific files.

### 6. Document Intelligence Knowledge Graph
- Interactive SVG/Canvas node-link network visualizing real entities:
  - **Organizations** (Acme Technologies Inc., Nexus Global Logistics)
  - **Document Identifiers** (INV-2024-8841, PO-99420)
  - **Monetary Values** & **Deadlines**
- Directed relationship edges: `issued_document`, `billed_to`, `references_po`, `authorized_purchase_order`, `has_financial_value`, `payment_due_by`.
- Interactive node inspector side panel showing entity metadata, linked evidence, and source file shortcuts.

### 7. Human Verification & Audit Trail
- Dedicated **Review Queue** (`/review-queue`) for documents with discrepancies or missing fields.
- **Field-level Correction Editor**: Correct values with reviewer notes while permanently preserving original extracted data.
- **Immutable Audit Trail**: Chronological event history tracking previous value, new value, reviewer, and timestamps.
- One-click approval and rejection workflows.

### 8. Analytics & Enterprise Export
- Real database-backed metrics dashboard with Recharts visualizations.
- Full workspace export to **CSV** and **structured JSON**.
- Single-document comprehensive processing reports.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOCUMIND WEB CLIENT                              │
│         React 18 + Vite + Tailwind CSS + Lucide Icons + TanStack Query      │
│  [Dashboard] [Documents] [Upload] [Detail/Inspect] [Review] [Assistant]    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (Bearer JWT / CORS)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOCUMIND BACKEND API                             │
│                  Node.js + Express + TypeScript + Zod                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Multer Upload] ──> [SHA-256 Hash] ──> [PDF-Parse / Tesseract OCR]         │
│                                                │                            │
│  [Gemini Service (@google/genai)] <────────────┤ Extracted Text             │
│   ├─ Classification & Structured Extraction    ▼                            │
│   ├─ Document Summaries & Obligations  [Deterministic Validation Engine]   │
│   └─ Grounded RAG with Citations        ├─ Arithmetic Checker (Tax/Total)   │
│                                         ├─ Cross-Doc PO Variance Checker    │
│  [Knowledge Graph Service]              ├─ Date Logic & Deadlines           │
│   └─ Entity Extraction & Linking        └─ Missing Required Field Rules     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE POSTGRESQL & STORAGE                         │
│   - PostgreSQL 15+ with Row-Level Security (RLS) on all user tables         │
│   - Profiles, Documents, Extractions, Chunks, Issues, Entities, Reviews     │
│   - Private Storage Bucket: 'documind-documents' (UUID isolation)           │
│   - Embedded In-Memory High-Performance Store with Pre-Seeded Dataset       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Clear Differentiation: Frontend vs. Backend

DocuMind AI enforces a strict, decoupled architecture between the **Frontend** (`apps/web`) and the **Backend** (`apps/api`). The browser never performs document processing, never touches database queries, and never holds AI API credentials.

| Dimension | Frontend (`apps/web`) | Backend (`apps/api`) |
| :--- | :--- | :--- |
| **Primary Role** | User Interface, Interactive Data Visualization & User Experience | Core IDP Pipeline, AI Orchestration, File Security & Validation |
| **Runtime Environment** | Web Browser (Client-side DOM) | Node.js v18+ (Server-side runtime) |
| **Technology Stack** | React 18, Vite, TypeScript, Tailwind CSS, Recharts | Node.js, Express.js, TypeScript, Zod, Multer |
| **Document Processing** | Staged file previews, UI progress indicators, drag-and-drop | `pdf-parse` (digital PDF extraction) & `tesseract.js` (OCR engine) |
| **AI Integration** | None (sends user questions/prompts to API endpoints) | Direct integration with `@google/genai` (Gemini 2.5 Flash SDK) |
| **Validation Rules** | Client form validation (file size < 25MB, supported extensions) | Deterministic business validation (math totals, PO limits, date logic) |
| **Data Access** | Consumes JSON REST API via `fetch` & TanStack Query | Connects to Supabase PostgreSQL, manages Storage & RLS |
| **Security & Secrets** | Only public variables (`VITE_API_BASE_URL`, `VITE_SUPABASE_ANON_KEY`) | Holds `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, file system disk |
| **Port / Default URL** | `http://localhost:5173` | `http://localhost:5000` |
| **Build Artifact** | Static SPA bundle (`apps/web/dist/`) | Compiled CommonJS/ESM JavaScript (`apps/api/dist/`) |

### Key Architectural Boundaries

1. **Security Isolation**:
   - The **Gemini API Key** and **Supabase Service Role Key** exist exclusively in server-side memory (`apps/api/src/config/index.ts`). They are **never** bundled or transmitted to `apps/web`.
   - Uploaded files are treated as untrusted binary data. File size, MIME type, and cryptographic SHA-256 hashes are verified by backend middleware before parsing.

2. **Data Flow & Communication Contract**:
   - The Frontend communicates with the Backend strictly over standard REST endpoints using JSON payloads and Multipart Form Data for uploads.
   - All input requests and model outputs are parsed through strongly-typed **Zod** schemas on the server.

3. **Autonomous Execution**:
   - Long-running document extraction and OCR run in an asynchronous pipeline on the Backend so the user interface never freezes or blocks.
   - The Frontend polls or receives state updates (`queued` $\rightarrow$ `extracting` $\rightarrow$ `validating` $\rightarrow$ `completed` / `needs_review`).

---

## 📁 Repository Structure

```text
documind-ai/
├── apps/
│   ├── web/                              # React + Vite Frontend
│   │   ├── src/
│   │   │   ├── components/               # Reusable UI components
│   │   │   │   ├── common/               # StatusBadge, SeverityBadge
│   │   │   │   └── layout/               # Sidebar, Topbar
│   │   │   ├── layouts/AppLayout.tsx     # Application shell layout
│   │   │   ├── pages/                    # Routed Views
│   │   │   │   ├── DashboardPage.tsx     # KPIs, charts, recent documents
│   │   │   │   ├── DocumentsPage.tsx     # Document library & filters
│   │   │   │   ├── UploadPage.tsx        # Drag-and-drop ingestion
│   │   │   │   ├── DocumentDetailPage.tsx# Split view inspection
│   │   │   │   ├── DocumentReviewPage.tsx# Field correction & audit
│   │   │   │   ├── ReviewQueuePage.tsx   # Human verification queue
│   │   │   │   ├── AssistantPage.tsx     # Grounded AI Chatbot
│   │   │   │   ├── InsightsPage.tsx      # Spend variance & anomalies
│   │   │   │   ├── KnowledgeGraphPage.tsx# Entity relationship network
│   │   │   │   ├── SettingsPage.tsx      # System health & profile
│   │   │   │   ├── LoginPage.tsx         # User sign-in
│   │   │   │   ├── SignupPage.tsx        # Account registration
│   │   │   │   └── ForgotPasswordPage.tsx# Password recovery
│   │   │   ├── services/api.ts           # Frontend API client
│   │   │   ├── types/index.ts            # Frontend TypeScript types
│   │   │   ├── App.tsx                   # Routes & TanStack Query Provider
│   │   │   └── main.tsx                  # Vite entry point
│   │   ├── index.html                    # SEO metadata & fonts
│   │   ├── tailwind.config.js            # Design tokens & color palette
│   │   └── package.json
│   │
│   └── api/                              # Node.js + Express Backend
│       ├── src/
│       │   ├── config/index.ts           # Zod-validated environment config
│       │   ├── middleware/               # Auth, Upload, ErrorHandler
│       │   ├── repositories/database.ts  # Supabase client + In-Memory store
│       │   ├── routes/                   # REST Endpoints
│       │   │   ├── auth.routes.ts        # Health & Profile
│       │   │   ├── documents.routes.ts   # Upload, list, inspect, reprocess
│       │   │   ├── reviews.routes.ts     # Review queue & field corrections
│       │   │   ├── chat.routes.ts        # RAG Assistant & sessions
│       │   │   ├── insights.routes.ts    # Cross-document analysis & graph
│       │   │   ├── export.routes.ts      # CSV and JSON exports
│       │   │   └── analytics.routes.ts   # Database dashboard metrics
│       │   ├── schemas/                  # Zod validation schemas
│       │   │   ├── ai.schema.ts          # Structured extraction & RAG schemas
│       │   │   └── document.schema.ts    # Document metadata schemas
│       │   ├── services/                 # Processing Pipeline Modules
│       │   │   ├── documents/            # PDF & Text extraction
│       │   │   ├── ocr/                  # Tesseract OCR engine
│       │   │   ├── gemini/               # Official @google/genai SDK
│       │   │   ├── validation/           # Deterministic validation engine
│       │   │   ├── retrieval/            # Sliding-window chunking & RAG
│       │   │   ├── knowledge/            # Entity & relationship graph
│       │   │   └── queue/                # Pipeline orchestrator
│       │   ├── app.ts                    # Express app configuration
│       │   └── server.ts                 # Server startup banner & shutdown
│       ├── tests/                        # Vitest automated test suites
│       │   ├── unit/                     # Validation rules & chunking tests
│       │   └── integration/              # REST API endpoint tests
│       └── package.json
│
├── sample-documents/                     # Pre-built business test files
│   ├── invoice_acme_tech_inv_8841.txt
│   ├── purchase_order_po_99420.txt
│   ├── contract_master_services_agreement.txt
│   ├── receipt_grand_hyatt_stay.txt
│   ├── financial_report_q3_logistics.txt
│   └── vendor_onboarding_application.txt
│
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql      # Production PostgreSQL RLS migrations
│   └── seed.sql                          # Realistic enterprise seed data
│
├── .env.example                          # Environment template
├── .gitignore
├── package.json                          # Monorepo workspaces
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### 1. Installation
Clone the repository and install dependencies across the monorepo:
```bash
git clone <repository-url>
cd Elevate
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local environment configuration:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend API Server Port | `5000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API Key | *(Get from Google AI Studio)* |
| `GEMINI_MODEL` | Gemini Model Identifier | `gemini-2.5-flash` |
| `SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | *(From Supabase API settings)* |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | `documind-documents` |
| `VITE_API_BASE_URL` | Frontend API Base URL | `http://localhost:5000/api` |

> **Note**: DocuMind AI is configured with **zero friction**: if external keys are not yet configured, the system seamlessly runs on its built-in high-performance repository and deterministic extraction engine pre-seeded with rich enterprise data, allowing immediate testing!

### 3. Running the Application

To start both the API server and the Vite dev server concurrently:
```bash
# Terminal 1: Start Backend API (Port 5000)
npm run dev:api

# Terminal 2: Start Frontend Web App (Port 5173)
npm run dev:web
```

Open your browser at **`http://localhost:5173/`**.

---

## 🗄️ Database Migrations (Supabase PostgreSQL)

The schema is defined in `supabase/migrations/00001_initial_schema.sql` and includes:
- **Tables**: `profiles`, `documents`, `document_extractions`, `document_chunks`, `validation_issues`, `document_entities`, `entity_relationships`, `processing_jobs`, `review_events`, `chat_sessions`, `chat_messages`.
- **Row-Level Security (RLS)**: Enforced across all tables using `auth.uid() = user_id`.
- **Triggers**: Automatic profile creation upon `auth.users` registration and automatic `updated_at` timestamps.
- **Storage**: Private storage bucket `documind-documents` with user folder isolation.

To apply migrations on your Supabase project:
```bash
# Using Supabase CLI
supabase db push

# Or execute the SQL files in the Supabase Dashboard SQL Editor:
# 1. supabase/migrations/00001_initial_schema.sql
# 2. supabase/seed.sql
```

---

## 🧪 Automated Testing

DocuMind AI includes comprehensive automated unit and integration tests powered by **Vitest** and **Supertest**:

```bash
npm run test
```

### Test Coverage Highlights:
- **Validation Engine**: Arithmetic checks ($Total = Subtotal + Tax$), inverted date detection, missing mandatory fields, and cross-document PO ceiling mismatches.
- **Retrieval & RAG**: Sliding-window chunking with overlap, query keyword scoring, and citation generation.
- **API Endpoints**: `/api/health`, `/api/profile`, `/api/documents`, `/api/documents/upload`, `/api/reviews`, `/api/insights/overview`, `/api/knowledge-graph`, `/api/chat/sessions`, `/api/exports/documents.json`.

---

## 📄 Pre-Built Sample Documents Walkthrough

The `sample-documents/` directory provides realistic business documents designed to demonstrate DocuMind's capabilities:

1. **`invoice_acme_tech_inv_8841.txt`**:
   - $45,850.00 cloud migration invoice from Acme Technologies referencing PO-99420.
2. **`purchase_order_po_99420.txt`**:
   - $42,000.00 authorized spend cap PO issued by Nexus Global Logistics.
   - **Cross-Document Discrepancy**: Triggers an alert because the Invoice ($45,850.00) exceeds the PO cap ($42,000.00) by $3,850.00.
3. **`contract_master_services_agreement.txt`**:
   - Master Services Agreement with automatic renewal notice milestone on November 1, 2025.
4. **`receipt_grand_hyatt_stay.txt`**:
   - Hotel lodging receipt with an intentional arithmetic tax variance ($17.50 vs expected $175.50 on 15.6% lodging rate).
5. **`vendor_onboarding_application.txt`**:
   - Vendor onboarding application with missing mandatory bank account details.
6. **`financial_report_q3_logistics.txt`**:
   - Executive Q3 report containing revenue, margins, and cloud migration milestones.

You can upload these documents directly from the UI on the `/documents/upload` page using the 1-click test buttons.

---

## 🛡️ Security & Privacy

- **Row Level Security**: Users can only read, update, or delete their own documents and chat sessions.
- **No Client Credentials**: Gemini API keys and Supabase service-role keys are strictly server-side and never exposed to the frontend bundle.
- **Strict Zod Parsing**: All AI outputs and client inputs are strongly validated before database insertion.
- **Untrusted Input Protection**: Uploaded document instructions are treated as untrusted data, never as system instructions.
- **Audit Preservation**: Human reviewers' field corrections never overwrite original extracted data; all changes are logged in append-only review events.

---

## 📜 License

MIT License. Designed and built for DocuMind AI Enterprise Document Intelligence.
