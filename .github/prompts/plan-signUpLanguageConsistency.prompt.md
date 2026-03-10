## Plan: Sign-Up Language Consistency

**TL;DR** — Four things are broken today: (1) no `ui_locales` passed to Cognito so the login UI is always in the browser's default language; (2) `redirect_uri` is hardcoded to `/fr/callback/` so all users land on the French callback regardless of their locale; (3) `create_user` hardcodes `language = "fr"` for every new user; (4) the new user lambda/onboard endpoint has no `language` field. The fix threads locale from the landing page CTA click all the way through to the user's DB record.

---

### Phase 1 — Cognito Infrastructure (one-time Terraform change)

**Step 1** — `infra/modules/cognito/main.tf`: add the two missing callback URLs to `callback_urls` so all three locales are registered with AWS:
  - `https://${var.frontend_domain_name}/en/callback/`
  - `https://${var.frontend_domain_name}/es/callback/`
  - (keep the existing `/fr/callback/` and `/silent-renew/`)

---

### Phase 2 — Frontend: Locale-Aware Cognito Redirect

**Step 2** — `frontend/src/config/env.ts`: change `redirectUri` from the hardcoded `https://app.rockilus.com/fr/callback/` to a base value without the locale segment (e.g. `clientUrl` itself). The per-locale URI will be constructed dynamically at sign-in time.

**Step 3** — `frontend/src/config/cognito.ts`: change the static `redirect_uri` in `cognitoAuthConfig` from `/fr/callback/` to `/en/callback/` (neutral English fallback). This URL is only used as a default; the per-call override (Step 4) takes precedence in practice.

**Step 4** — `frontend/src/contexts/auth-context.tsx`: modify `ProductionAuthProvider.signIn()`:
  - Extract locale from `window.location.pathname` with regex against `/(en|fr|es)/`
  - Fallback to `navigator.language.split('-')[0]` (browser language) if no locale found in path; final fallback `'en'`
  - **Store the detected locale** in `localStorage` under key `rockilus_signup_locale` — used later in the callback to set new user language
  - Pass to `signinRedirect()`: `extraQueryParams: { ui_locales: locale }` and `redirect_uri: ${clientUrl}/${locale}/callback/`
  - Update the manual fallback URL (the `window.location.href` branch) the same way — append `&ui_locales=${locale}` and use the locale-prefixed `redirect_uri`

*Both `StaticAuthGuard` and `ProtectedRoute` already call `signIn()` without changes — this fix propagates automatically.*

---

### Phase 3 — Frontend: Set Language for New Users After Callback

**Step 5** — `frontend/src/app/[lng]/callback/page.tsx`: after `isAuthenticated` becomes true, before calling `router.replace`:
  - Read `rockilus_signup_locale` from `localStorage`; if absent, skip (returning user signed in from a direct URL, no language action needed)
  - Use `auth.user.access_token` to call `GET /users/me`
  - If `sign_up_at` is within the last **5 minutes** (new user indicator) AND `user.language !== storedLocale`, call `PUT /users/{user_id}` with `{ language: storedLocale }`
  - **Always clear** `rockilus_signup_locale` from `localStorage` afterwards (avoids stale state for returning users)
  - Then proceed with `router.replace(/${safeLng}/plan/schedule/)`

---

### Phase 4 — Backend: Accept Language on New User Creation

**Step 6** — `backend/api_gateway/src/routes/user_routes.py`: add `language: Optional[str] = None` to `NewUserInput` and forward it to `user_service.create_user()`

**Step 7** — `backend/api_gateway/src/services/user_service.py`: accept optional `language: str | None` in `create_user`; if provided and valid in `Language` enum, use it; otherwise fall back to `"en"` (change from hardcoded `"fr"`). Note: the Lambda currently sends no language, so new users will get `"en"` until Step 5 updates it within seconds of sign-up completion — this is acceptable.

---

**Relevant files**

- `infra/modules/cognito/main.tf` — `callback_urls` list
- `frontend/src/config/env.ts` — `redirectUri` base
- `frontend/src/config/cognito.ts` — static `redirect_uri` fallback
- `frontend/src/contexts/auth-context.tsx` — `ProductionAuthProvider.signIn()` (locale extraction, `extraQueryParams`, `redirect_uri` override, localStorage write)
- `frontend/src/app/[lng]/callback/page.tsx` — post-auth language update for new users
- `backend/api_gateway/src/routes/user_routes.py` — `NewUserInput.language`
- `backend/api_gateway/src/services/user_service.py` — `create_user` language param + default

---

**Verification**

1. Run `terraform plan` on the cognito module — confirm 3 callback_urls + silent-renew appear
2. Visit `rockilus.com/fr/` → click CTA → inspect the Cognito authorization URL in the browser — confirm `ui_locales=fr` and `redirect_uri=.../fr/callback/` are present
3. Complete a new sign-up from `/fr/` → confirm redirected to `/fr/plan/schedule/` (not `/fr/callback/`)
4. In MongoDB, confirm new user has `language: "fr"`
5. Sign in with same user from `/en/` → confirm `language` stays `"fr"` in DB (not overwritten)
6. Sign in from `/es/` → Cognito login page shows in Spanish
7. Run `pytest` in `backend/api_gateway/` — confirm `create_user` tests pass with `"en"` as new default

---

**Decisions recorded**
- New user language: set from sign-up locale as default; user can override later in settings
- Returning user: language profile **never** updated from sign-in locale
- Cognito UI: app locale, with `navigator.language` as fallback when URL has no locale segment

---

**Further Considerations**

1. **Lambda language** — The post-confirmation Lambda fires before the client callback, so new users briefly have `language = "en"` until the callback page updates it (Step 5). This gap is a few seconds and invisible to the user. In the future, if you want the Lambda to set the right language, you could encode locale as a Cognito custom attribute (`custom:language`) during hosted UI sign-up — but that requires Cognito hosted UI customization and is out of scope here.

2. **Staging Terraform** — The Terraform `callback_urls` uses `var.frontend_domain_name`. Ensure Step 1 is applied to both staging and production `tfvars` files if they share the same module.
