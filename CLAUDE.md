# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start all three services (backend + frontend + AI service) concurrently
npm run dev

# Run only backend (Express, port 4000)
npm run server

# Run only frontend (Next.js, port 3000)
npm run client

# Run only AI service (FastAPI, port 8002)
npm run ai-service

# First-time setup: generate Prisma client, push schema, seed data
npm run setup

# Database operations
npm run prisma:generate   # Regenerate Prisma client after schema changes
npm run prisma:push       # Push schema changes to DB (dev)
npm run prisma:migrate    # Run migrations (production)
npm run seed              # Reseed demo data

# Build & lint
npm run build
npm run lint
```

## Architecture Overview

This is a **multi-tenant school management SaaS platform** with three separate services:

### 1. Backend (`src/`) — Express.js + Socket.IO
- **`src/server.js`**: HTTP server entry; mounts Socket.IO for real-time messaging
- **`src/app.js`**: Express app with middleware and route registration
- **`src/routes/`**: One file per resource (auth, admin, teacher, parent, student, meetings, messages, etc.)
- **`src/middleware/auth.js`**: JWT decode → `req.user`; `requireRole(...roles)` guard
- **`src/services/`**: Business logic — `gradeCalculator.js` (weighted grade computation), `analyticsAggregator.js`, `aiService.js` (proxy to Python service), `pushNotification.js`
- **`src/jobs/`**: node-cron scheduled tasks — `riskAnalysis.js` runs nightly, `analyticsGeneration.js` runs weekly
- **`src/lib/prisma.js`**: Singleton Prisma client — import this, never instantiate directly

### 2. Frontend (`app/`) — Next.js 14 App Router
- Role-based route groups: `admin/`, `teacher/`, `parent/`, `student/`
- `messages/` uses Socket.IO client for real-time chat
- `components/ui/` — base UI components; `components/analytics/` — Recharts/Chart.js visualizations
- PWA-enabled (next-pwa) with offline caching via service worker

### 3. AI Service (`ai-service/`) — Python FastAPI
- Runs in its own virtualenv (`ai-service/venv/`)
- Entry: `ai-service/run.py` → `app/main.py`
- Exposes ML endpoints consumed by the backend's `aiService.js`
- Uses XGBoost/scikit-learn for risk scoring, OpenAI API for LLM-generated analytics insights

### Database — SQLite + Prisma
- Schema at `prisma/schema.prisma` (24 models)
- Multi-tenancy enforced via `school_id` on every resource; cross-school access blocked at middleware
- Key models: `School → User → Class → Subject → Grade → FinalGrade`
- `ParentStudent` junction links parents to their children
- `RiskScore` stores nightly-computed student risk levels
- `AnalyticsReport` / `SubjectInsight` store weekly aggregated analytics

## Key Architectural Patterns

**Multi-tenancy**: Every DB query must be scoped by `schoolId` (from `req.user.schoolId`). The middleware enforces this, but route handlers are responsible for passing it to Prisma queries.

**Grade calculation**: When a grade is saved, call `gradeCalculator.recalculateFinalGrade(studentId, subjectId)`. This fetches the `GradingAlgorithm` for the subject, groups grades by type, applies weights, and writes to `FinalGrade`.

**Real-time messaging**: Socket.IO rooms are named by `conversationId`. Clients emit `join_conversation`, `send_message`, `typing`, and `mark_read`. The backend authenticates the socket connection via JWT on handshake.

**Risk analysis flow**: Cron job → collects grades/attendance per student → sends to AI service or uses local calculation → writes `RiskScore` → teachers see alerts in `teacher/risk-alerts/`.

## Environment Setup

Copy `.env.example` to `.env` and set:
```env
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=<long random string>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

External services (Cloudinary, Firebase, Daily.co, OpenAI) require their own keys; the app degrades gracefully without them in development.

## Demo Credentials

| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Admin   | ahmed@greenwood.edu        | admin123     |
| Teacher | john.smith@greenwood.edu   | teacher123   |
| Parent  | parent@greenwood.edu       | parent123    |
| Student | student@greenwood.edu      | student123   |

## Docker

```bash
docker-compose up --build   # Starts backend (4000), frontend (3000), AI service (8002)
```

SQLite data persists in the `db_data` Docker volume.
