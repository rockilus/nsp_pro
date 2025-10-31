# GitHub Copilot Instructions for NSP Pro (concise)

This file gives focused, actionable guidance for an AI coding agent working in the NSP Pro monorepo.
Keep it short and concrete — the goal is to get productive quickly.

1) Big-picture architecture (what to read first)
   - Three main services under `backend/`:
     - `api_gateway/` (FastAPI): public HTTP endpoints, auth (AWS Cognito), AWS SQS task submission.
     - `solve_service/` (Python): AWS SQS worker that runs the OR-Tools solver; reads shared schemas.
     - `shared/` (Python): canonical schemas/models, DB connectors, logging utilities used by both services.
   - Frontend is a Next.js app in `frontend/` (app dir, TS + MUI + Tailwind). Static-exportable via `next export`.
   - Data flow example: API Gateway accepts schedule create -> sends message to AWS SQS -> `solve_service` consumes -> reads/writes the database using shared schemas (MongoDB locally; AWS DocumentDB in staging/production).

2) Key directories and examples
   - `backend/api_gateway/src/` — API routes and services (look at `src/routes` and `src/services`).
   - `backend/solve_service/src/` — solver orchestration and task handlers. See `core_to_engine_service/` and other modules in `src/` for period/date handling and solver orchestration examples.
   - `backend/shared/src/` — shared DTOs / schemas (imported as `shared.schemas.core`).
   - `database_migration/migrations/` — migration JS files (Mongo migrations). Use these to understand DB shape changes.

3) Developer workflows & commands (practical)
   - Run backend unit tests: from `backend/` run `pytest` (or use the per-service pytest.ini inside `api_gateway/`).
   - Check/format/lint: services use Python type hints and `pyproject.toml`. Run the service-specific checks via `Makefile` targets (e.g. `make solve_service_check` from `backend/`).
   - Local dev with containers: there are multiple compose files. Typical: `docker-compose -f docker-compose.yml up --build` from repo root or use service-specific compose under `backend/`.
   - Frontend dev: `npm install` then `npm run dev` in `frontend/`. For static export use `next build && next export`.

4) Patterns & conventions to follow
   - Python: use type hints, small pure functions, and import shared DTOs from `shared.schemas.core` rather than re-declaring types.
   - Logging: use `loguru` (see `backend/shared` utilities). Prefer structured messages.
   - Time units: scheduling code frequently uses minutes/seconds constants (see `utils/constants` and `calculate_worker_work_times.py`). Many functions expect minute-based integers.
   - Period/worker loops: code often iterates periods (List[List[date]]), worker id maps, and builds assignments as tuples `(worker_id, date_iso, shift_id)`; preserve that shape when creating constraints.

5) Integration points & external dependencies
   - Auth: AWS Cognito (configured for API Gateway). Changes to auth flows impact `api_gateway` only.
   - Task queue / messaging: AWS SQS is used for messages between `api_gateway` and `solve_service`. Task/message formats are defined in `api_gateway` when enqueuing and consumed by `solve_service`.
   - DB: MongoDB locally; AWS DocumentDB in staging and production. Migrations are in `database_migration/`. Use `init-mongo.js` for local DB seeding.

6) What an agent should do first (practical checklist)
   - Inspect `backend/shared/src` to learn canonical schemas and DTOs (imported as `shared.schemas.core`).
   - Open `backend/api_gateway/src` to find how messages are enqueued to SQS and the task/message payload shapes.
   - Open `backend/solve_service/src` to see how SQS messages are consumed and what shapes the solver expects.
   - Inspect `frontend/` (Next.js app) to understand UI shape, API clients (`frontend/src/app/lib`) and static-export constraints.
   - Run unit tests for the modified service after changes.

7) Small examples to reference
   - Period handling: inspect `backend/solve_service/src/core_to_engine_service/` for functions handling periods, coefficients, and minute conversions (the codebase uses List[List[date]] patterns and minute-based durations).
   - Shared DTO import: `from shared.schemas.core import (Request, Schedule, Shift, ShiftDemandNew, ShiftType, Worker, WorkerDates)`

If anything above is unclear or you want additional examples (e.g., quick-start steps for running a solver task locally), tell me which area to expand and I will update this file. 

---
Keep edits short and repository-focused. When in doubt, prefer reading `backend/shared` types before changing cross-service payloads.

# GitHub Copilot Instructions for NSP Pro

## Project Overview

NSP Pro is a SaaS web application for healthcare scheduling. It allows healthcare organizations to:

