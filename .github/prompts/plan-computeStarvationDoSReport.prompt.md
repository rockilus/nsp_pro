# Compute Starvation & DoS Security Report

**Scope:** `backend/solve_service/src/sqs_consumer.py`, `backend/solve_service/src/solve_service/solve_schedule.py`, `backend/solve_service/src/engine/model/model.py`, `backend/solve_service/src/solve_service/model_config.py`, `docker-compose.yml`
**Date:** 2026-06-15 | **Severity:** CRITICAL / HIGH / MEDIUM / LOW

---

## Finding CS-1 — `timeout_seconds` Is a Dead Field: OR-Tools Runs on a Static Hardcoded Budget

**Severity:** HIGH

**Location:** `backend/solve_service/src/sqs_consumer.py` ~L182–198 · `backend/solve_service/src/solve_service/model_config.py` ~L43–94

**Finding:**

`SQSSolveMessage.timeout_seconds` (default `300`, per `backend/shared/src/shared/schemas/core/solve_task_status.py` L80) is received by the consumer but then silently dropped. In `_solve_schedule()`, only `message.solve_scope` is forwarded to `solve_schedule()`; `message.timeout_seconds` is never extracted, never passed downstream, and never reaches the OR-Tools `CpSolver` configuration:

```python
# sqs_consumer.py ~L190-198 — timeout_seconds is available on message but ignored
engine_outputs, processing_cache = solve_schedule(
    engine_inputs=engine_inputs,
    solve_scope=message.solve_scope,   # ← only scope is forwarded
    team_settings=team_settings,
    # timeout_seconds=message.timeout_seconds  ← NEVER passed
)
```

The OR-Tools `CpSolver` instead reads its time budget from a module-level singleton `model_config` constructed at import time in `model_config.py`. The `Model.solve()` method calls `estimate_time_limit()` clamped between `min_solve_time_seconds=30` and `max_solve_time_seconds=120` — both static values baked into the `ModelSetup` object:

```python
# model_config.py ~L90 — static, not derived from any runtime input
ModelSetup(sol_hint=False, min_solve_time_seconds=30, max_solve_time_seconds=120)
```

The `api_gateway` security report (Finding 3.1) confirms `timeout_seconds` was already identified as an intended control. Both ends of the contract agree it exists; neither end enforces it.

**Exploitation Scenario — Solver Runaway via Sequential Strategy:**

The `SolveStrategy.SEQUENTIAL` path in `Model.sequential_solve()` calls `solve_model_hts_custom()` up to **8 times in sequence**, each invocation resetting the model and invoking `self.solver.solve()` with a fresh 120-second budget. A request that repeatedly reaches `INFEASIBLE` before the final phase can legitimately hold the worker for up to **8 × 120 = 960 seconds** — over 16 minutes — per SQS message, with no wall-clock cap at the consumer level. A tenant with 3–4 carefully crafted infeasible schedules can saturate a single ECS instance for its entire SQS `VisibilityTimeout` window (configured as 900 seconds in `docker-compose.yml`), causing other tenants' messages to be held invisible and re-queued into the DLQ after `maxReceiveCount=3` attempts.

**Remediation:**

**Step 1 — Thread the timeout through the call chain:**

```python
# solve_schedule.py — add timeout_seconds parameter
def solve_schedule(
    engine_inputs: EngineInputs,
    solve_scope: SolveScope | None = None,
    team_settings: TeamGenerationSettings | None = None,
    timeout_seconds: int = 120,           # ← new parameter
) -> tuple[EngineOutputs, ProcessingCache]:
    ...
    # Pass down into model_config override
    model_config_override = model_config.model_copy(deep=True)
    model_config_override.model_setup.max_solve_time_seconds = timeout_seconds
    model_config_override.solver_params.max_time_in_seconds = timeout_seconds
    engine = Engine()
    outputs = engine.solve(inputs, model_config_override=model_config_override)
```

**Step 2 — Enforce the budget per-phase with a wall-clock guard in `Engine.solve()`:**

