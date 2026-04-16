# Product Requirements Document: Smart School Ecosystem Platform Enhancements

## 1. Introduction

This Product Requirements Document (PRD) outlines the necessary enhancements for the "Smart School Ecosystem Management Platform" graduation project. Building upon the initial code review, this document details the functional and non-functional requirements for addressing identified areas of improvement. The primary goal is to elevate the project's robustness, maintainability, performance, and adherence to industry best practices, making it production-ready and easier for future development.

This PRD is intended for an AI coding agent (e.g., Claude Code) to guide the implementation process. Each section will provide sufficient detail to enable autonomous development and verification.

## 2. Goals

The overarching goals for these enhancements are:

*   **Improve Code Quality and Reliability**: Implement automated testing to ensure functional correctness and prevent regressions.
*   **Enhance Performance**: Optimize critical backend operations to reduce latency and improve scalability.
*   **Increase Maintainability**: Refactor and modularize codebase sections for better readability and easier future modifications.
*   **Strengthen Security**: Implement comprehensive input validation and consistent error handling.
*   **Improve Observability**: Introduce structured logging and monitoring capabilities.
*   **Prepare for Production Deployment**: Outline steps for database migration and CI/CD pipeline establishment.

## 3. Scope

This PRD covers specific improvements across the backend (Express.js, FastAPI), frontend (Next.js), and infrastructure (Docker, CI/CD). It focuses on addressing the technical debt and architectural considerations highlighted in the initial review. New feature development is out of scope for this document.

## 4. Detailed Requirements

### 4.1. Automated Testing Implementation

**Feature Name**: Comprehensive Automated Testing Suite

**Description**: Implement a robust suite of automated tests, including unit, integration, and end-to-end (E2E) tests, to ensure the reliability and correctness of the application across all layers.

**Functional Requirements**:
*   **FR1.1**: Implement unit tests for critical backend services (`src/services/`, `src/jobs/`) and utility functions.
*   **FR1.2**: Implement unit tests for key frontend components (`components/`) and utility hooks (`lib/`).
*   **FR1.3**: Implement integration tests for backend API routes (`src/routes/`) to verify correct data flow, authentication, authorization, and database interactions.
*   **FR1.4**: Implement integration tests for the AI service (`ai-service/`) to verify model predictions and fallbacks.
*   **FR1.5**: Implement end-to-end tests for critical user flows (e.g., Admin creating a user, Teacher marking attendance, Student viewing grades) using a headless browser testing framework.

**Non-Functional Requirements**:
*   **NFR1.1 - Code Coverage**: Achieve a minimum of 80% code coverage for backend services and frontend utilities/components.
*   **NFR1.2 - Testing Frameworks**: Utilize established testing frameworks (e.g., Jest for Node.js/React, Pytest for Python) and E2E frameworks (e.g., Cypress or Playwright).
*   **NFR1.3 - Test Execution**: Tests should be executable via `npm run test` (or similar) for Node.js/React and `pytest` for Python.

**Acceptance Criteria**:
*   **AC1.1**: All implemented tests pass successfully.
*   **AC1.2**: Code coverage reports confirm the target coverage percentage is met.
*   **AC1.3**: Test execution is integrated into the development workflow and can be run on demand.

**Relevant Files/Modules**: All `src/` and `app/` directories, `ai-service/`, `package.json`.

### 4.2. Backend Performance Optimization (N+1 Queries)

**Feature Name**: N+1 Query Optimization in Risk Feature Building

**Description**: Refactor the `buildRiskFeatures` function in `src/services/aiService.js` to eliminate N+1 query patterns, significantly improving its performance and reducing database load.

**Functional Requirements**:
*   **FR2.1**: Modify `buildRiskFeatures` to fetch all necessary `finalGrades`, `grades`, and `assignments` data for all students and subjects in a single or minimal number of database queries.
*   **FR2.2**: Utilize Prisma's `include` or `select` with nested relations, or aggregate queries, to retrieve data efficiently.
*   **FR2.3**: Ensure the logic for calculating `scoreLastWeek`, `scoreTwoWeeksAgo`, `daysSinceLast`, `submissionRate`, and `classAverage` remains correct after data fetching refactoring.

**Non-Functional Requirements**:
*   **NFR2.1 - Performance**: Reduce the execution time of `buildRiskFeatures` by at least 50% for a dataset of 1000 students and 500 subjects.
*   **NFR2.2 - Database Load**: Significantly decrease the number of database queries executed during the `buildRiskFeatures` process.

