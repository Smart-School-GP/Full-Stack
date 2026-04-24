# PRD — Security & Operational Hardening
**Project**: School Platform (Multi-Tenant SaaS)  
**Author**: Ahmad Alshomaree  
**Date**: 2026-04-20  
**Priority**: Pre-Launch Blocker  

---

## Overview

This document captures every security and operational gap found during a pre-launch audit of the school platform. Each item is ranked by severity, includes the exact file(s) affected, and describes the acceptance criteria needed to close it.

---

## 1. Authorization — Role & Tenant Scoping

### Status: CRITICAL

### Problems Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `GET /student/:studentId/grades` and `/attendance` have **no `schoolId` check** — any authenticated user can read any student's data across schools | `src/routes/export.js:9-59` | Critical |
| 2 | `DELETE /api/timetable/periods/:periodId` requires `admin` role but does **not validate the period belongs to the admin's school** — cross-school deletion possible | `src/routes/timetable.js:72` | High |
| 3 | `GET /class/:classId` and `/today/:classId` in attendance routes **accept any classId without school validation** | `src/routes/attendance.js:28-45` | High |
| 4 | Socket.IO `join_conversation` handler accepts **any `conversationId`** without verifying the socket user is a participant — allows eavesdropping | `src/server.js:40` | High |
| 5 | `requireSchool()` middleware exists in `src/middleware/auth.js` but is **never applied to any route** | All route files | Medium |

### Requirements

- **R-AUTH-1**: Every route that accepts a resource ID (studentId, classId, periodId, conversationId, assignmentId) **must** validate that the resource belongs to `req.user.schoolId` before returning data or mutating state.
- **R-AUTH-2**: Apply `requireSchool()` middleware globally in `src/app.js` after `authenticate()`, or inline on every route group.
- **R-AUTH-3**: Socket.IO `join_conversation` must query the DB to confirm the authenticated user is a participant in the requested conversation before allowing the join.
- **R-AUTH-4**: Add integration tests for cross-school access attempts — each must return `403 Forbidden`.

### Acceptance Criteria

- [ ] A parent from School A cannot fetch grades/attendance of a student from School B.
- [ ] An admin from School A cannot delete timetable entries from School B.
- [ ] A user cannot join a Socket.IO conversation room they are not a participant of.
- [ ] All 4 affected route files have schoolId guards with tests covering the cross-tenant case.

---

## 2. Input Validation & Sanitization

### Status: PARTIAL — Incomplete Coverage

### Problems Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `POST /conversations` — no schema validation for `parent_id`, `student_id` body fields | `src/routes/messages.js:15` | Medium |
| 2 | `POST /submissions` — `assignment_id`, `text_response`, `file_url` accepted without Zod validation | `src/routes/submissions.js:71` | Medium |
| 3 | `POST /meetings` — `parent_id`, `student_id`, `scheduled_at` not validated | `src/routes/meetings.js:14` | Medium |
| 4 | `POST/PUT /events`, `POST/PUT /badges`, `POST/PUT /timetable/periods` — no validation schemas | `src/routes/events.js`, `badges.js`, `timetable.js` | Medium |
| 5 | Message `body` field stored without HTML sanitization (only discussions sanitize) | `src/routes/messages.js:155` | Medium |
| 6 | Announcement `body` stored without sanitization | `src/routes/announcements.js:12` | Medium |
| 7 | `express.json()` has **no payload size limit** — large-body DoS possible | `src/app.js:44` | Medium |
| 8 | File uploads via `multer` have **no MIME type filter** — executable files accepted | `src/routes/portfolio.js:72`, `submissions.js` | High |

### Requirements

- **R-VAL-1**: Create Zod schemas for every route that mutates data. Routes without a `validate(schema)` middleware call must be treated as incomplete.
- **R-VAL-2**: Apply `isomorphic-dompurify` (already installed) to all user-generated rich text: message bodies, announcement bodies, portfolio descriptions.
- **R-VAL-3**: Set `express.json({ limit: '1mb' })` in `src/app.js`.
- **R-VAL-4**: Configure `multer` with a `fileFilter` function that checks MIME type against an allowlist (`image/*`, `application/pdf`, `video/*`) and rejects all others. Add a `limits.fileSize` cap (e.g., 20 MB).