The `sequential_solve()` strategy must divide the budget across phases. Because the number of phases is not fixed, the safest approach is to pass the remaining wall-clock budget into each `solve()` invocation:

```python
# engine/model/model.py — Model.sequential_solve()
import time

def sequential_solve(self, inputs: Inputs, deadline: float | None = None) -> None:
    """Run sequential solve phases; abort if wall-clock deadline is exceeded."""
    phases = [
        # ... existing phase flag tuples ...
    ]
    for phase_kwargs in phases:
        if deadline is not None and time.monotonic() >= deadline:
            logger.warning("[Model] solve deadline reached, aborting remaining phases")
            return
        self.reset_model()
        self.solve_model_hts_custom(inputs, **phase_kwargs)
        if self.status != cp_model.INFEASIBLE:
            return
```

**Step 3 — Clamp `timeout_seconds` at the SQS message boundary (defense-in-depth):**

The shared DTO should validate the field to prevent a caller from supplying an unbounded value:

```python
# shared/schemas/core/solve_task_status.py — SQSSolveMessage
from pydantic import Field

timeout_seconds: int = Field(
    default=300,
    ge=10,          # minimum: 10 seconds
    le=900,         # maximum: capped at SQS VisibilityTimeout
    description="Timeout for solve operation in seconds",
)
```

---

## Finding CS-2 — No Per-Tenant / Per-User Concurrent Solve Quota at the Worker Level

**Severity:** HIGH

**Location:** `backend/solve_service/src/sqs_consumer.py` — `start_consuming()` / `_process_message()` · `backend/solve_service/src/main.py`

**Finding:**

Within a single container, the consumer is sequential: `start_consuming()` polls `max_messages=1` and `await`s `_process_message()` before polling again. This is safe for one replica. However, there is **no cross-replica coordination**:

1. AWS ECS can horizontally scale `solve-service` to N replicas, each independently draining the SQS queue. There is no SQS FIFO queue with message group keys, no Redis-backed semaphore, no DB lock — nothing preventing all N replicas from simultaneously processing messages belonging to the same tenant.
2. OR-Tools' `num_search_workers` is set to `os.cpu_count()` in `model_config.py` when `environment == "development"`:
   ```python
   # model_config.py ~L30
   num_search_workers = 2
   if (pytest_mode and environment == "production") or (
       not pytest_mode and environment == "development"
   ):
       num_search_workers = cpu_count   # ALL cores on the host
   ```
   A development deployment on an 8-core machine allocates all 8 OR-Tools worker threads per solve. A single solve already saturates the CPU.
3. There is no `asyncio.Semaphore` in the consumer to cap in-flight concurrent tasks if the polling loop were ever changed to `max_messages > 1`.

**Exploitation Scenario:**

An attacker with manager access enqueues N solve tasks (one per schedule, bypassing the per-schedule dedup check described in API Gateway report Finding 3.2). If ECS auto-scaling provisions 4 replicas, all 4 simultaneously process the attacker's tasks. Combined with CS-1's 960-second phase multiplication, 4 replicas × 16 minutes = a 16-minute starvation window for all other tenants. Legitimate users' solve tasks accumulate in the queue and expire to the DLQ.

**Remediation:**

**Option A — SQS FIFO queue with per-team message group key (preferred for strict ordering):**

Use an SQS FIFO queue and set `MessageGroupId = team_id` when enqueuing in `api_gateway`. SQS FIFO guarantees at-most-one in-flight message per group across all consumers, providing automatic per-tenant serialization:

```python
# api_gateway sqs_solve_service.py — when enqueuing
await sqs_client.send_message(
    QueueUrl=queue_url,
    MessageBody=message.model_dump_json(),
    MessageGroupId=team_id,              # ← per-tenant serialization
    MessageDeduplicationId=schedule_id,  # ← idempotency
)
```

**Option B — Consumer-level in-memory semaphore (lighter weight, single-replica):**

If multi-replica scaling remains standard queue-based, add a consumer-side semaphore and per-team active task tracking using a shared DB flag:

