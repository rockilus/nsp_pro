# Plan: Rockilus Frontend Security Audit & Remediation

**Scope:** `frontend/src/config/cognito.ts`, `frontend/src/config/env.ts`, `frontend/src/app/lib/api-client.ts`, `frontend/src/app/lib/impersonation-storage.ts`, `infra/modules/s3-static-frontend/cloudfront.tf`
**Date:** 2026-06-15

---

## Confirmed Findings

### Section 1 — Client-Side Session Risk

| Severity | Finding | File |
|---|---|---|
| HIGH | Cognito tokens (id_token, access_token, refresh_token) stored in `localStorage` via `WebStorageStateStore` — stolen by any XSS | `frontend/src/config/cognito.ts` ~L31 |
| MEDIUM | Admin impersonation JWT stored in `sessionStorage` under `admin_impersonation_target` — same XSS exposure as localStorage, elevated privilege | `frontend/src/app/lib/impersonation-storage.ts` ~L12 |

### Section 2 — Build-Time Environment Leakage

| Severity | Finding | File |
|---|---|---|
| HIGH | Dev bypass credentials (`dev-service-key-12345`, `dev-user-123`) hardcoded as fallbacks, baked into production bundle — enables auth bypass if backend accepts dev headers | `frontend/src/config/env.ts` ~L45–46 |
| MEDIUM | Production Cognito User Pool ID (`eu-west-3_9tyN1YsF6`) and Client ID (`2rccpq0s894f6a66d1hmimship`) hardcoded in source and bundle — enables account enumeration via direct Cognito API calls | `frontend/src/config/env.ts` ~L48–53 |
| LOW | Unconditional `console.log('Environment Configuration:', ...)` at module load — runs in production, leaks env state to browser console | `frontend/src/config/env.ts` ~L25 |

### Section 3 — CDN Hardening

| Severity | Finding | File |
|---|---|---|
| CRITICAL | Zero HTTP security headers on CloudFront — no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy | `infra/modules/s3-static-frontend/cloudfront.tf` |
| LOW | Default cache behavior advertises DELETE/PATCH/POST/PUT methods on a read-only S3 origin | `infra/modules/s3-static-frontend/cloudfront.tf` ~L88 |

---

## Implementation Steps

### Phase 1 — CDN Security Headers *(step 1 is blocking for XSS risk from Phase 2)*

1. Add `aws_cloudfront_response_headers_policy` resource in `infra/modules/s3-static-frontend/cloudfront.tf` with:
   - `Content-Security-Policy`: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self' https://*.amazonaws.com https://cognito-idp.eu-west-3.amazonaws.com https://auth.rockilus.com https://api.rockilus.com`, `frame-src 'none'`, `object-src 'none'`, `upgrade-insecure-requests`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
   - Attach `response_headers_policy_id` to all three `cache_behavior` blocks (`/_next/static/*`, `/static/*`, default)

2. Restrict `default_cache_behavior.allowed_methods` to `["GET", "HEAD", "OPTIONS"]` — remove DELETE/PATCH/POST/PUT from the static-asset distribution

### Phase 2 — Environment Leakage Fixes *(steps are parallel)*

3. In `frontend/src/config/env.ts`:
   - Replace `process.env.NEXT_PUBLIC_NODE_ENV === 'development'` with `process.env.NODE_ENV === 'development'` — use Next.js's built-in tree-shakeable identifier, not a custom NEXT_PUBLIC var
   - Remove hardcoded fallbacks from `devUserId` and `devApiKey` — replace with empty string `''`
   - Add a build-time assertion block at module top level:
     ```typescript
     if (process.env.NODE_ENV === 'production') {
       if (process.env.NEXT_PUBLIC_DEV_API_KEY) throw new Error('[SECURITY] NEXT_PUBLIC_DEV_API_KEY must not be set in production builds.');
       if (process.env.NEXT_PUBLIC_DEV_USER_ID) throw new Error('[SECURITY] NEXT_PUBLIC_DEV_USER_ID must not be set in production builds.');
     }
     ```
   - Remove hardcoded fallbacks from `cognitoAuthority` and `cognitoClientId` — replace with throw if absent:
     ```typescript
     cognitoAuthority: (() => { const v = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY; if (!v) throw new Error('[CONFIG] NEXT_PUBLIC_COGNITO_AUTHORITY is required'); return v; })(),
     cognitoClientId: (() => { const v = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID; if (!v) throw new Error('[CONFIG] NEXT_PUBLIC_COGNITO_CLIENT_ID is required'); return v; })(),
     ```
   - Remove the unconditional `console.log` at module load (line 25); keep only the guarded dev-only block

