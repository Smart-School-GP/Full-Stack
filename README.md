# School Ecosystem Management Platform

A multi-tenant school management SaaS platform with role-based dashboards for admins, teachers, parents, and students — featuring AI-powered risk scoring, professional reporting, and premium UI aesthetics.

**Stack:** Next.js 14 · Express.js · SQLite + Prisma · Socket.IO · Python FastAPI · XGBoost · OpenAI · jspdf · TailwindCSS

---

## ✨ Key Features

- **🎯 AI Risk Scoring:** Nightly XGBoost analysis identifies students at risk of academic failure before it happens.
- **📊 Professional Reporting:** Branded, high-fidelity PDF exports for subject breakdowns, attendance, and school-wide analytics.
- **🎨 Premium UI/UX:** High-end aesthetics featuring glassmorphism, dark mode, and smooth micro-animations (built with Tailwind & Framer-like transitions).
- **🗂️ Student Portfolios:** Integrated showcase for students to upload projects, certificates, and achievements with teacher/parent visibility.
- **💬 Real-time Ecosystem:** Live chat between parents and teachers, instant notifications, and collaborative discussion boards.
- **🧠 Automated Insights:** Weekly AI-generated narrative reports summarizing school performance using LLMs.

---

## Architecture

Three independent services communicate over HTTP:

```
school-platform/
├── backend/                # Express.js backend (port 4000)
│   ├── routes/             # auth, admin, teacher, parent, student, messages, ...
│   ├── middleware/         # JWT auth + role guards
│   ├── services/           # gradeCalculator, analyticsAggregator, aiService
│   ├── jobs/               # node-cron: riskAnalysis (nightly), analyticsGeneration (weekly)
│   └── lib/prisma.js       # Singleton Prisma client
│
├── src/                    # Next.js 14 App Router frontend (port 3000)
│   ├── app/
│   │   ├── admin/          # dashboard, users, classes, reports, analytics
│   │   ├── teacher/        # dashboard, classes, subjects, attendance, risk-alerts
│   │   ├── parent/         # dashboard, children, subject detail, meetings
│   │   ├── student/        # dashboard, subjects, assignments
│   │   ├── messages/       # Real-time chat (Socket.IO)
│   │   └── announcements/  # School-wide announcements
│   └── components/         # Shared React components (ui/, analytics/)
│
├── ai-service/             # Python FastAPI ML service (port 8002)
│   ├── run.py              # Uvicorn entry point
│   ├── requirements.txt    # Python dependencies
│   └── app/
│       ├── routers/        # predict.py (risk), analytics.py (insights)
│       ├── models/         # XGBoost risk model + Pydantic schemas
│       └── services/       # llm_service.py (OpenAI), insight_builder.py
│
├── prisma/                 # schema.prisma (24 models) + SQLite dev.db
└── public/                 # PWA service worker + Workbox
```

### AI Data Flow

```
Frontend → Express → [reads DB via Prisma] → builds payload → Python FastAPI
                                                                    │
                                              XGBoost risk model ◄──┤
                                              OpenAI LLM summaries ◄┘
                                                    │
Express ← results ← [saves to DB via Prisma] ←─────┘
    │
Frontend reads /api/admin/analytics/latest
```

The Python service is stateless — it has no database connection. All persistence is handled by Express. If the Python service is unavailable, Express falls back to built-in rule-based risk scoring automatically.

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.9+

### 1. Clone & install

```bash
git clone <repo>
cd school-platform
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Fill in the required values:

```env
DATABASE_URL=file:./prisma/dev.db
DATABASE_PROVIDER=sqlite
JWT_SECRET=<long_random_string_min_32_chars>
NEXT_PUBLIC_API_URL=http://localhost:4000
AI_SERVICE_URL=http://localhost:8002
FRONTEND_URL=http://localhost:3000
```

### 3. First-time DB setup

```bash
npm run setup
```

This runs `prisma generate` + `prisma db push` + seeds demo data in one step.

### 4. Set up the Python AI service

> ⚠️ **This step is required before running `npm run dev`**, otherwise the AI service will fail with `ModuleNotFoundError: No module named 'uvicorn'`.

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate it
# Windows (PowerShell):
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Go back to root
cd ..
```

### 5. Run all services

```bash
# All three services concurrently (recommended)
npm run dev

# Or individually:
npm run server        # Express backend  → http://localhost:4000
npm run client        # Next.js frontend → http://localhost:3000
npm run ai-service    # FastAPI AI       → http://localhost:8002
```

Open **http://localhost:3000**

---

## Demo Credentials

| Role    | Email                      | Password   |
|---------|----------------------------|------------|
| Admin   | ahmed@greenwood.edu        | admin123   |
| Teacher | john.smith@greenwood.edu   | teacher123 |
| Parent  | parent@greenwood.edu       | parent123  |
| Student | student@greenwood.edu      | student123 |

---

## Docker

```bash
docker-compose up --build
```

Starts all three services (backend: 4000, frontend: 3000, AI: 8002). SQLite data persists in the `db_data` Docker volume.

---

## Database

SQLite via Prisma ORM. Schema at `prisma/schema.prisma` — 24 models.

Key model relationships:
```
School → User → Class → Subject → Assignment → Grade
                                 └──────────→ FinalGrade
School → User(parent) ←─ParentStudent─→ User(student)
Student → RiskScore (per subject, computed nightly)
School  → AnalyticsReport (weekly AI-generated summary)
```

**Multi-tenancy:** Every model carries `schoolId`. All queries are scoped by `req.user.school_id` — cross-tenant data access is impossible at the middleware level.

