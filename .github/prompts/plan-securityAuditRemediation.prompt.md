# Plan: Rockilus Security Audit & Remediation

Research is complete across all four OWASP vectors. 17 confirmed vulnerabilities with exact file locations. Organized into 4 parallel-executable phases.

---

## Confirmed Findings

### Vector 1 — BOLA / IDOR

| Severity | Finding | File |
|---|---|---|
| HIGH | `GET /assignments/teams/{team_id}` — no `authz.check()`, relies only on a BOLA guard helper | `backend/api_gateway/src/routes/assignment_routes.py` ~L96 |
| HIGH | `PUT /users/{user_id}` — no `authz.check()`, only implicit `effective_user_id == user_id` | `backend/api_gateway/src/routes/user_routes.py` ~L90 |
| HIGH | `PUT /workers/{worker_id}/teams/{team_id}` — never cross-checks `worker.team_id == team_id` | `backend/api_gateway/src/routes/worker_routes.py` ~L97 |
| HIGH | `submit_solve_request()` never validates `schedule.team_id == team_id` — fully route-dependent | `backend/api_gateway/src/services/sqs_solve_service.py` ~L62 |
| MEDIUM | All `/notifications/*` — filtering only at service layer, no route-level `authz.check()` | `backend/api_gateway/src/routes/notification_routes.py` |
| LOW | Cerbos PDP dev-mode bypass is silent (no log) | `backend/api_gateway/src/integrations/authorization/cerbos_authz_service.py` ~L60 |

### Vector 2 — Injection (NoSQL + Log)

| Severity | Finding | File |
|---|---|---|
| HIGH | 6 raw `$regex` injections — `search_name`, `search_owner_id`, etc. passed directly to MongoDB without `re.escape()` → ReDoS + data extraction | `backend/api_gateway/src/services/team_service.py` ~L65–97 |
| MEDIUM | 9 unconstrained `Dict[str, Any]` fields — `event_data`, `meta`, `members`, `bids`, etc. accept MongoDB operators like `{"$ne": null}` | `backend/shared/src/shared/schemas/dto/import_record.py`, `notification.py`, `breach.py`, `email.py`, `swap.py` |
| MEDIUM | Log injection — loguru calls interpolate raw user strings without ANSI/newline sanitization | `backend/api_gateway/src/services/notification_service.py`, `routes/sqs_solve_routes.py` |

### Vector 3 — Frontend Static Risks

| Severity | Finding | File |
|---|---|---|
| CRITICAL | Zero HTTP security headers on CloudFront — no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options | `infra/modules/s3-static-frontend/cloudfront.tf` |
| HIGH | JWTs in `localStorage` via `oidc-client-ts` — stolen by any XSS | `frontend/src/config/cognito.ts` ~L31–34 |
| MEDIUM | Cognito User Pool ID baked into static bundle → account enumeration | `frontend/src/config/env.ts` |
| MEDIUM | `NEXT_PUBLIC_DEV_API_KEY` in env.ts — verify it's never a real credential | `frontend/src/config/env.ts` |

### Vector 4 — Async DoS via SQS

| Severity | Finding | File |
|---|---|---|
| HIGH | Zero rate limiting on `POST /sqs-solve/start` — no slowapi, no AWS API GW `throttle_settings` | `backend/api_gateway/src/app.py`, `infra/modules/api_gateway/main.tf` |
| HIGH | No per-user concurrent solve quota — only blocks duplicate on same `schedule_id` | `backend/api_gateway/src/services/sqs_solve_service.py` |
| HIGH | `timeout_seconds` field exists in SQS payload but is **never passed to OR-Tools** — solver runs unbounded | `backend/solve_service/src/sqs_consumer.py` ~L140 |
| MEDIUM | No CPU/memory limits on `solve-service` container | `docker-compose.yml` |

---

## Implementation Steps

### Phase 1 — BOLA/IDOR Fixes *(steps are parallel)*