```python
# sqs_consumer.py
MAX_CONCURRENT_SOLVES = 1  # one per ECS task — enforced by polling loop

async def start_consuming(self):
    self.running = True
    while self.running:
        # Check that no active solve is running for the same team
        # before polling the next message
        messages = await self.sqs_solve_service.receive_messages(max_messages=1, ...)
        for message_data in messages:
            team_id = message_data.message.team_id
            active = self.collections.solve_task_status_db \
                .get_pending_or_in_progress_by_team_id(team_id)
            if active:
                # Return to queue — another replica is working on this team
                logger.warning(
                    "Solve already in progress for team {}, skipping message {}",
                    team_id, message_data.message_id
                )
                # Do NOT delete the message; let it return after visibility timeout
                continue
            await self._process_message(message_data)
```

---

## Finding CS-3 — No CPU or Memory Limits on `solve-service` Container

**Severity:** HIGH

**Location:** `docker-compose.yml` ~L122–134 · `docker-compose.dev.local.yml` (no `solve-service` block)

**Finding:**

The `solve-service` service definition contains no `deploy.resources.limits`, no `mem_limit`, and no `cpus` constraint:

```yaml
# docker-compose.yml ~L122 — full solve-service block
solve-service:
  build:
    context: ./backend
    dockerfile: solve_service/Dockerfile
  container_name: solve-service
  env_file:
    - .env.docker-compose.solve
  depends_on:
    - mongodb
    - localstack-init
  # ← no deploy.resources, no mem_limit, no cpus
```

OR-Tools CP-SAT is a multi-threaded combinatorial optimizer. On a healthcare schedule with ~30 workers × 60 days × 8 shift types, the model has over 63,000 boolean variables (observed in notebook benchmarks at `backend/solve_service/src/analyse_outputs.ipynb`). Under the `SEQUENTIAL` strategy with 8 phases and `num_search_workers = cpu_count`, a single solve can:

- Allocate several gigabytes of working memory for the SAT solver's internal clause database and LNS neighborhood structures.
- Pin all CPU cores for the duration of the estimate budget × number of phases.

Without container-level limits, the Docker runtime places no cgroup ceiling. A single large-problem solve on the host's shared memory can trigger the Linux OOM killer, which may terminate sibling containers (MongoDB, Cerbos, or FastAPI on the same Docker network), causing a full-stack outage rather than a graceful degradation of just the solve service.

On AWS ECS (without `ulimits` or task-level resource limits), an ECS task without explicit CPU/memory reservations competes for host resources with all other tasks on the same EC2 instance. ECS will not terminate an over-consuming task unless it exceeds the hard limit defined in the task definition — which is currently unbounded.

**Exploitation Scenario:**

An attacker enqueues a solve request with maximum `SolveScope.dates` (400 elements — currently uncapped, see API Gateway report Finding 2.2) across all workers and shifts. The resulting CP-SAT model could be 5–10× larger than the benchmarked 63K-variable case. With no memory ceiling, the solve-service container grows until the OOM killer fires on the EC2 host, disrupting all containers on that host. A cluster with 2 EC2 instances and back-to-back malicious solves on each achieves a full Rockilus outage from a single manager-role account.

**Remediation:**

Add resource limits to all Compose files and align with ECS task definition limits:

```yaml
# docker-compose.yml — solve-service block
solve-service:
  build:
    context: ./backend
    dockerfile: solve_service/Dockerfile
  container_name: solve-service
  env_file:
    - .env.docker-compose.solve
  depends_on:
    - mongodb
    - localstack-init
  deploy:
    resources:
      limits:
        cpus: "2"       # cap at 2 virtual cores
        memory: "4G"    # hard memory ceiling
      reservations:
        cpus: "0.5"
        memory: "1G"
```

Also cap `num_search_workers` in `model_config.py` to prevent it from consuming all host cores:

```python
# model_config.py — replace unbounded cpu_count usage
import os

MAX_SOLVER_WORKERS = int(os.getenv("MAX_SOLVER_WORKERS", "2"))
num_search_workers = min(MAX_SOLVER_WORKERS, os.cpu_count() or 1)
```