**Acceptance Criteria**:
*   **AC2.1**: The `buildRiskFeatures` function executes with demonstrably improved performance (e.g., measured via profiling or logging query counts).
*   **AC2.2**: The risk scoring functionality continues to operate correctly, producing accurate risk predictions.

**Relevant Files/Modules**: `Full-Stack/src/services/aiService.js` [5], `Full-Stack/prisma/schema.prisma` [3].

### 4.3. Backend Modularization

**Feature Name**: Backend Route and Service Modularization

**Description**: Refactor large backend route files (`src/routes/admin.js`, `src/routes/teacher.js`) by extracting complex business logic into dedicated service functions or smaller, more focused controller modules.

**Functional Requirements**:
*   **FR3.1**: Extract data aggregation and complex processing logic from `src/routes/admin.js` (e.g., `/reports/school`, `/risk-overview`) into new or existing service files within `src/services/`.
*   **FR3.2**: Extract business logic related to assignment management, grade entry, and subject analytics from `src/routes/teacher.js` into new or existing service files within `src/services/`.
*   **FR3.3**: Ensure route handlers primarily focus on request parsing, calling service functions, and sending responses, minimizing direct database or complex business logic operations.

**Non-Functional Requirements**:
*   **NFR3.1 - Readability**: Improve the readability and understandability of route files.
*   **NFR3.2 - Maintainability**: Enhance the maintainability of the backend by centralizing business logic.
*   **NFR3.3 - Testability**: Facilitate easier unit testing of business logic by separating it from route concerns.

**Acceptance Criteria**:
*   **AC3.1**: Route files are significantly reduced in size and complexity, primarily acting as orchestrators.
*   **AC3.2**: New or updated service files encapsulate specific business logic, making them independently testable.
*   **AC3.3**: The application's functionality remains unchanged after refactoring.

**Relevant Files/Modules**: `Full-Stack/src/routes/admin.js` [4], `Full-Stack/src/routes/teacher.js`, `Full-Stack/src/services/`.

### 4.4. Robust Input Validation

**Feature Name**: Centralized API Input Validation

**Description**: Implement a robust and centralized input validation mechanism for all API endpoints to ensure data integrity, prevent common security vulnerabilities (e.g., injection attacks), and provide clear error messages to clients.

**Functional Requirements**:
*   **FR4.1**: Integrate a schema validation library (e.g., Joi or Zod) into the Express.js backend.
*   **FR4.2**: Define validation schemas for all incoming request bodies, query parameters, and path parameters for critical API routes (e.g., user creation, grade submission, assignment creation).
*   **FR4.3**: Apply validation middleware to relevant routes, rejecting invalid requests with a `400 Bad Request` status and detailed error messages.
*   **FR4.4**: Ensure validation covers data types, required fields, string formats (e.g., email), numeric ranges, and enum values (e.g., user roles).

**Non-Functional Requirements**:
*   **NFR4.1 - Consistency**: All API endpoints should adhere to a consistent input validation strategy.
*   **NFR4.2 - Security**: Reduce the attack surface by strictly validating all incoming data.
*   **NFR4.3 - User Experience**: Provide clear and actionable error messages for invalid inputs.

**Acceptance Criteria**:
*   **AC4.1**: Submitting invalid data to any API endpoint results in a `400 Bad Request` response with specific validation errors.
*   **AC4.2**: Valid data continues to be processed correctly.
*   **AC4.3**: Validation logic is clearly defined and easily auditable.

**Relevant Files/Modules**: All `Full-Stack/src/routes/` files, `Full-Stack/src/app.js`.

### 4.5. Structured Logging and Monitoring

**Feature Name**: Enhanced Logging and Basic Monitoring Setup

**Description**: Replace basic `console.error` calls with a structured logging solution and set up basic monitoring to improve application observability and facilitate debugging and operational insights.

**Functional Requirements**:
*   **FR5.1**: Integrate a structured logging library (e.g., Winston or Pino for Node.js, `logging` module for Python) into both the Express.js backend and the FastAPI AI service.
*   **FR5.2**: Configure different log levels (e.g., `info`, `warn`, `error`, `debug`).
*   **FR5.3**: Log key events, errors, and performance metrics in a structured (e.g., JSON) format.
*   **FR5.4**: For the Node.js backend, ensure `req.user.school_id` is included in relevant log entries for multi-tenancy context.
*   **FR5.5**: (Optional, if feasible for AI agent) Integrate with a simple monitoring solution (e.g., Prometheus/Grafana stack in Docker Compose) to collect basic metrics (e.g., request rates, error rates, latency).