1. Add `authz.check(user_id, "read-assignments", "team", team_id)` to assignment GET route; add action to `cerbos-policies/resource_policies/team.yaml`
2. Add `authz.check(user_id, "update", "user", user_id)` to user PUT route
3. In worker PUT, fetch worker from DB and assert `worker.team_id == team_id` → raise HTTP 403 on mismatch
4. In `submit_solve_request()`, after schedule fetch: `if schedule.team_id != team_id: raise NotAuthorizedError`
5. Add `authz.check(user_id, "read-notifications", "user", user_id)` to all 3 notification endpoints; add action to `cerbos-policies/resource_policies/user.yaml`
6. Replace silent PDP bypass with `logger.warning("Cerbos PDP unreachable — bypassing AuthZ for resource_kind={} action={}", resource_kind, action)`

### Phase 2 — Injection Fixes *(steps are parallel)*

7. Wrap all 6 `$regex` values in `team_service.py` with `re.escape()` + add `Query(max_length=100)` to route params
8. Add `@field_validator` to all 9 `Dict[str, Any]` fields — reject keys starting with `$`; apply recursively for nested dicts
9. Add `sanitize_for_log(s: str) -> str` utility in `backend/shared/src/` stripping `\n`, `\r`, ANSI sequences; apply to all log call sites

### Phase 3 — Frontend Security *(steps 10–11 are parallel; step 12 is advisory only)*

10. Add `aws_cloudfront_response_headers_policy` in `infra/modules/s3-static-frontend/cloudfront.tf` with:
    - `Content-Security-Policy` — allow self + Cognito authority URL, no inline scripts
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
    - Attach to all `cache_behavior` blocks on the distribution
11. Audit `frontend/src/config/env.ts` — add a build-time assertion that `NEXT_PUBLIC_DEV_API_KEY` and `NEXT_PUBLIC_DEV_USER_ID` are empty/placeholder when `NODE_ENV === 'production'`
12. *(Advisory — no code change)* Document localStorage JWT as accepted risk compensated by zero XSS sinks + new CSP from step 10

### Phase 4 — SQS DoS Protection *(steps are parallel)*

13. Add `slowapi` dependency; attach `SlowAPIMiddleware` in `backend/api_gateway/src/app.py`; decorate `POST /sqs-solve/start` with `@limiter.limit("5/minute")` keyed on `user_id`
14. In `submit_solve_request()`, query `SolveTaskStatus` for `user_id` with `status IN ["pending", "processing"]`; raise HTTP 429 if count ≥ `MAX_CONCURRENT_SOLVES_PER_USER = 3`
15. Extract `timeout_seconds` from SQS message; pass `solver.parameters.max_time_in_seconds = timeout_seconds` to the OR-Tools `CpSolver` in `backend/solve_service/src/sqs_consumer.py`
16. Add `deploy.resources.limits: { cpus: "2", memory: "4G" }` to `solve-service` in `docker-compose.yml`, `docker-compose.dev.local.yml`, and `docker-compose.tests.local.yml`
17. Add `throttle_settings { burst_limit = 100, rate_limit = 50 }` to `aws_api_gateway_stage.main` in `infra/modules/api_gateway/main.tf`

---

## Verification Checklist

- [ ] `cd backend && just all api_service` — all pytest pass
- [ ] `cd backend && just all shared` — Pydantic validator tests pass
- [ ] Team search with `search_name=.*` must not enumerate all teams (regex escaping confirmed)
- [ ] Cross-team `GET /assignments/teams/{team_id}` returns 403
- [ ] Cross-user `PUT /users/{user_id}` returns 403
- [ ] `cd frontend && just all` — lint/typecheck clean
- [ ] `curl -I https://app.staging.rockilus.com` — all 6 security headers present
- [ ] 10 rapid `POST /sqs-solve/start` → HTTP 429 after 5th request
- [ ] Large schedule with `timeout_seconds=10` → solver exits at ≤ 10 seconds
- [ ] `cd backend && just all solve_service no tests` after solver timeout changes

---

## Decisions

- **localStorage JWTs**: Accepted risk. Compensated by zero XSS sinks (confirmed) + CSP (step 10). HttpOnly cookies require a backend session layer — out of scope.
- **Regex escaping strategy**: `re.escape()` + `Query(max_length=100)` — belt-and-suspenders.
- **SQS dedup token**: Out of scope for now — existing per-`schedule_id` concurrent check is sufficient.
- **Cerbos action naming**: Follow existing kebab-case pattern (`read-assignments`, `read-notifications`).
- **Terraform API Gateway usage plans** (step 17): Mark as advisory if per-user API key assignment is not in current architecture.