The `MAX_SOLVER_WORKERS` env var lets you tune per environment in the ECS task definition or `.env.docker-compose.solve` without code changes.

---

## Finding CS-4 — SQS `VisibilityTimeout` Does Not Account for `sequential_solve` Phase Multiplication

**Severity:** MEDIUM

**Location:** `docker-compose.yml` ~L59 (SQS queue init) · `backend/solve_service/src/sqs_consumer.py` `_process_message()`

**Finding:**

The solve SQS queue is configured with `VisibilityTimeout=900` (15 minutes):

```yaml
# docker-compose.yml ~L59
aws --endpoint-url=... sqs create-queue \
  --queue-name nsp-pro-dev-solve-queue \
  --attributes "VisibilityTimeout=900, ..."
```

A `SEQUENTIAL` strategy message can legitimately run for up to 960 seconds (CS-1 finding). This **exceeds the 900-second VisibilityTimeout by 60 seconds**. If the solve takes longer than 900 seconds, SQS makes the message visible again. Another consumer replica picks it up and starts a duplicate solve for the same schedule, consuming double the resources for a solve that was already in progress. This creates a feedback loop: two parallel solves for the same schedule, each potentially running for another 900 seconds.

The consumer has no logic to extend the visibility timeout during a long-running solve, and `_process_message()` has no solve-level watchdog:

```python
# sqs_consumer.py ~L115 — no visibility extension, no watchdog timer
(schedule_solve_status, assignments, breaches, solver_output) = await self._solve_schedule(
    message=message_content, message_id=message_id
)
# Only after full completion is the message deleted
await self.sqs_solve_service.delete_message(receipt_handle=receipt_handle)
```

**Remediation:**

Extend the message visibility periodically during long solves, and add a hard per-message wall-clock watchdog:

```python
# sqs_consumer.py
import asyncio

VISIBILITY_EXTENSION_INTERVAL = 300  # seconds
HARD_MESSAGE_TIMEOUT = 840           # seconds — safely inside 900s SQS window

async def _process_message(self, message_data: SQSSolveQueueMessage) -> None:
    receipt_handle = message_data.receipt_handle

    async def _extend_visibility():
        """Periodically extend the SQS message visibility to prevent re-queuing."""
        while True:
            await asyncio.sleep(VISIBILITY_EXTENSION_INTERVAL)
            await self.sqs_solve_service.change_message_visibility(
                receipt_handle=receipt_handle,
                visibility_timeout=900,
            )

    extension_task = asyncio.create_task(_extend_visibility())

    try:
        solve_coroutine = self._solve_schedule(
            message=message_data.message, message_id=message_data.message_id
        )
        result = await asyncio.wait_for(solve_coroutine, timeout=HARD_MESSAGE_TIMEOUT)
        ...
    except asyncio.TimeoutError:
        logger.error(
            "Solve timed out after {}s for schedule {}",
            HARD_MESSAGE_TIMEOUT, message_data.message.schedule_id,
        )
        await self._update_schedule_failure(
            message_id=message_data.message_id, error="Solver exceeded wall-clock timeout"
        )
        await self.sqs_solve_service.delete_message(receipt_handle)
    finally:
        extension_task.cancel()
```

---

## Finding CS-5 — `print()` Calls Throughout Solver Pipeline Bypass Structured Logging

**Severity:** LOW

**Location:** `backend/solve_service/src/engine/model/model.py` ~L988–1020 · `backend/solve_service/src/solve_service/solve_schedule.py` ~L58–70 · `backend/solve_service/src/sqs_consumer.py` ~L200–201

**Finding:**

The solver pipeline emits timing, variable counts, and solve status exclusively via `print()` rather than `loguru`. These calls produce unstructured stdout lines with no timestamp, no log level, no correlation ID, and no `schedule_id` context:

```python
# solve_schedule.py
print("engine inputs time:   " + f"{total_time_core_to_engine:.2f}s")
print("engine time:          " + f"{total_time_engine:.2f}s")

# sqs_consumer.py
print("solve campaign time:  " + f"{total_time:.2f}s")
print("TASK COMPLETE - SOLVE CAMPAIGN: ", message_id)

# model.py
print(f"[Model] time_limit_estimate: {estimate:.2f} s - ...")
print(f"Branches:        {model.solver.NumBranches()}")
print(f"Wall time:       {model.solver.WallTime()} s")
```