### Acceptance Criteria

- [ ] Every `POST`/`PUT`/`PATCH` route has a corresponding Zod schema file and uses `validate()` middleware.
- [ ] Submitting `<script>alert(1)</script>` as a message body is stored sanitized (tags stripped).
- [ ] Uploading a `.sh` or `.exe` file returns `400 Bad Request`.
- [ ] Sending a JSON body > 1 MB returns `413 Payload Too Large`.

---

## 3. CORS Policy

### Status: MISCONFIGURED

### Problems Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `FRONTEND_URL` defaults to `http://localhost:3000` — if env var is missing in prod, localhost is allowed | `src/app.js:40-43` | Medium |
| 2 | Both Express and Socket.IO CORS config accept unvalidated origin string with no HTTPS enforcement | `src/app.js:40`, `src/server.js:12-17` | Medium |

### Requirements

- **R-CORS-1**: At startup, validate that `FRONTEND_URL` is set and begins with `https://` in `NODE_ENV=production`. Throw and exit if not.
- **R-CORS-2**: Support an array via `ALLOWED_ORIGINS` env var (comma-separated) for multi-domain setups (e.g., mobile app, custom school subdomain).
- **R-CORS-3**: Apply the same origin list to both `cors()` middleware and Socket.IO server config.

### Acceptance Criteria

- [ ] Starting the server in `NODE_ENV=production` without `FRONTEND_URL` set causes a fatal startup error with a clear message.
- [ ] A request from an unlisted origin returns `403`.
- [ ] `.env.example` includes `FRONTEND_URL` and `ALLOWED_ORIGINS` entries.

---

## 4. Rate Limiting

### Status: NOT IMPLEMENTED

### Problems Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `POST /api/auth/login` has **no rate limiting** — unlimited brute-force attempts allowed | `src/routes/auth.js:12` | Critical |
| 2 | No global rate limiting on any API endpoint | `src/app.js` | High |
| 3 | File upload endpoints have no per-user upload rate limit — storage exhaustion possible | `src/routes/portfolio.js`, `submissions.js` | Medium |
| 4 | `express-rate-limit` is **not in `package.json`** | `package.json` | — |

### Requirements

- **R-RATE-1**: Install `express-rate-limit`. Configure a **global limiter**: 200 req/15 min per IP, applied in `src/app.js` before all routes.
- **R-RATE-2**: Configure a **strict auth limiter**: 10 req/15 min per IP on `POST /api/auth/login` and `POST /api/auth/reset-password`.
- **R-RATE-3**: Configure an **upload limiter**: 20 uploads/hour per authenticated user on file upload endpoints.
- **R-RATE-4**: Rate limit responses must return `429 Too Many Requests` with a `Retry-After` header.

### Acceptance Criteria

- [ ] 11 rapid login attempts from the same IP results in a `429` on the 11th.
- [ ] Normal browsing (< 200 req/15 min) is not affected.
- [ ] Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) are present in responses.

---

## 5. Password Reset with Token Expiry

### Status: NOT IMPLEMENTED

### Problems Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No password reset feature exists at all — users who forget their password are permanently locked out | `src/routes/auth.js` | High |
| 2 | No `passwordResetToken` or `passwordResetExpiresAt` fields in the User model | `prisma/schema.prisma` | High |
| 3 | JWT access tokens default to **7-day expiry** — too long for a school context | `src/routes/auth.js:41` | Medium |

### Requirements

- **R-PWD-1**: Add `passwordResetToken String?` and `passwordResetExpiresAt DateTime?` to the `User` model in `prisma/schema.prisma`. Create and run the migration.
- **R-PWD-2**: Implement `POST /api/auth/forgot-password` — generates a cryptographically random token (32 bytes via `crypto.randomBytes`), hashes it with SHA-256, stores the hash + expiry (1 hour from now) in the DB, and sends a reset link via email.
- **R-PWD-3**: Implement `POST /api/auth/reset-password` — validates the token (hash comparison), checks `passwordResetExpiresAt > now()`, hashes the new password, updates the DB, and nullifies the token fields.
- **R-PWD-4**: On successful reset, invalidate all existing sessions (store a `lastPasswordChange` timestamp on User; reject JWTs issued before it).
- **R-PWD-5**: Reduce default JWT expiry from 7 days to 1 day (`JWT_EXPIRES_IN=1d` in `.env.example`).

