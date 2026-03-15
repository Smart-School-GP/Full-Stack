# School Ecosystem Management Platform

A multi-tenant school management platform with role-based dashboards for admins, teachers, parents, and students.

**Stack:** Next.js 14 · Express.js · PostgreSQL · Prisma · JWT · Vercel + Railway

---

## Architecture

```
school-platform/
├── backend/          # Express.js REST API
│   └── src/
│       ├── routes/       # auth, admin, teacher, parent, student
│       ├── middleware/   # JWT auth + role guards
│       ├── services/     # gradeCalculator.js
│       └── prisma/       # schema.prisma + seed.js
└── frontend/         # Next.js 14 App Router
    └── app/
        ├── admin/        # dashboard, users, classes, reports
        ├── teacher/      # dashboard, classes, subjects
        ├── parent/       # dashboard, children, subject detail
        └── student/      # dashboard, subject detail
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use Docker)

### 1. Clone & install

```bash
git clone <repo>
cd school-platform

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

**Backend** — copy `backend/.env.example` to `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/schooldb
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
PORT=4000
FRONTEND_URL=http://localhost:3000
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Set up the database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with demo data
node src/prisma/seed.js
```

### 4. Run both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Demo Credentials

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@greenwood.edu     | admin123    |
| Teacher | sarah@greenwood.edu     | teacher123  |
| Teacher | ahmed@greenwood.edu     | teacher123  |
| Parent  | john.smith@email.com    | parent123   |
| Student | alice@greenwood.edu     | student123  |
| Student | bob@greenwood.edu       | student123  |

---

## Deployment

### Backend → Railway

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway will set `DATABASE_URL` automatically
3. Create a new service from your repo, pointing to the `/backend` folder
4. Set environment variables:
   ```
   JWT_SECRET=<strong_random_secret>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-app.vercel.app
   ```
5. Railway uses `railway.toml` to run `prisma migrate deploy && node src/server.js`

### Frontend → Vercel

1. Import the repo on Vercel, set root directory to `frontend`
2. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
3. Deploy — Vercel uses `vercel.json` automatically

---

## API Reference

### Auth
| Method | Path              | Description         |
|--------|-------------------|---------------------|
| POST   | /api/auth/login   | Login, returns JWT  |
| POST   | /api/auth/logout  | Logout (stateless)  |
| GET    | /api/auth/me      | Get current user    |

### Admin `(role: admin)`
| Method | Path                                    | Description                    |
|--------|-----------------------------------------|--------------------------------|
| POST   | /api/admin/schools                      | Create school                  |
| POST   | /api/admin/users                        | Create user                    |
| GET    | /api/admin/users                        | List all users in school       |
| DELETE | /api/admin/users/:id                    | Delete user                    |
| POST   | /api/admin/classes                      | Create class                   |
| GET    | /api/admin/classes                      | List classes                   |
| POST   | /api/admin/classes/:id/students         | Enroll student                 |
| POST   | /api/admin/classes/:id/teachers         | Assign teacher                 |
| POST   | /api/admin/parent-student               | Link parent to student         |
| GET    | /api/admin/reports/school               | School-wide performance report |

### Teacher `(role: teacher)`
| Method | Path                                     | Description                      |
|--------|------------------------------------------|----------------------------------|
| GET    | /api/teacher/classes                     | My classes                       |
| GET    | /api/teacher/classes/:id/students        | Students in class                |
| GET    | /api/teacher/classes/:id/subjects        | Subjects in class (mine)         |
| POST   | /api/teacher/subjects                    | Create subject                   |
| GET    | /api/teacher/subjects/:id               | Subject detail + grades          |
| PUT    | /api/teacher/subjects/:id/algorithm      | Set grading algorithm            |
| GET    | /api/teacher/subjects/:id/assignments   | List assignments                 |
| POST   | /api/teacher/assignments                 | Create assignment                |
| POST   | /api/teacher/grades                      | Enter grade (triggers recalc)    |
| PUT    | /api/teacher/grades/:id                  | Update grade (triggers recalc)   |
| GET    | /api/teacher/subjects/:id/analytics     | Class analytics                  |

### Parent `(role: parent)`
| Method | Path                                                     | Description              |
|--------|----------------------------------------------------------|--------------------------|
| GET    | /api/parent/children                                     | My children              |
| GET    | /api/parent/children/:id/grades                          | Final grades for child   |
| GET    | /api/parent/children/:id/subjects/:sid/details           | Assignment breakdown     |
| GET    | /api/parent/children/:id/history                         | Grade history            |

### Student `(role: student)`
| Method | Path                                    | Description              |
|--------|-----------------------------------------|--------------------------|
| GET    | /api/student/grades                     | My grades                |
| GET    | /api/student/subjects/:id/details       | Assignment breakdown     |

---

## Grade Calculation Logic

When a grade is submitted or updated, `gradeCalculator.js` automatically:

1. Fetches the subject's grading algorithm (e.g. `{ exam: 0.5, homework: 0.3, project: 0.2 }`)
2. Groups the student's assignment grades by type
3. Calculates the percentage average within each type
4. Applies weights: `finalScore = Σ(typeAvg × weight) / Σ(appliedWeights)`
5. Upserts the result to `final_grades` table

If no algorithm is set, the final grade is not calculated.

---

## Security

- All routes protected with JWT middleware
- Every query scoped by `school_id` — no cross-tenant data leakage
- Role-based access: wrong role returns `403 Forbidden`
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT expires in 7 days; client discards on logout
