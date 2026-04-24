# Final PRD: Smart School Ecosystem — Remaining Implementation Gaps

This document summarizes all requirements from the original PRD, Master PRD2, and Enhancements PRD that have **not** been fully implemented or verified in the current codebase.

## 1. Security & Multi-Tenancy (CRITICAL)

The current implementation lacks consistent enforcement of school-level isolation for individual resources.

- **[ ] R-AUTH-1: Resource-Level Validation**: Every route that accepts a resource ID (e.g., `studentId`, `classId`, `periodId`, `assignmentId`) must validate that the resource belongs to `req.user.schoolId`. Currently, many routes (e.g., `attendance.js`, `submissions.js`) accept IDs without cross-referencing the school.
- **[ ] R-AUTH-2: Global Multi-Tenancy Middleware**: The `requireSchool()` middleware is only applied to `admin.js` and `export.js`. It must be applied globally or to all route groups to ensure `req.user.school_id` is consistently present and validated.
- **[ ] R-VAL-1: Comprehensive Zod Coverage**: Complete Zod schema validation for all mutation routes, specifically focusing on `portfolio.js`, `submissions.js`, and `meetings.js`.
- **[ ] R-VAL-2: HTML Sanitization**: Ensure `isomorphic-dompurify` is applied to all user-generated rich text (announcement bodies, message bodies) before database storage to prevent XSS.

## 2. Infrastructure & Database

- **[ ] FR8.1: Production Database Migration**: Transition from SQLite to a production-grade relational database (PostgreSQL/MySQL). While `docker-compose.yml` is ready, `prisma/schema.prisma` still defaults to `sqlite`.
- **[ ] R-IDX-1: Missing Database Indexes**: Add `@@index([schoolId])` to the `RiskScore` model (others have been implemented).
- **[ ] FR9.3: Automated Testing Coverage**: Achieve the target 80% code coverage. Currently, the test suite is minimal, covering only a few services and basic login/auth flows.
    - [ ] Unit tests for all services in `src/services/`.
    - [ ] Integration tests for all critical API routes.
    - [ ] E2E tests for primary student/teacher/admin flows.

## 3. Operational Observability

- **[ ] R-LOG-2: Slow Query Tracking**: Implement a Prisma middleware or event handler to log any database query taking longer than 100ms at the `warn` level.
- **[ ] R-LOG-3: Cron Job Audit Trail**: Log the start, success, failure, and duration of all cron jobs (`riskAnalysis`, `analyticsGeneration`, `eventReminders`).
- **[ ] R-ALERT-3: AI Service Resiliency**: Implement a circuit-breaker pattern or robust try/catch with graceful fallbacks for all `aiService.js` calls to prevent AI downtime from crashing the backend.
- **[ ] R-ALERT-4: Third-Party Error Wrapping**: Wrap Firebase push notification and Cloudinary calls to ensure failures are logged/captured to Sentry without affecting primary request responses.

## 4. Feature-Specific Gaps

- **[ ] Timetable Change Notifications**: Implement a trigger to notify affected students and teachers when a `TimetableSlot` is modified or deleted.
- **[ ] FR6.1: Frontend State Management**: Verify and complete the transition of all components to use the centralized `Zustand` store for user state, eliminating direct `localStorage` reads in component logic.
- **[ ] Portfolio Thumbnail Generation**: Ensure `sharp` is correctly generating 400x300 thumbnails for all image uploads in `portfolio.js` (logic exists but requires validation in production environment).

## 5. Implementation Priority

| Priority | Item | Risk if Skipped |
| :--- | :--- | :--- |
| **P0** | Resource-level school validation | Data breach across tenants |
| **P0** | Global `requireSchool` application | Unauthorized cross-school access |
| **P1** | 80% Test Coverage | Regressions and functional bugs |
| **P1** | Production DB Migration | Scalability and data integrity issues |
| **P2** | Observability (Slow queries/Cron logs) | Difficult production debugging |