### Acceptance Criteria

- [ ] Clicking a password reset link > 1 hour after generation returns `400 Token expired`.
- [ ] Replaying a used reset token returns `400 Token already used`.
- [ ] User can successfully log in with the new password after reset.
- [ ] Old JWTs are rejected after a password reset.

---

## 6. Database Indexing

### Status: NOT IMPLEMENTED — CRITICAL PERFORMANCE RISK

### Problems Found

**No `@@index` directives exist anywhere in `prisma/schema.prisma`.**

Every query filtering, joining, or sorting by a non-unique column performs a full table scan. At scale (thousands of students, millions of grade rows) this will cause severe latency and potential timeouts.

| Column | Model | Query Pattern | Missing Index |
|--------|-------|---------------|---------------|
| `schoolId` | `User` | Every user list, auth lookup | `@@index([schoolId])` |
| `schoolId` | `Meeting`, `Announcement`, `Conversation`, `RiskScore` | Most admin/teacher queries | `@@index([schoolId])` on each |
| `studentId` | `Grade`, `Attendance`, `Submission`, `RiskScore` | Grade/attendance lookups per student | `@@index([studentId])` on each |
| `classId` | `Attendance`, `Enrollment` | Attendance per class | `@@index([classId])` |
| `assignmentId` | `Grade`, `Submission` | Submissions per assignment | `@@index([assignmentId])` |
| `conversationId` | `Message` | Message history fetch | `@@index([conversationId])` |
| `createdAt` | `Message`, `Grade`, `Attendance` | Chronological sorting | `@@index([createdAt])` |
| `riskLevel` | `RiskScore` | Risk alert filtering | `@@index([riskLevel])` |
| `date` | `Attendance` | Date-range attendance queries | `@@index([date])` |
| `expiresAt` | `Announcement` | Active announcements filter | `@@index([expiresAt])` |

### Requirements

- **R-IDX-1**: Add `@@index` directives to all models listed above. Run `prisma migrate dev` to apply.
- **R-IDX-2**: Add **composite indexes**: `RiskScore([studentId, subjectId])` and `Attendance([classId, date])` to cover the most common combined query patterns.
- **R-IDX-3**: After applying indexes, run `EXPLAIN QUERY PLAN` (SQLite) or `EXPLAIN ANALYZE` (PostgreSQL) on the top 5 most-used queries to verify index use.

### Acceptance Criteria

- [ ] `prisma/schema.prisma` contains `@@index` entries on all FK columns listed above.
- [ ] A query plan for `findMany({ where: { schoolId: x } })` on `User` shows index use (not full table scan).
- [ ] Migration runs cleanly in dev and produces a timestamped migration file.

---

## 7. Logging — Coverage Gaps

### Status: GOOD FOUNDATION, INCOMPLETE COVERAGE

The platform has a solid Winston logger with structured JSON output and request-ID correlation. The following specific gaps must be closed before launch.

### Problems Found

| # | Missing Log Event | File | Severity |
|---|-------------------|------|----------|
| 1 | Grade entry (create/update) not logged — no audit trail for grade changes | `src/routes/teacher.js` (grades endpoint) | Medium |
| 2 | Attendance marking not logged | `src/routes/attendance.js` | Medium |
| 3 | Admin user deletion not logged | `src/routes/admin.js` (delete user) | Medium |
| 4 | Role/permission changes not logged | `src/routes/admin.js` | High |
| 5 | Slow queries (> 100 ms) not flagged | `src/lib/prisma.js` | Medium |
| 6 | Cron job start/success/failure not logged | `src/jobs/riskAnalysis.js`, `analyticsGeneration.js` | Medium |

### Requirements

- **R-LOG-1**: Log every data mutation that affects grades, attendance, or user roles. Log fields: `action`, `actorId`, `actorRole`, `schoolId`, `targetId`, `targetType`, `timestamp`, `requestId`.
- **R-LOG-2**: Enable Prisma's `log: ['query']` in development and add a custom event handler that logs any query taking > 100 ms at `warn` level.
- **R-LOG-3**: Wrap each cron job in try/catch; log `{ job, status: 'started' }` at job start and `{ job, status: 'completed', durationMs }` or `{ job, status: 'failed', error }` at completion.
- **R-LOG-4**: Never log passwords, tokens, or raw PII. Mask email as `j***@domain.com` in log output.