In a CloudWatch Logs / ECS environment, unstructured `print()` output is ingested as raw log lines. This creates an observability gap: performance anomalies (e.g., a solve taking 700 seconds vs the normal 30) cannot be alerted on via CloudWatch metric filters or Datadog monitors because there is no structured `duration_seconds` field or `schedule_id` correlation to query on.

From a DoS detection perspective, the inability to measure per-solve wall time in a queryable structured format means that solver-starvation attacks (CS-1, CS-2) would be invisible in the monitoring stack until the SQS DLQ depth metric fires — which is a lagging indicator.

**Remediation:**

Replace every `print()` call in the solver pipeline with `loguru` structured logging:

```python
# solve_schedule.py
from loguru import logger

logger.info(
    "Solver pipeline timing | schedule={} core_to_engine={:.2f}s engine={:.2f}s engine_to_core={:.2f}s",
    engine_inputs.schedule.id,
    total_time_core_to_engine,
    total_time_engine,
    total_time_engine_to_core,
)

# sqs_consumer.py
logger.info(
    "Solve campaign complete | message_id={} schedule={} duration={:.2f}s",
    message_id,
    message.schedule_id,
    total_time,
)

# model.py
logger.debug(
    "OR-Tools estimate | vars={} constraints={} obj_vars={} estimate={:.2f}s budget={}s",
    num_vars, num_constraints, num_obj_vars, estimate, budget,
)
logger.info(
    "OR-Tools solve complete | branches={} wall_time={:.2f}s objective={} status={}",
    self.solver.NumBranches(),
    self.solver.WallTime(),
    self.solver.ObjectiveValue(),
    self.solver.StatusName(self.status),
)
```

---

## Summary Table

| ID | Location | Severity | Category | Root Cause |
|---|---|---|---|---|
| CS-1 | `sqs_consumer.py` + `model_config.py` | HIGH | Unbounded algorithmic execution | `timeout_seconds` from SQS message is never passed to OR-Tools; static 120s × 8 phases = 960s max |
| CS-2 | `sqs_consumer.py` + `model_config.py` | HIGH | Concurrent resource poisoning | No cross-replica tenant quota; `num_search_workers = cpu_count` in dev saturates all cores |
| CS-3 | `docker-compose.yml` | HIGH | Container-level DoS / OOM | No `deploy.resources.limits`; unbounded CPU + memory on OR-Tools combinatorial solver |
| CS-4 | `sqs_consumer.py` + queue config | MEDIUM | SQS visibility race / duplicate solve | Sequential phase budget (960s) exceeds `VisibilityTimeout` (900s); no visibility extension |
| CS-5 | `model.py`, `solve_schedule.py`, `sqs_consumer.py` | LOW | Observability gap | `print()` used instead of `loguru`; no structured fields for alerting on DoS conditions |

---

## Recommended Remediation Priority

1. **CS-1** — Thread `timeout_seconds` from `SQSSolveMessage` through `solve_schedule()` into `ModelConfig.solver_params.max_time_in_seconds` and enforce a wall-clock deadline in `sequential_solve()`. This is the single highest-impact fix; it makes all other mitigations easier to enforce.
2. **CS-3** — Add `deploy.resources.limits` to all Compose files and cap `num_search_workers` via env var. One-line change per file; essential for production ECS safety.
3. **CS-4** — Add `asyncio.wait_for()` watchdog and periodic SQS visibility extension in `_process_message()`. Depends on CS-1 to know the correct timeout value.
4. **CS-2** — Implement SQS FIFO with `MessageGroupId = team_id` or a DB-backed cross-replica tenant lock. Architectural change; plan for a follow-up sprint.
5. **CS-5** — Replace `print()` with structured `loguru` calls throughout the solver pipeline. Low risk, high observability value; do in the same PR as any other solver change.
