# GitHub Copilot Instructions for NSP Pro — Agent Playbook

This file is an agent-focused playbook for the NSP Pro monorepo. It builds on the short guidance and adds concrete, repo-specific procedures, files to read first, and examples you can act on immediately.

Keep this concise and actionable. If you change cross-service payloads, update `backend/shared` DTOs first.

## 1 — Quick start (what to read first)
- `backend/shared/src` — canonical DTOs and schemas. Read these before changing payload shapes.
- `backend/api_gateway/src` — where public HTTP endpoints and SQS enqueuing happen (look in `src/routes` and `src/services`).
- `backend/solve_service/src` — solver entrypoints and SQS consumers (see `core_to_engine_service/` and `src/` modules).
- `frontend/` — Next.js app; inspect `frontend/src/app/lib` for API clients and how the UI expects payloads.
- `database_migration/migrations/` and `init-mongo.js` — DB shape and local seed scripts.

Note about `rockilus-web`:
- The `rockilus-web` folder is a companion Next.js site in this monorepo used for marketing and the public-facing landing pages. See [rockilus-web](rockilus-web) for source and build configuration.

## 2 — Big-picture architecture (summary)
- Services:
  - `api_gateway/` (FastAPI): public API, auth via AWS Cognito, builds/enqueues SQS messages for background solving.
  - `solve_service/` (Python): SQS consumer that runs the OR-Tools solver and writes results using shared schemas.
  - `shared/` (Python): DTOs, DB connectors, and logging utilities shared across services.
  - `frontend/` (Next.js): TypeScript + MUI + Tailwind, built for static export (`next export`) where possible.
    - Note: `rockilus-web` is a separate Next.js app in this repo (see [rockilus-web](rockilus-web)). Its technical stack and constraints are documented below and must be followed when making UI changes.
- Data flow example: API Gateway accepts schedule create -> sends message to AWS SQS -> solve_service consumes -> solver runs -> writes assignments/results to DB.

## 3 — Key directories and files (concrete examples)
- `backend/api_gateway/src/services` — SQS enqueue code (task shapes live here).
- `backend/solve_service/src/core_to_engine_service/` — period/date handling and conversion utilities used by the solver.
- `backend/shared/src/schemas` — shared models (import as `shared.schemas.core`). Example import used across services:

  from shared.schemas.core import (
      Request, Schedule, Shift, ShiftDemandNew, ShiftType, Worker, WorkerDates
  )

- `database_migration/migrations/` — JS migrations that reveal DB document shape changes.

rockilus-web specifics:
- Tech stack: Next.js (App Router), Tailwind CSS, shadcn/ui.
- Current state: a landing page engineered to evolve into a full website — keep code modular and separate marketing layouts from future application logic.
- Architecture & deployment: configured for Static Site Generation (SSG) with `output: 'export'` and deployed to AWS S3 behind a CDN. Treat the site as a static export site in all recommendations.

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

