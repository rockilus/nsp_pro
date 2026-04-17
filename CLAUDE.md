# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Rockilus

Rockilus is an advanced **Workforce Management (WFM) and algorithmic scheduling SaaS** for healthcare teams. Managers configure shifts/constraints and generate schedules via an OR-Tools solver; team members submit requests and view their schedule.

---

## Commands

All commands use `just`. Run from the directory indicated.

### Frontend (`frontend/`)
```bash
just all                          # format, lint, typecheck, vitest, jest
npx vitest run tests/unit/page.test.tsx
npx jest tests/__tests__/components/schedule/some.test.tsx
npx playwright test --project=chromium   # E2E (only when explicitly prompted)
npx playwright test --ui                 # interactive E2E mode
```

### Backend — API Service (`backend/`)
```bash
just all api_service              # format, lint, typecheck, pytest
cd api_gateway && uv run pytest tests/routes/test_user_routes.py
cd api_gateway && uv run pytest -k "test_daily"
cd api_gateway && just dev        # uvicorn on 127.0.0.1:4000
```

### Backend — Solve Service (`backend/`)
```bash
just all solve_service no tests   # format, lint, typecheck (no tests)
cd solve_service && uv run pytest tests/path/to/test.py
```

### Backend — Shared Library (`backend/`)
```bash
just all shared                   # format, lint, typecheck, pytest
```

### Rockilus Web (`rockilus-web/`)
```bash
just all
```

### Local stack
```bash
docker-compose up --build         # full stack (MongoDB, Cerbos PDP, services)
```

---

## Architecture

```
Browser → CloudFront → S3 (Next.js static export)
                ↓
        AWS API Gateway + Cognito (AuthN)
                ↓
        ECS: api_gateway (FastAPI) + Cerbos PDP sidecar (AuthZ, gRPC :3592)
                ↓ SQS async
        ECS: solve_service (OR-Tools)
                ↓
        AWS DocumentDB (MongoDB locally)
```

Three Python services share code via `backend/shared/`:
- **`backend/api_gateway/`** — REST API, Cognito AuthN, Cerbos AuthZ, SQS enqueue
- **`backend/solve_service/`** — SQS consumer + OR-Tools scheduling solver
- **`backend/shared/`** — canonical DTOs/schemas, pymongo connectors, logging utilities

**Frontend** is a static-export Next.js app in `frontend/`; no server-side code.

**`rockilus-web/`** is a separate marketing site with the same static-export constraints.

---

## Key Paths

| Path | Purpose |
|------|---------|
| `backend/shared/src/schemas/` | Canonical DTOs — read before changing any cross-service payload |
| `backend/api_gateway/src/services/` | SQS enqueue code and task shapes |
| `backend/api_gateway/src/integrations/authorization/` | Cerbos client + AuthZ service |
| `backend/solve_service/src/core_to_engine_service/` | Solver orchestration, period/date handling |
| `cerbos-policies/resource_policies/` | AuthZ YAML policies per resource kind |
| `frontend/src/app/lib/` | API client and UI data expectations |
| `database_migration/` | MongoDB migrations and local seed (`init-mongo.js`) |
| `infra/` | Terraform IaC for all AWS resources |

---

## Cross-Service Change Checklist

1. Update the shared DTO in `backend/shared/src/schemas/` first.
2. Update enqueue shapes in `backend/api_gateway/src/services/`.
3. Update solver orchestration in `backend/solve_service/src/core_to_engine_service/`.
4. Update API client usage in `frontend/src/app/lib/`.
5. Run tests for **both** `api_gateway` and `solve_service`.

**Canonical DTO import:**
```python
from shared.schemas.core import (
    Request, Schedule, Shift, ShiftDemandNew, ShiftType, Worker, WorkerDates
)
```

**Solver assignment tuple shape:** `(worker_id, date_iso, shift_id)`

---

## Frontend Rules (strict)

- **No server-side code** — no Next.js API routes, Server Actions, `getServerSideProps`, or Middleware. Data fetching is client-side only.
- **No `next/image`** without `unoptimized: true` — static export constraint.
- **UI only via Tailwind + shadcn/ui** — no MUI, Bootstrap, CSS modules, or SCSS. Add new components via `shadcn add`.
- **Icons via `lucide-react`** only.
- **Never hardcode user-facing strings** — always use the i18n system (English, French, Spanish).
- **Design tokens** from `src/app/globals.css` — use CSS variables (`var(--color-primary)`) not hardcoded colors.
- Support **light and dark themes**; validate both modes. Ensure responsive layouts across desktop/tablet/mobile.

---

## Backend Rules

- **Type hints everywhere.** Keep functions small and pure.
- **`loguru`** for all structured logging — never `print()` or stdlib `logging`.
- **Timezone-explicit** date/time logic in the solver — never assume UTC silently.
- Scheduler time units are **minutes-based integers** (see `utils/constants`).
- Periods are `List[List[date]]` — preserve this shape throughout the solver pipeline.
- Use shared `db` connectors from `backend/shared` for all DB access.
- When adding new protected resources or actions, add a resource policy YAML under `cerbos-policies/resource_policies/`.

---

## Authorization (Cerbos)

- Cerbos PDP runs as an ECS sidecar; `api_gateway` connects via gRPC on port 3592.
- Single entry point: `CerbosAuthzService.check(user_id, action, resource_kind, resource_id)`.
- Supported resource kinds: `user`, `team`, `admin`.
- Roles derived from `SystemRole` (super_admin) and team memberships via `TEAM_ROLE_TO_AUTHZ_ROLE`.
