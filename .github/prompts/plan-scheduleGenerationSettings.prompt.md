# Plan: Schedule Generation Settings

## TL;DR
Add per-team "Schedule generation" settings stored in a dedicated `team_generation_settings` MongoDB collection (separate repository). Expose via dedicated API endpoints. Display in a new team settings page (GitHub-style, shadcn/ui). Solve service reads team settings at solve time and overrides `model_config` before running. No migration — teams without a document get defaults at the application layer.

## Two parameters
1. `duty_scope_work_time` (bool, default true) — include work-time constraints when scope=DUTIES
2. `duty_consecutive_gap_mode` ("off"|"set"|"auto") + `duty_consecutive_gap_days` (int, default 2)

---

## Phase 1: Shared library — data model

1. Create `backend/shared/src/shared/schemas/core/team_generation_settings.py`
   - `@dataclass TeamGenerationSettings` with fields:
     - `team_id: str`
     - `duty_scope_work_time: bool = True`
     - `duty_consecutive_gap_mode: str = "off"` # "off" | "set" | "auto"
     - `duty_consecutive_gap_days: int = 2`
   - Class method `default(team_id: str) -> TeamGenerationSettings` — returns defaults; the single source of truth used everywhere a document is absent
   - `to_dict()` / `from_dict()` helpers

2. Create `backend/shared/src/shared/schemas/dto/team_generation_settings.py`
   - `class TeamGenerationSettingsDTO(BaseModel)` with same fields and validators

3. Create `backend/shared/src/shared/database/schemas/team_generation_settings.py`
   - `TeamGenerationSettingsSchema(DocumentBaseSchema)` with all fields
   - `to_core()` / `from_core()` round-trip

4. Create `backend/shared/src/shared/database/team_generation_settings_db.py`
   - `get_by_team_id(team_id: str) -> TeamGenerationSettings | None` — returns `None` if no document (caller applies `.default()`)
   - `upsert(settings: TeamGenerationSettings) -> TeamGenerationSettings` — `update_one({team_id}, $set, upsert=True)`; first PUT for any team auto-creates the document
   - Uses MongoDB `find_one({"team_id": team_id})` and `update_one(..., upsert=True)`

5. Register new DB in `backend/shared/src/shared/database/database_collections.py`
   - Add `team_generation_settings_db: TeamGenerationSettingsDB`

6. Export new types/classes from `__init__` files (core, dto, database)

7. Add `duty_scope_skip_work_time: bool = False` to `SystemConstraints` in `backend/shared/src/shared/schemas/core/engine.py`

8. Run: `cd backend && just all shared`

**No migration.** Teams without a settings document get `TeamGenerationSettings.default(team_id)` at the application layer — the DB is only written on first explicit save.

**No changes to:** `team.py`, `TeamDTO`, `TeamSchema`.

---

## Phase 2: API Gateway — endpoints

*Depends on Phase 1*

9. Add route handlers in `backend/api_gateway/src/routes/team_routes.py`:
   - `GET /teams/{team_id}/generation-settings` → returns `TeamGenerationSettingsDTO`; auth: `read-team`
   - `PUT /teams/{team_id}/generation-settings` → body `TeamGenerationSettingsDTO`, returns `TeamGenerationSettingsDTO`; auth: `update-team`

10. Add methods to `backend/api_gateway/src/services/team_service.py`:
    - `get_generation_settings(team_id) -> TeamGenerationSettings`: `collection.team_generation_settings_db.get_by_team_id(team_id) or TeamGenerationSettings.default(team_id)`
    - `update_generation_settings(team_id, settings) -> TeamGenerationSettings`: validate team exists, then `collection.team_generation_settings_db.upsert(settings)` (first-time creates document, subsequent calls update it — no migration needed)

11. Run: `cd backend && just all api_service`

---

## Phase 3: Solve service — consume settings

*Depends on Phase 1, parallel with Phase 2*

12. Add placeholder function `calculate_auto_gap() -> int` in
    `backend/solve_service/src/core_to_engine_service/calculate_worker_nb_duties.py`
    — returns 2 for now; clearly marked TODO

13. Update `backend/solve_service/src/solve_service/solve_schedule.py`:
    - Add optional param `model_config_override: ModelConfig | None = None`
    - Use `model_config_override or model_config` (the module-level default)

14. Update `backend/solve_service/src/sqs_consumer.py` in `_solve_schedule`:
    - After `get_engine_inputs(...)`, load settings: `settings = self.collections.team_generation_settings_db.get_by_team_id(schedule.team_id) or TeamGenerationSettings.default(schedule.team_id)`
    - `effective_config = deepcopy(model_config)` (import from `solve_service.model_config`)
    - Apply gap mode from settings:
      - `"off"` → `effective_config.system_constraints.duty_consecutive_gap = False`
      - `"set"` → `True`, `duty_consecutive_gap_min_days = settings.duty_consecutive_gap_days`
      - `"auto"` → `True`, `duty_consecutive_gap_min_days = calculate_auto_gap()`
    - Apply work-time flag: `effective_config.system_constraints.duty_scope_skip_work_time = not settings.duty_scope_work_time`
    - Pass `model_config_override=effective_config` to `solve_schedule(...)`

15. Add conditional work-time skip in `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py`:
    - Determine whether to skip: `skip_work_time = engine_inputs.model_config.system_constraints.duty_scope_skip_work_time and solve_scope is not None and solve_scope.scope_type == SolveScopeType.DUTIES`
    - Gate the `weekly_target_work_time` block: `if engine_inputs.model_config.system_constraints.weekly_target_work_time and not skip_work_time`
    - Gate the `work_loads` block (in `configuration_constraints`): `if engine_inputs.model_config.configuration_constraints.work_loads and not skip_work_time`