**Non-Functional Requirements**:
*   **NFR5.1 - Observability**: Provide clear and actionable insights into application behavior and issues.
*   **NFR5.2 - Performance**: Logging should have minimal impact on application performance.
*   **NFR5.3 - Maintainability**: Logging configuration should be easy to manage and extend.

**Acceptance Criteria**:
*   **AC5.1**: Application logs are generated in a structured format, including relevant context.
*   **AC5.2**: Different log levels are used appropriately.
*   **AC5.3**: (If monitoring implemented) Basic application metrics are collected and viewable in a monitoring dashboard.

**Relevant Files/Modules**: `Full-Stack/src/server.js`, `Full-Stack/src/app.js`, all `Full-Stack/src/routes/` and `Full-Stack/src/services/` files, `ai-service/app/main.py` (or equivalent entry point), `docker-compose.yml` [7].

### 4.6. Frontend State Management Refinement

**Feature Name**: Centralized Frontend User State Management

**Description**: Refine the management of global user-related state in the frontend, particularly the `user` object currently parsed directly from `localStorage` in component logic, to improve consistency and maintainability.

**Functional Requirements**:
*   **FR6.1**: Introduce a React Context API or a lightweight state management library (e.g., Zustand) to manage the authenticated user's data (`id`, `name`, `role`, `schoolId`, etc.) globally.
*   **FR6.2**: Modify components that require user information (e.g., `teacher/dashboard/page.tsx` [6], `teacher/attendance/[classId]/page.tsx` [6]) to consume this user context instead of directly accessing `localStorage`.
*   **FR6.3**: Ensure `setAuth` and `clearAuth` functions in `lib/auth.ts` correctly update this global state in addition to `localStorage`.

**Non-Functional Requirements**:
*   **NFR6.1 - Predictability**: Improve the predictability of user state changes across the application.
*   **NFR6.2 - Maintainability**: Centralize user state logic, making it easier to manage and debug.
*   **NFR6.3 - Testability**: Facilitate easier testing of components that depend on user state.

**Acceptance Criteria**:
*   **AC6.1**: User data is consistently available and updated across all relevant frontend components via the new state management solution.
*   **AC6.2**: Direct `localStorage` access for user data within component rendering logic is eliminated.
*   **AC6.3**: Authentication and logout flows correctly update the global user state.

**Relevant Files/Modules**: `Full-Stack/lib/auth.ts`, `Full-Stack/app/teacher/dashboard/page.tsx`, `Full-Stack/app/teacher/attendance/[classId]/page.tsx` [6], and other components relying on `getUser()`.

### 4.7. API Error Handling Consistency

**Feature Name**: Standardized API Error Response Format

**Description**: Ensure all API error responses from the Express.js backend adhere to a consistent, predictable JSON format, making it easier for frontend clients to parse and display error messages.

**Functional Requirements**:
*   **FR7.1**: Define a standard error response structure (e.g., `{ "message": "Error description", "code": "ERROR_CODE", "details": [...] }`).
*   **FR7.2**: Modify the global error handler in `src/app.js` to format all unhandled errors according to this standard.
*   **FR7.3**: Update specific error responses within route handlers (e.g., `400 Bad Request` from validation, `404 Not Found`, `409 Conflict`) to conform to the new standard.
*   **FR7.4**: Ensure appropriate HTTP status codes are always returned for different error types.

**Non-Functional Requirements**:
*   **NFR7.1 - Consistency**: All API error responses should have the same structure.
*   **NFR7.2 - Usability**: Frontend clients should be able to easily parse and display error information.

**Acceptance Criteria**:
*   **AC7.1**: All API endpoints return errors in the defined standard JSON format.
*   **AC7.2**: HTTP status codes accurately reflect the nature of the error.
*   **AC7.3**: Frontend error handling logic can be simplified due to consistent backend responses.

**Relevant Files/Modules**: `Full-Stack/src/app.js`, all `Full-Stack/src/routes/` files.

### 4.8. Database Migration for Production

**Feature Name**: Production Database Migration to PostgreSQL/MySQL

**Description**: Develop a plan and implement the necessary changes to migrate the development SQLite database to a production-grade relational database like PostgreSQL or MySQL.