- Create and manage teams
- Define shifts and staffing requirements
- Set scheduling constraints
- Generate schedules either manually or automatically using an optimization solver
- Visualize and adjust schedules in a calendar interface

As a healthcare application, reliability, security, and intuitive user experience are critical priorities.

## Architecture


### Frontend

- **Framework**: Next.js (app directory) with React and TypeScript
- **UI Libraries**: Material UI components with Tailwind CSS for styling
- **Authentication**: AWS Cognito
- **State Management**: React Context API
- **Static Deployment**: The frontend must be implemented to support static export and deployment to Amazon S3. All routing, asset handling, and build configuration should be compatible with static hosting environments (e.g., using `next export` and avoiding server-only features).
- **Key directories**:
  - `frontend/src/app` - Next.js pages and routes
  - `frontend/src/components` - Reusable React components
  - `frontend/src/types` - TypeScript type definitions
  - `frontend/src/app/lib` - API clients and utilities

### Backend

Microservice architecture with three main components:

1. **API Gateway** (`backend/api_gateway`)
   - FastAPI server
   - AWS Cognito for authentication (authentication is handled by AWS API Gateway)
   - Permit.io for authorization
   - AWS SQS for task queue management
   - MongoDB for data storage locally; AWS DocumentDB in staging/production

2. **Solver Service** (`backend/solve_service`)
   - Listens to AWS SQS queue for scheduling tasks
   - Uses Google OR-Tools for constraint-based optimization
   - Processes schedules according to rules and constraints

3. **Shared Library** (`backend/shared`)
   - Common code shared between services
   - Database schemas and models
   - Logging utilities (using Loguru)
   - MongoDB connection management (using PyMongo)

4. **Redis** for task queue and messaging between services

## Key Concepts

### Teams and Workers

- Teams are the top-level organizational unit
- Workers belong to teams and have specific roles/specialties
- Team members have different access levels (owner, member)

### Schedules and Campaigns

- A schedule represents a specific time period (e.g., a month)
- Schedules can be in different states (CAMPAIGN, VALIDATED)
- Campaigns are schedules being actively worked on

### Shifts and Assignments

- Shifts define work periods (e.g., morning shift, night shift)
- Assignments connect workers to shifts on specific dates
- Shifts can have staffing requirements and specialties

### Solver

- The solver uses constraint programming to generate optimal schedules
- Constraints can be "hard" (must be satisfied) or "soft" (preferences)
- The solver status can be tracked (PENDING, STARTED, SUCCESS, etc.)

## Coding Standards

### TypeScript/React

- Use functional components with hooks
- Type all props and state
- Use TypeScript interfaces for complex objects
- Follow Material UI patterns for component styling
- Use Tailwind for custom styling needs

### Python

- Follow PEP 8 style guidelines
- Use type hints
- Use async/await for asynchronous operations
- Document functions and modules with docstrings

## Common Patterns

### Frontend

- Page components in `/frontend/src/app/[lng]/plan/...`
- Shared components in `frontend/src/components`
- API clients in `frontend/src/app/lib`
- Type definitions in `frontend/src/types`

### Backend

- API routes in `backend/api_gateway/src/routes`
- Services in `backend/api_gateway/src/services`
- Database models in `/backend/shared/schemas/`

## Key Features

### Schedule Management

- Creating and updating schedules
- Managing assignments
- Handling recurrences for repeated assignments

### Solver Integration

- Solving schedules with constraints
- Tracking solver progress
- Handling breaches and optimization results

### Demand and Staffing

- Setting staffing requirements
- Quick staffing adjustments
- Handling staffing demands by day and shift

## Testing and Reliability

- Unit tests for critical functionality
- Error handling and logging for reliability
- Authorization checks for security

## Internationalization


The application supports multiple languages through the `[lng]` parameter in routes.

---

## Cyber Security and Production Best Practices

Cyber security is a top priority for NSP Pro. All code must be written in accordance with industry best practices for production applications, including but not limited to:
- Secure authentication and authorization (AWS Cognito, Permit.io)
- Proper validation and sanitization of all user input
- Protection against common web vulnerabilities (XSS, CSRF, SQL/NoSQL injection, etc.)
- Secure storage and handling of sensitive data
- Least-privilege access for all services and users
- Regular review and updating of dependencies
- Comprehensive error handling and logging without leaking sensitive information

Always follow security guidelines and review code for potential vulnerabilities before merging.

---

When contributing to this project, prioritize:
1. Type safety
2. Error handling
3. Security (authentication, authorization, and cyber security best practices)
4. Production-readiness and adherence to best practices
5. Performance (especially for schedule operations)
6. User experience