### Acceptance Criteria

- [ ] After a teacher changes a grade, a structured log entry exists with `action: 'grade.update'`, `actorId`, `studentId`, `subjectId`, `oldValue`, `newValue`.
- [ ] A Prisma query taking > 100 ms produces a `warn`-level log entry.
- [ ] Each cron job produces start and end log entries with duration.

---

## 8. Alerting & Error Tracking

### Status: NOT IMPLEMENTED

### Problems Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | No error tracking service (Sentry/Rollbar) — production exceptions are invisible | Critical |
| 2 | `/health` endpoint returns `{ status: 'ok' }` but does **not check DB connectivity or dependent services** | High |
| 3 | Firebase push notification failures silently swallowed | Medium |
| 4 | AI service (`localhost:8002`) failures silently swallowed — no retry, no alert | Medium |
| 5 | Cron jobs run unsupervised — a failed nightly risk analysis goes undetected | High |

### Requirements

- **R-ALERT-1**: Install and configure **Sentry** (`@sentry/node`). Initialize in `src/app.js` before route registration. Set `dsn` from `SENTRY_DSN` env var. Capture all unhandled exceptions and rejections.
- **R-ALERT-2**: Enhance `/health` to perform a lightweight DB ping (`prisma.$queryRaw\`SELECT 1\``) and return structured health status:
  ```json
  {
    "status": "ok" | "degraded" | "down",
    "checks": {
      "database": "ok" | "error",
      "aiService": "ok" | "error"
    },
    "timestamp": "ISO8601"
  }
  ```
  Return `200` for ok/degraded, `503` for down.
- **R-ALERT-3**: Wrap `aiService.js` calls in a circuit-breaker pattern (or at minimum try/catch with `logger.error` + Sentry capture). Return a graceful fallback, never propagate a 500.
- **R-ALERT-4**: Wrap Firebase push notification calls — log failures at `warn` level and capture to Sentry. Never let push failures affect the primary request response.
- **R-ALERT-5**: After each cron job failure, call `Sentry.captureException(err)` so on-call engineers are alerted immediately.
- **R-ALERT-6**: Add `SENTRY_DSN` to `.env.example`.

### Acceptance Criteria

- [ ] Throwing an unhandled error in any route is captured in the Sentry dashboard within 30 seconds.
- [ ] `GET /health` with the DB offline returns `503` with `"database": "error"`.
- [ ] `GET /health` with the AI service offline returns `200` with `"aiService": "error"` (degraded, not down).
- [ ] A failed cron job appears as an error event in Sentry.

---

## Implementation Priority

| Priority | Item | Effort | Risk if Skipped |
|----------|------|--------|-----------------|
| P0 — Launch Blocker | Cross-school authorization fix (Section 1) | S | Data breach across tenants |
| P0 — Launch Blocker | Rate limiting on auth endpoints (Section 4) | S | Credential brute-force |
| P0 — Launch Blocker | Database indexes (Section 6) | M | Unusable at > 500 students |
| P0 — Launch Blocker | Sentry integration (Section 8) | S | Blind in production |
| P1 — Pre-Launch | File upload MIME type filter (Section 2) | S | Malware upload |
| P1 — Pre-Launch | CORS production hardening (Section 3) | S | Misconfiguration in prod |
| P1 — Pre-Launch | Password reset feature (Section 5) | M | User lockout |
| P1 — Pre-Launch | Health endpoint upgrade (Section 8) | S | No liveness signal |
| P2 — Post-Launch | Input validation — remaining routes (Section 2) | M | Data integrity |
| P2 — Post-Launch | Audit log coverage (Section 7) | M | No forensic trail |

---

## Out of Scope (Tracked Separately)

- Refresh token rotation (deferred to auth v2)
- MFA for admin roles (deferred to auth v2)
- Full OpenTelemetry distributed tracing (deferred to observability v1)
- Automated load testing with k6 (deferred to pre-scale milestone)