rockilus-web build reminder:
- When building `rockilus-web` locally, prefer commands documented in its package.json. Remember it targets static export and must be compatible with `next export`.
```

If you modify shared DTOs, run tests for both services that import them.

## 5 — Patterns and conventions (practical)
- Python: use type hints, small pure functions, and import DTOs from `shared.schemas.core`.
- Logging: use `loguru` from `backend/shared` utilities. Structured messages help debugging across services.
- Time units: scheduling code uses minutes and seconds constants (see `utils/constants` and functions in `core_to_engine_service/`). Many solver inputs expect minute-based integers.
- Period/worker shapes: the codebase uses periods expressed as List[List[date]] and assignment tuples `(worker_id, date_iso, shift_id)` for solver constraints — preserve these shapes.
- Database usage: prefer the shared `db` connectors in `backend/shared` for consistent connection handling; migrations live in `database_migration/`.

UI / rockilus-web front-end rules (strict):
- Tech stack: Next.js (App Router), Tailwind CSS utilities, and shadcn/ui components. Always adhere to these choices.
- No Server-Side Code: do NOT add Next.js API routes (`app/api/...`), Server Actions, `getServerSideProps`, Middleware, or any server-only code. All data fetching must be client-side (fetch from APIs from the browser) or determined at build time.
- Image Optimization: avoid using `next/image` default optimization unless you explicitly configure it for static export (for example by setting `unoptimized: true` or providing a custom loader). Do not rely on Node-based image optimization.
- Styling: use Tailwind utility classes and the existing shadcn/ui primitives. Do NOT add global CSS frameworks (MUI, Bootstrap), CSS modules, or additional SCSS files for new components.
- shadcn/ui usage: when new UI elements are needed, prefer adding a shadcn/ui component via its CLI and composition rather than implementing complex primitives from scratch.
- Component organization: separate marketing/layout components from application logic — place reusable marketing components under `rockilus-web/components/marketing` (or similar) and future app logic under `rockilus-web/app` or `rockilus-web/components/app`.

## 6 — Integration points & environment notes
- Auth: AWS Cognito (API Gateway uses Cognito; changes to authentication affect only `api_gateway`).
- Messaging: AWS SQS connects API Gateway -> solve_service. Inspect `api_gateway` for enqueue code and `solve_service` for consumer handlers to match message shapes.
- DB: MongoDB locally; AWS DocumentDB in staging/production. Use `init-mongo.js` for local seeding and `database_migration/migrations/` for schema changes.
- External libs: solver uses Google OR-Tools; ensure the correct wheel/compat for local dev (see service `pyproject.toml`).

Additional front-end integration notes:
- Because `rockilus-web` is deployed as a static export, third-party integrations that require server-side secrets or dynamic server-side rendering must be proxied through backend services (e.g., `api_gateway`) or handled entirely client-side with secure, public-safe flows.

## 7 — Troubleshooting and debugging tips
- If tests fail after DTO changes, the likely cause is mismatched import or field name — run `pytest -q` in both services and check failing traces for serialization errors.
- To reproduce a solver run locally:
  1. Find where `api_gateway` enqueues the SQS message for starting a solve (search `send_message` or SQS client usage in `backend/api_gateway/src`).
  2. Build a sample message using the shared DTOs and run the `solve_service` consumer locally (or use the code path that reads SQS in `solve_service/src`).
  3. Run the `solve_service` code in a container or locally with the same Python environment as CI.

- Use `init-mongo.js` to seed local DB so solver has data; migrations give clues on expected fields.

Front-end troubleshooting:
- If you see runtime differences between `next dev` and `next build && next export`, verify that you are not relying on any server-only APIs or environment variables. Static export will fail or behave differently if server-only code is present.
- For image-related build errors, ensure `next.config.js` or `package.json` build settings mark images as `unoptimized` for static exports, or replace `next/image` with plain `<img>` where appropriate.

## 8 — Example inspection checklist (quick actions an agent should take)
1. Open `backend/shared/src` — list DTOs and find the canonical types.
2. Open `backend/api_gateway/src/services` — find message enqueuing and example payloads.
3. Open `backend/solve_service/src` — find SQS consumers and the solver orchestration (`core_to_engine_service/`).
4. Open `frontend/src/app/lib` — inspect API client usage and the UI data expectations.

5. Open `rockilus-web` — confirm Next.js `output: 'export'`, Tailwind config, and presence of shadcn/ui usage.

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

Front-end follow-ups I can add on request:
- Add a short `HOWTO-rockilus-web-static-deploy.md` documenting `next build && next export` rules, recommended `next.config.js` snippets for static images, and S3/CDN upload steps.
- Create an `rockilus-web/FRONTEND_RULES.md` that programs the strict AI guardrails above into a small checklist for PR reviewers and automated linting suggestions.

If you'd like any of the expansions above, tell me which one and I'll add it to this file and create small runnable examples or tests.

---
Keep edits short and repository-focused. When in doubt, prefer reading `backend/shared` types before changing cross-service payloads.

