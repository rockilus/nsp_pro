# GitHub Copilot Instructions for NSP Pro — Agent Playbook

This file is an agent-focused playbook for the NSP Pro monorepo. It builds on the short guidance and adds concrete, repo-specific procedures, files to read first, and examples you can act on immediately.

Keep this concise and actionable. If you change cross-service payloads, update `backend/shared` DTOs first.

## 1 — Quick start (what to read first)
- `backend/shared/src` — canonical DTOs and schemas. Read these before changing payload shapes.
- `backend/api_gateway/src` — where public HTTP endpoints and SQS enqueuing happen (look in `src/routes` and `src/services`).
- `backend/solve_service/src` — solver entrypoints and SQS consumers (see `core_to_engine_service/` and `src/` modules).
- `frontend/` — Next.js app; inspect `frontend/src/app/lib` for API clients and how the UI expects payloads.
- `database_migration/migrations/` and `init-mongo.js` — DB shape and local seed scripts.

## 2 — Big-picture architecture (summary)
- Services:
  - `api_gateway/` (FastAPI): public API, auth via AWS Cognito, builds/enqueues SQS messages for background solving.
  - `solve_service/` (Python): SQS consumer that runs the OR-Tools solver and writes results using shared schemas.
  - `shared/` (Python): DTOs, DB connectors, and logging utilities shared across services.
  - `frontend/` (Next.js): TypeScript + MUI + Tailwind, built for static export (`next export`) where possible.
- Data flow example: API Gateway accepts schedule create -> sends message to AWS SQS -> solve_service consumes -> solver runs -> writes assignments/results to DB.

## 3 — Key directories and files (concrete examples)
- `backend/api_gateway/src/services` — SQS enqueue code (task shapes live here).
- `backend/solve_service/src/core_to_engine_service/` — period/date handling and conversion utilities used by the solver.
- `backend/shared/src/schemas` — shared models (import as `shared.schemas.core`). Example import used across services:

  from shared.schemas.core import (
      Request, Schedule, Shift, ShiftDemandNew, ShiftType, Worker, WorkerDates
  )

- `database_migration/migrations/` — JS migrations that reveal DB document shape changes.

## 4 — Developer workflows & useful commands
Note: there are multiple docker-compose files for different workflows (dev, tests, CI). Prefer the per-service compose under `backend/` when working on a single service.

Local dev (quick):

```bash
# from repo root
docker-compose -f docker-compose.yml up --build

# or start backend services only
cd backend && docker-compose up --build
```

Run Python tests (backend):

```bash
# run from backend/
pytest

# or run tests for a specific service, e.g. api_gateway
cd backend/api_gateway && pytest
```

Service checks and linting (Makefile targets):

```bash
# from backend/
make solve_service_check   # runs typecheck/linters for solve_service
```

Frontend dev:

Note for agents: when running frontend build or tests (for example `npx tsc`, Playwright, or other frontend test/compile commands), you must run those commands from inside the `frontend` directory. In other words, first run `cd frontend` and then run `npx tsc`, `npx playwright test`, `npm run test`, or similar commands from that folder.

Agent note: when running Playwright tests, prefer running with Chromium only to reduce resource usage and speed up runs (for example: `npx playwright test --project=chromium`).

```bash
cd frontend
npm install
npm run dev
# static export
npm run build && npm run export
```

If you modify shared DTOs, run tests for both services that import them.

## 5 — Patterns and conventions (practical)
- Python: use type hints, small pure functions, and import DTOs from `shared.schemas.core`.
- Logging: use `loguru` from `backend/shared` utilities. Structured messages help debugging across services.
- Time units: scheduling code uses minutes and seconds constants (see `utils/constants` and functions in `core_to_engine_service/`). Many solver inputs expect minute-based integers.
- Period/worker shapes: the codebase uses periods expressed as List[List[date]] and assignment tuples `(worker_id, date_iso, shift_id)` for solver constraints — preserve these shapes.
- Database usage: prefer the shared `db` connectors in `backend/shared` for consistent connection handling; migrations live in `database_migration/`.

## 6 — Integration points & environment notes
- Auth: AWS Cognito (API Gateway uses Cognito; changes to authentication affect only `api_gateway`).
- Messaging: AWS SQS connects API Gateway -> solve_service. Inspect `api_gateway` for enqueue code and `solve_service` for consumer handlers to match message shapes.
- DB: MongoDB locally; AWS DocumentDB in staging/production. Use `init-mongo.js` for local seeding and `database_migration/migrations/` for schema changes.
- External libs: solver uses Google OR-Tools; ensure the correct wheel/compat for local dev (see service `pyproject.toml`).

## 7 — Troubleshooting and debugging tips
- If tests fail after DTO changes, the likely cause is mismatched import or field name — run `pytest -q` in both services and check failing traces for serialization errors.
- To reproduce a solver run locally:
  1. Find where `api_gateway` enqueues the SQS message for starting a solve (search `send_message` or SQS client usage in `backend/api_gateway/src`).
  2. Build a sample message using the shared DTOs and run the `solve_service` consumer locally (or use the code path that reads SQS in `solve_service/src`).
  3. Run the `solve_service` code in a container or locally with the same Python environment as CI.

- Use `init-mongo.js` to seed local DB so solver has data; migrations give clues on expected fields.

## 8 — Example inspection checklist (quick actions an agent should take)
1. Open `backend/shared/src` — list DTOs and find the canonical types.
2. Open `backend/api_gateway/src/services` — find message enqueuing and example payloads.
3. Open `backend/solve_service/src` — find SQS consumers and the solver orchestration (`core_to_engine_service/`).
4. Open `frontend/src/app/lib` — inspect API client usage and the UI data expectations.

## 9 — Small examples & snippets (copyable patterns)
- Shared DTO import used across the repo:

```python
from shared.schemas.core import (
    Request, Schedule, Shift, ShiftDemandNew, ShiftType, Worker, WorkerDates
)
```

- Common assignment tuple shape (solver inputs): `(worker_id, date_iso, shift_id)`

## 10 — Quality gates & checks
- Before finishing a change, run: unit tests, linters/typechecks for affected services, and a local smoke test (start services via docker-compose or run the specific service locally).
- Important Makefile targets: `make solve_service_check` (runs service checks), and service-specific test runners found in each service folder.

## 11 — Next steps for the agent (if you want me to expand further)
- Add exact SQS message examples with field names and a minimal script that posts an SQS message for local testing.
- Add a one-page `HOWTO-runsolver-locally.md` with step-by-step instructions: seed DB, construct test message, run consumer, check results.
- Add CI/coverage quick checks and an example of running a specific test file.

If you'd like any of the expansions above, tell me which one and I'll add it to this file and create small runnable examples or tests.

---
Keep edits short and repository-focused. When in doubt, prefer reading `backend/shared` types before changing cross-service payloads.