### Database commands

```bash
npm run prisma:generate   # Regenerate client after schema changes
npm run prisma:push       # Push schema to DB (development)
npm run prisma:migrate    # Run migrations (production)
npm run seed              # Reseed demo data
```

---

## API Reference

### Auth

| Method | Path             | Description        |
|--------|------------------|--------------------|
| POST   | /api/auth/login  | Login, returns JWT |
| POST   | /api/auth/logout | Logout (stateless) |
| GET    | /api/auth/me     | Get current user   |

### Admin `(role: admin)`

| Method | Path                             | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | /api/admin/users                 | List all users in school       |
| POST   | /api/admin/users                 | Create user                    |
| DELETE | /api/admin/users/:id             | Delete user                    |
| GET    | /api/admin/classes               | List classes                   |
| POST   | /api/admin/classes               | Create class                   |
| POST   | /api/admin/classes/:id/students  | Enroll student in class        |
| POST   | /api/admin/classes/:id/teachers  | Assign teacher to class        |
| POST   | /api/admin/parent-student        | Link parent to student         |
| GET    | /api/admin/reports/school        | School-wide performance report |
| GET    | /api/admin/analytics/latest      | Latest AI analytics report     |
| POST   | /api/admin/analytics/refresh     | Trigger new report generation  |
| GET    | /api/admin/analytics/jobs/:jobId | Poll job status                |
| GET    | /api/admin/analytics/subjects    | Subject-level performance data |
| GET    | /api/admin/risk-overview         | School-wide risk summary       |

### Teacher `(role: teacher)`

| Method | Path                                    | Description                    |
|--------|-----------------------------------------|--------------------------------|
| GET    | /api/teacher/classes                    | My assigned classes            |
| GET    | /api/teacher/subjects/:id               | Subject detail + grade grid    |
| PUT    | /api/teacher/subjects/:id/algorithm     | Set grading algorithm weights  |
| POST   | /api/teacher/assignments                | Create assignment              |
| POST   | /api/teacher/grades                     | Enter grade (triggers recalc)  |
| PUT    | /api/teacher/grades/:id                 | Update grade (triggers recalc) |
| GET    | /api/teacher/risk-alerts                | At-risk students for my classes|
| POST   | /api/teacher/attendance                 | Record attendance              |
| GET    | /api/teacher/meetings                   | My meetings                    |

### Parent `(role: parent)`

| Method | Path                                              | Description              |
|--------|---------------------------------------------------|--------------------------|
| GET    | /api/parent/children                              | My linked children       |
| GET    | /api/parent/children/:id/grades                   | Final grades for child   |
| GET    | /api/parent/children/:id/subjects/:sid/details    | Assignment breakdown     |
| GET    | /api/parent/children/:id/attendance               | Attendance history       |

### Student `(role: student)`

| Method | Path                              | Description            |
|--------|-----------------------------------|------------------------|
| GET    | /api/student/grades               | My final grades        |
| GET    | /api/student/subjects/:id/details | Assignment breakdown   |
| GET    | /api/student/assignments          | My assignments         |

---

## Grade Calculation

When a grade is submitted or updated, `gradeCalculator.js` automatically:

1. Fetches the subject's `GradingAlgorithm` (e.g. `{ exam: 0.5, homework: 0.3, quiz: 0.2 }`)
2. Groups the student's grades by assignment type
3. Calculates the percentage average within each type
4. Applies weights: `finalScore = Σ(typeAvg × weight) / Σ(appliedWeights)`
5. Upserts the result to the `FinalGrade` table

If no algorithm is set for a subject, no final grade is computed.

---

## AI Features

### Risk Scoring (nightly cron)
- Runs every night via `riskAnalysis.js`
- Reads grades and submission rates from the DB
- Sends feature vectors to Python's `/predict/risk` (XGBoost model)
- Writes `RiskScore` records per student per subject
- Creates teacher notifications for newly high-risk students
- **Fallback:** if Python service is offline, rule-based scoring is used automatically

### Analytics Reports (weekly cron + manual)
- Runs every Sunday at 11pm via `analyticsGeneration.js`
- Aggregates class/subject performance from DB
- Sends payload to Python's `/generate/analytics`
- Python calls OpenAI API to write narrative summaries (falls back to template text without API key)
- Results saved to `AnalyticsReport` + `SubjectInsight` tables
- Admins can trigger a manual refresh anytime from the Analytics dashboard

---

## Real-Time Messaging

Socket.IO (via `backend/server.js`) powers the messages feature:

- Authenticated on socket handshake via JWT
- Rooms named by `conversationId`
- Events: `join_conversation`, `send_message`, `typing`, `mark_read`

---

## Security

- All routes protected with JWT middleware (`backend/middleware/auth.js`)
- Every DB query scoped by `schoolId` — no cross-tenant data leakage
- Role-based access: wrong role returns `403 Forbidden`
- Passwords hashed with bcrypt (10 salt rounds)
- JWT expires in 1 day; client discards token on logout

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'uvicorn'`
The Python virtual environment is not set up. Follow **Step 4** above to create the venv and install dependencies.

### `prisma: command not found`
Run `npm install` first, then use `npm run prisma:generate` (not `prisma` directly).

### Port already in use
Kill the process on the conflicting port:
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS / Linux
lsof -ti:4000 | xargs kill
```

### Frontend can't reach backend
Ensure `NEXT_PUBLIC_API_URL=http://localhost:4000` is set in your `.env` file and the backend is running.