**Functional Requirements**:
*   **FR8.1**: Update `prisma/schema.prisma` to use `postgresql` or `mysql` as the database provider.
*   **FR8.2**: Adjust `DATABASE_URL` environment variable configurations in `docker-compose.yml` [7] and `.env.example` to connect to the new database.
*   **FR8.3**: Add a new database service (e.g., `postgres` or `mysql`) to `docker-compose.yml` [7].
*   **FR8.4**: Create and apply new Prisma migrations for the chosen production database.
*   **FR8.5**: (Optional, if data exists) Develop a script or process to migrate existing data from SQLite to the new database.

**Non-Functional Requirements**:
*   **NFR8.1 - Scalability**: The chosen database should support production-level scalability and concurrency.
*   **NFR8.2 - Data Integrity**: Ensure data integrity is maintained during and after migration.
*   **NFR8.3 - Reliability**: The new database setup should be highly reliable and support backups.

**Acceptance Criteria**:
*   **AC8.1**: The application successfully connects to and operates with the new PostgreSQL/MySQL database.
*   **AC8.2**: All data operations (CRUD) function correctly with the new database.
*   **AC8.3**: The `docker-compose.yml` [7] file includes the new database service and correctly links it to the backend.

**Relevant Files/Modules**: `Full-Stack/prisma/schema.prisma` [3], `Full-Stack/docker-compose.yml` [7], `.env.example`, `src/prisma/seed.js`.

### 4.9. CI/CD Pipeline Establishment

**Feature Name**: Basic CI/CD Pipeline for Automated Builds and Tests

**Description**: Establish a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate the build, test, and potentially deployment processes for the project.

**Functional Requirements**:
*   **FR9.1**: Configure a CI service (e.g., GitHub Actions, GitLab CI, Jenkins) to trigger on code pushes to the main branch.
*   **FR9.2**: The pipeline should automatically install dependencies for all services (backend, frontend, AI service).
*   **FR9.3**: The pipeline should execute all automated tests (unit, integration, E2E) implemented in FR1.1-FR1.5.
*   **FR9.4**: The pipeline should build Docker images for all three services (backend, frontend, AI service).
*   **FR9.5**: (Optional) The pipeline should push built Docker images to a container registry.

**Non-Functional Requirements**:
*   **NFR9.1 - Automation**: Reduce manual effort in building and testing the application.
*   **NFR9.2 - Feedback Loop**: Provide fast feedback on code quality and potential issues.
*   **NFR9.3 - Reliability**: Ensure consistent and repeatable build and test processes.

**Acceptance Criteria**:
*   **AC9.1**: A configured CI/CD pipeline runs successfully on every code push.
*   **AC9.2**: All tests within the pipeline pass, and build artifacts are successfully generated.
*   **AC9.3**: The pipeline provides clear status updates on build and test results.

**Relevant Files/Modules**: `.github/workflows/main.yml` (for GitHub Actions) or equivalent CI configuration files, `Dockerfile.backend`, `Dockerfile.frontend`, `ai-service/Dockerfile`, `package.json`.

## 5. Conclusion

Implementing the improvements detailed in this PRD will significantly enhance the Smart School Ecosystem Platform, transforming it from a strong graduation project into a more robust, performant, and maintainable application ready for real-world deployment. These enhancements will not only address current technical considerations but also lay a solid foundation for future growth and development.

--- 

## References

*   [1] Smart-School-GP/Full-Stack GitHub Repository: [https://github.com/Smart-School-GP/Full-Stack.git](https://github.com/Smart-School-GP/Full-Stack.git)
*   [2] Project README.md: [Full-Stack/README.md](Full-Stack/README.md)
*   [3] Prisma Schema: [Full-Stack/prisma/schema.prisma](Full-Stack/prisma/schema.prisma)
*   [4] Backend Admin Routes: [Full-Stack/src/routes/admin.js](Full-Stack/src/routes/admin.js)
*   [5] AI Service Integration: [Full-Stack/src/services/aiService.js](Full-Stack/src/services/aiService.js)
*   [6] Frontend Attendance Page (Offline Sync): [Full-Stack/app/teacher/attendance/[classId]/page.tsx](Full-Stack/app/teacher/attendance/[classId]/page.tsx)
*   [7] Docker Compose Configuration: [Full-Stack/docker-compose.yml](Full-Stack/docker-compose.yml)