4. Enable Cognito App Client **"Prevent user existence errors"** option in AWS Console / Terraform to normalize `InitiateAuth` error responses

### Phase 3 — Session Storage Hardening *(steps are parallel)*

5. In `frontend/src/config/cognito.ts`, replace `WebStorageStateStore({ store: window.localStorage })` with `WebStorageStateStore({ store: new InMemoryWebStorage() })` — eliminates token persistence across page loads; `oidc-client-ts` handles silent renewal via the `silent_redirect_uri` page already configured
   - Verify `automaticSilentRenew: true` and `silent_redirect_uri` are working correctly after the change — silent renewal is the mechanism that replaces persistence
   - Adjust UX if needed: inform users they will be signed out on hard refresh (acceptable given the security trade-off)

6. In `frontend/src/app/lib/impersonation-storage.ts`, move the privileged JWT out of `sessionStorage` into a module-level closure:
   - Remove `token` field from `StoredImpersonationTarget` interface — display metadata (name, email, language) stays in `sessionStorage`
   - Add `let _impersonationToken: string | null = null` module-level variable
   - Export `setImpersonationToken(token: string): void` and update `getImpersonationToken()` to return `_impersonationToken`
   - Update `clearImpersonationTarget()` to also set `_impersonationToken = null`
   - Update all callers of `setImpersonationTarget` (in `useAdminImpersonation.ts`) to call `setImpersonationToken` separately

---

## Verification Checklist

- [ ] `cd frontend && just all` — lint/typecheck/vitest pass with no regressions
- [ ] `cd infra && terraform plan` — no unexpected resource destruction; `aws_cloudfront_response_headers_policy` created, attached to distribution
- [ ] `curl -I https://app.staging.rockilus.com` — all 6 security headers present in response
- [ ] Production bundle search: `grep -r 'dev-service-key' frontend/.next/` → no matches
- [ ] Production bundle search: `grep -r 'eu-west-3_9tyN1YsF6' frontend/.next/` → no matches (injected at build time from CI env)
- [ ] Cognito silent renew works correctly with `InMemoryWebStorage` — verify `silent-renew` page functions after change
- [ ] Admin impersonation flow works end-to-end with JWT in memory only — no regression in impersonation banner or API calls
- [ ] `window.localStorage` inspection after login → no `oidc.user:*` key present
- [ ] CSP deployed in report-only mode first (`Content-Security-Policy-Report-Only`) — monitor violations for 1–2 weeks before switching to enforcing

---

## Decisions

- **`localStorage` → in-memory JWTs**: Users lose session on hard refresh. Compensated by `automaticSilentRenew: true` and the `/silent-renew` page already configured. Accepted trade-off given the privileged nature of healthcare scheduling data.
- **`style-src 'unsafe-inline'`**: Required for Tailwind and shadcn/ui inline styles. Replacing with nonces requires server-side rendering — not available in this static export. Accepted with CSP otherwise strict.
- **Cognito IDs in bundle**: User Pool ID and Client ID are inherently public (required by the browser OIDC flow). The risk is enumeration, not secret exposure. Mitigation is Cognito-side (`PreventUserExistenceErrors`), not frontend-side.
- **CSP report-only first**: Enforcing CSP immediately without a violation observation period risks breaking the app in edge cases. Report-only → review → enforce is the mandatory deployment sequence.
- **Terraform `allowed_methods` change (step 2)**: Low-risk; S3 already rejects mutations via OAC policy. Change tightens the advertised surface only.