16. Run: `cd backend && just all solve_service no tests`

---

## Phase 4: Frontend

*Depends on Phase 2*

17. Add i18n keys to all three locale files (en, fr, es) under `teams-page` namespace:
    - `schedule_generation`, `schedule_generation_desc`
    - `duty_scope_work_time`, `duty_scope_work_time_desc`
    - `duty_consecutive_gap`, `duty_consecutive_gap_desc`
    - `gap_mode_off`, `gap_mode_set`, `gap_mode_auto`
    - `save`, `saving`, `saved` (or reuse existing keys if already present)

18. Add frontend types in `frontend/src/types/team-generation-settings.ts`:
    - `TeamGenerationSettingsT` type
    - `GapMode` union type: `"off" | "set" | "auto"`

19. Add API hooks in `frontend/src/hooks/useTeamGenerationSettings.ts`:
    - `useGetTeamGenerationSettings(teamId)` — GET `/teams/{id}/generation-settings`
    - `useUpdateTeamGenerationSettings()` — PUT `/teams/{id}/generation-settings`

20. Create component `frontend/src/components/teams-settings/generation-settings/generation-settings-tab.tsx`:
    - GitHub-style layout: section header → setting rows, each with title + description on the left, control on the right
    - Section "Duties scope":
      - Setting: "Work time constraints" — checkbox (`duty_scope_work_time`)
    - Section "Duty gap":
      - Setting: "Minimum gap between duties" — `RadioGroup` with options Off / Set number / Auto; when "Set" is selected, show a number `Input` for days
    - shadcn/ui only: `Checkbox`, `RadioGroup`/`RadioGroupItem`, `Input`, `Label`, `Separator`, `Button` (save)
    - No MUI; Tailwind for layout
    - Optimistic local state; save button calls `useUpdateTeamGenerationSettings`

21. Create page `frontend/src/app/[lng]/plan/teams/generation-settings/page.tsx`

22. Update `frontend/src/components/teams-settings/team-settings-layout.tsx` nav links array:
    ```typescript
    {
      name: 'generation-settings',
      label: t('schedule_generation'),
      href: `/${lng}/plan/teams/generation-settings?teamId=${teamId}`,
    }
    ```

23. Run: `cd frontend && just all`

---

## Relevant files

### New files
- `backend/shared/src/shared/schemas/core/team_generation_settings.py`
- `backend/shared/src/shared/schemas/dto/team_generation_settings.py`
- `backend/shared/src/shared/database/schemas/team_generation_settings.py`
- `backend/shared/src/shared/database/team_generation_settings_db.py`
- `frontend/src/types/team-generation-settings.ts`
- `frontend/src/hooks/useTeamGenerationSettings.ts`
- `frontend/src/components/teams-settings/generation-settings/generation-settings-tab.tsx`
- `frontend/src/app/[lng]/plan/teams/generation-settings/page.tsx`

### Modified files
- `backend/shared/src/shared/database/database_collections.py` — register new DB
- `backend/shared/src/shared/schemas/core/engine.py` — add `duty_scope_skip_work_time: bool = False` to `SystemConstraints`
- `backend/shared/src/shared/schemas/core/__init__.py` — export `TeamGenerationSettings`
- `backend/shared/src/shared/schemas/dto/__init__.py` — export `TeamGenerationSettingsDTO`
- `backend/api_gateway/src/routes/team_routes.py` — new endpoints
- `backend/api_gateway/src/services/team_service.py` — new methods
- `backend/solve_service/src/sqs_consumer.py` — load settings, override model_config
- `backend/solve_service/src/solve_service/solve_schedule.py` — accept model_config_override
- `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py` — skip work time on duties scope
- `backend/solve_service/src/core_to_engine_service/calculate_worker_nb_duties.py` — add `calculate_auto_gap()`
- `frontend/src/components/teams-settings/team-settings-layout.tsx` — add nav entry
- `frontend/src/app/i18n/locales/en/teams-page.json` — new keys
- `frontend/src/app/i18n/locales/fr/teams-page.json` — new keys
- `frontend/src/app/i18n/locales/es/teams-page.json` — new keys

---

## Verification
1. `cd backend && just all shared` — shared library tests pass
2. `cd backend && just all api_service` — API tests pass; manually test GET and PUT `/teams/{id}/generation-settings` for new and existing teams
3. `cd backend && just all solve_service no tests` — lint/typecheck pass
4. `cd frontend && just all` — lint, typecheck, vitest pass
5. Manual E2E: Open team settings → see "Schedule generation" tab → change settings → save → trigger a DUTIES-scope solve → verify constraints applied/skipped correctly

---

## Decisions
- **Separate repository** (`team_generation_settings` collection) — not embedded in Team document. Cleaner API boundary, easier to extend with more fields over time.
- **`TeamGenerationSettings.default(team_id)`** is the single canonical fallback used in API gateway, solve service, and frontend initial state. No migration ever needed.
- **`upsert` on PUT** — no "create vs update" branching anywhere. First save auto-creates the document.
- **`calculate_auto_gap()` placeholder** returns `2` — marked as TODO for future algorithmic implementation.
- **`duty_scope_skip_work_time` flag in `SystemConstraints`** — cleanest mechanism; set from team settings in the consumer before passing to the engine. Avoids threading scope-type awareness deep into `core_to_engine_inputs`.
- **New frontend page uses shadcn/ui only** (no MUI), consistent with design system spec.
- **Auth:** GET uses `read-team`, PUT uses `update-team` — aligns with existing Cerbos policy; no new policy entries needed.
