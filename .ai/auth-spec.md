## Technical Specification: Registration, Login, and Password Recovery module (HealthyMeal)

This document describes the architecture and contracts for user account features: registration, login, logout, password recovery/change, and account deletion. The spec aligns with the PRD (`.ai/prd.md`) and the current stack (`.ai/tech-stack.md`): Astro 5, TypeScript 5, React 19, Tailwind 4, Supabase (Auth + Postgres), OpenRouter (unchanged). The existing project structure and behaviors are preserved.

Important compatibility assumptions:

- The `recipes` pages remain functional; for unauthenticated users they will either require login.
- APIs and services keep their existing paths. The new auth layer provides `locals.user` and removes the need for `DEFAULT_USER_ID` (with a development fallback until full integration).
- SSR remains active (astro.config `output: "server"` + node adapter). New API routes have `prerender = false`.

### 1. USER INTERFACE ARCHITECTURE

#### 1.1. Pages and layouts

- `src/layouts/Layout.astro` (extension):
  - Add a header with the `AuthMenu` component (React) that displays: auth status, links to `Log in`, `Sign up`, and the account menu (profile, log out, delete account).
  - The layout remains the base for both public and private pages.

- Authentication pages (new, Astro + React forms):
  - `src/pages/auth/login.astro`
    - Contains `LoginForm` (React, `client:load`), SSR checks `locals.user` and if logged in -> redirect to the target page (`redirect` in query) or `/`.
  - `src/pages/auth/register.astro`
    - Contains `RegisterForm` (React, `client:load`), SSR identical to above.
  - `src/pages/auth/reset-password.astro`
    - Contains `RequestPasswordResetForm` (React). On success, show the email-sent message (without confirming address existence).
  - `src/pages/auth/update-password.astro`
    - SSR: receive `code` from URL; server-side exchange for a session (`exchangeCodeForSession`), then render `UpdatePasswordForm` (React) to set a new password.

- Application pages (existing):
  - `src/pages/index.astro` – protected access:
    - If there is no user: show a welcome section (CTA to log in/sign up). We do not break the current UI – logged-in users see the same content.
  - `src/pages/recipes/*.astro` – protected access:
    - SSR: if `locals.user` is missing, redirect to `/auth/login?redirect=/recipes`.

#### 1.2. Components (React) and responsibilities

- `src/components/auth/AuthMenu.tsx` (new)
  - Responsibility: present auth status, actions: navigate to auth pages, log out (call `/api/auth/logout`).

- `src/components/forms/LoginForm.tsx` (new)
  - Responsibility: login form, client-side validation (Zod), submit to `/api/auth/login` (POST JSON). On success: redirect to `/`.

- `src/components/forms/RegisterForm.tsx` (new)
  - Responsibility: registration form, client-side validation, submit to `/api/auth/register`. On success: either auto-login (if configured).

- `src/components/forms/RequestPasswordResetForm.tsx` (new)
  - Responsibility: request password reset link, submit to `/api/auth/password/request`.

- `src/components/forms/UpdatePasswordForm.tsx` (new)
  - Responsibility: set a new password after exchanging `code` for a session (SSR), submit to `/api/auth/password/update`.

- Reuse existing UI components:
  - `InlineErrors.tsx`, `LoadingSpinner.tsx`, `ui/button.tsx`.

UI responsibility split:

- Astro Pages (SSR): routing, route protection, retrieving the user state from `locals`, redirects, rendering containers and static sections.
- React Forms/Islands: interactivity, client-side validation, API calls, error handling, and navigation after success.

#### 1.3. Validation (client) and error messages

Zod in `src/lib/validation/auth.schema.ts` (new):

- `zEmail`: valid email, max 254 characters.
- `zPassword`: min 8 characters, max 72, at least 1 letter and 1 digit (MVP).
- `zLoginCommand = { email, password }`.
- `zRegisterCommand = { email, password }` (optional client-side confirm password).
- `zResetRequestCommand = { email }`.
- `zPasswordUpdateCommand = { password }`.

UI messages (PL originals translated):

- “Invalid email address.”
- “Password must be at least 8 characters and contain a digit.”
- On server errors: “A server error occurred. Please try again.”
- On invalid login data: “Invalid email or password.”
- Reset: always a success message (“If the address exists, we have sent instructions…”) – anti-enumeration.

#### 1.4. Key scenarios (UI)

- Registration:
  1. The user fills out the form, submit -> `/api/auth/register`.
  2. Success: auto-login and redirect
  3. Validation errors -> inline; email conflict -> “Account already exists.”

- Login:
  1. Submit -> `/api/auth/login`.
  2. Success: redirect to `/`.
  3. Invalid data -> “Invalid email or password.”

- Password reset (request):
  1. Submit -> `/api/auth/password/request`.
  2. Always return 200 + success message.

- Setting a new password:
  1. Enter via the email link to `/auth/update-password?code=...`.
  2. SSR: `exchangeCodeForSession` -> set session in cookies.
  3. Submit the form -> `/api/auth/password/update` -> success -> redirect to `/` + notice.

- Logout:
  1. Click in `AuthMenu` -> POST `/api/auth/logout` -> redirect to `/`.

- Account deletion:
  1. CTA in the account menu -> confirmation modal -> POST `/api/account/delete` -> success -> redirect to `/auth/login`.

### 2. BACKEND LOGIC

#### 2.1. Supabase clients and middleware

- The current middleware `src/middleware/index.ts` injects `locals.supabase = supabaseClient` regardless of the request. To support HTTP-only sessions and SSR, introduce a per-request server client:
  - Add helper `src/db/supabase.server.ts` (new):
    - Export `getSupabaseServerClient(AstroCtx)` using `@supabase/ssr` `createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies: { get, set, remove }})`, mapped to `Astro.cookies`.
    - Provides the same type as the existing `SupabaseClient` (type compatibility).
  - Middleware:
    - Creates `locals.supabase = getSupabaseServerClient(context)`.
    - Fetches the user server-side: `const { data: { user } } = await locals.supabase.auth.getUser();` and saves `locals.user = user || null`.
    - Do not change other places that use `locals.supabase` (compatibility).

Development fallback:

- Until all places using `DEFAULT_USER_ID` are migrated, keep a temporary fallback in API routes (if `locals.user` is missing, use `DEFAULT_USER_ID`). Disable in production.

#### 2.2. API endpoints (new)

Structure: `src/pages/api/auth/*` (all have `export const prerender = false`). Input validation with Zod; JSON responses share a common error shape.

- `POST /api/auth/register`
  - Body: `{ email: string, password: string }` (`zRegisterCommand`).
  - Action: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: <HOST>/auth/update-password } })`.
  - Responses:
    - 200: `{ status: "ok", message: "Check your email" }` or `{ status: "ok", user }` if auto-login.
    - 409: `{ error: "email_in_use" }`.
    - 400: validation errors.

- `POST /api/auth/login`
  - Body: `{ email, password }` (`zLoginCommand`).
  - Action: `supabase.auth.signInWithPassword({ email, password })`; cookies are set automatically by the server client.
  - Responses:
    - 200: `{ status: "ok" }`.
    - 401: `{ error: "invalid_credentials" }`.

- `POST /api/auth/logout`
  - Body: empty.
  - Action: `supabase.auth.signOut()`; clears cookies.
  - Response: 200 `{ status: "ok" }`.

- `POST /api/auth/password/request`
  - Body: `{ email }` (`zResetRequestCommand`).
  - Action: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <HOST>/auth/update-password })`.
  - Response: always 200 `{ status: "ok" }` (anti-enumeration), errors are only logged server-side.

- `POST /api/auth/password/update`
  - Requires a logged-in session (after `exchangeCodeForSession` executed in SSR on `/auth/update-password`).
  - Body: `{ password }` (`zPasswordUpdateCommand`).
  - Action: `supabase.auth.updateUser({ password })`.
  - Responses: 200 `{ status: "ok" }`, 401 when no session.

- `DELETE /api/account`
  - Requires an authenticated user; optionally requires providing the current password for confirmation (re-auth on the frontend or a separate `reauth` endpoint).
  - Action: using the service key (`SUPABASE_SERVICE_ROLE_KEY`) create an admin client: `supabaseAdmin.auth.admin.deleteUser(userId)`.
  - Deleting application data:
    - Prefer FK `ON DELETE CASCADE` in dependent tables (`recipes`, `user_diet_preferences`). If missing, the endpoint deletes dependent data transactionally before deleting the account.
  - Response: 200 `{ status: "ok" }` -> redirect to `/auth/login`.

Common error shape:

```json
{ "error": string, "details"?: unknown }
```

#### 2.3. Input validation (server)

- New file `src/lib/validation/auth.schema.ts` (Zod) – shared with the frontend:
  - Export the schemas above and inferred DTO types.
- All endpoints parse `request.json()` -> `safeParse`. Errors -> 400 with the issues list.

#### 2.4. Exception handling

- Supabase errors mapped to codes:
  - `AuthApiError` 400/401 -> `invalid_credentials`/`email_in_use`, etc.
  - Others -> 500 `server_error` with minimal `details` (no sensitive information).
- Server-side logging (console/error or a future logger) with request context (route, userId when available).

#### 2.5. SSR and rendering

- According to `astro.config.mjs`, SSR is enabled; required changes:
  - Protected pages (`/recipes/*`) perform a check in `get` (Astro frontmatter) for `locals.user`; if missing -> 302 redirect to `/auth/login?redirect=<url>`.
  - Auth pages (`/auth/*`) when `locals.user` exists -> redirect to the target page or `/`.
  - All API endpoints: `export const prerender = false` (already applied).

### 3. AUTHENTICATION SYSTEM (Supabase Auth + Astro)

#### 3.1. Flows

- Registration: `auth.signUp(email, password)`; `emailRedirectTo` points to `/auth/update-password` (email confirmation can be skipped for MVP to allow an immediate session).
- Login: `auth.signInWithPassword` (server), session stored in HTTP-only cookies; lifetime at least 24h (idle and refresh handled by Supabase refresh tokens).
- Logout: `auth.signOut` (server) clears cookies.
- Password reset: `auth.resetPasswordForEmail` -> email -> enter `/auth/update-password?code=...` -> SSR `auth.exchangeCodeForSession` -> `auth.updateUser({ password })`.
- Account deletion: server endpoint with admin client (`SERVICE_ROLE`) + cascading deletion of domain data.

#### 3.2. Astro integration

- Server client from `@supabase/ssr` integrated with `Astro.cookies` in the `getSupabaseServerClient` helper.
- Middleware sets `locals.supabase` and `locals.user` available in pages and API routes.
- On the frontend (React) – for simple reads use `/api/auth/me` (optional) or SSR props passed from Astro to the component.

#### 3.3. Security

- Cookies: `Secure`, `HttpOnly`, `SameSite=Lax` (default in the SSR library; verify in deployment).
- Do not reveal whether an email exists (password reset).
- Rate limiting (MVP): simple IP protection (e.g., LRU+TTL in-process) on `/api/auth/login`/`/register`/`/password/request`. Later move to reverse proxy/WAF.
- CSRF: mutating operations via POST only; cookies are HttpOnly; optionally use `X-CSRF-Token` header for SPA forms (optional in MVP).

### 4. API CONTRACTS (DTO)

All requests `Content-Type: application/json`, responses `application/json`.

- `POST /api/auth/register`
  - Request: `{ email: string, password: string }`
  - 200: `{ status: "ok", message?: string }`
  - 400: `{ error: "validation_error", details: ZodIssue[] }`
  - 409: `{ error: "email_in_use" }`

- `POST /api/auth/login`
  - Request: `{ email: string, password: string }`
  - 200: `{ status: "ok" }`
  - 400: `{ error: "validation_error", details: ZodIssue[] }`
  - 401: `{ error: "invalid_credentials" }`

- `POST /api/auth/logout`
  - 200: `{ status: "ok" }`

- `POST /api/auth/password/request`
  - Request: `{ email: string }`
  - 200: `{ status: "ok" }`

- `POST /api/auth/password/update`
  - Request: `{ password: string }`
  - 200: `{ status: "ok" }`
  - 401: `{ error: "unauthorized" }`

- `DELETE /api/account`
  - 200: `{ status: "ok" }`
  - 401: `{ error: "unauthorized" }`

### 5. APPLICATION CHANGES AND COMPATIBILITY

#### 5.1. New files/directories

- `src/pages/auth/login.astro`
- `src/pages/auth/register.astro`
- `src/pages/auth/reset-password.astro`
- `src/pages/auth/update-password.astro`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/password/request.ts`
- `src/pages/api/auth/password/update.ts`
- `src/pages/api/account/delete.ts`
- `src/components/auth/AuthMenu.tsx`
- `src/components/forms/LoginForm.tsx`
- `src/components/forms/RegisterForm.tsx`
- `src/components/forms/RequestPasswordResetForm.tsx`
- `src/components/forms/UpdatePasswordForm.tsx`
- `src/lib/validation/auth.schema.ts`
- `src/db/supabase.server.ts` (SSR helper)

#### 5.2. Modifications to existing areas

- `src/middleware/index.ts`: use per-request SSR client + set `locals.user`.
- `src/pages/index.astro`: hybrid mode (based on `locals.user`).
- `src/pages/recipes/*`: redirect to login if `locals.user` is missing.
- `src/pages/api/recipes.ts`: read `userId` from `locals.user?.id`, fallback to `DEFAULT_USER_ID` in DEV only.

#### 5.3. Environment variables

- `SUPABASE_URL`, `SUPABASE_KEY` (already used).
- `SUPABASE_SERVICE_ROLE_KEY` (server only, for account deletion; never expose to the client!).
- `PUBLIC_SITE_URL` or equivalent for building redirects (e.g., password reset).

#### 5.4. Dependencies (spec)

- `@supabase/ssr` – SSR client (or `@supabase/auth-helpers-astro` as an alternative). Choice: `@supabase/ssr` due to simple integration with Astro.cookies.
- `zod` – validation.

### 6. Edge cases and design decisions

- “Session at least 24h” – rely on Supabase refresh tokens and SSR cookies; the user remains logged in until they log out or the session expires/is revoked.
- Password reset: link validity per Supabase settings; after exchanging the `code`, we set the session and allow password change without additional login.
- Account deletion: requires SERVICE ROLE KEY – available locally/DEV; stored as a secret in production.
- Anti-enumeration: `/password/request` always 200.
- We do not expand MVP scope: no social logins, no MFA, no CAPTCHA (possible in the future).

### 7. Acceptance criteria (PRD reference)

- US‑001 Registration: unique email/password; after success the user is logged in or gets an email notice (configurable).
- US‑002 Login: valid credentials -> logged in + redirect; invalid -> error message; session ≥24h (SSR cookies + refresh).
- US‑011 Account deletion: requires confirmation; after the operation redirect to login; old data unavailable; (admin API + cascading data).
- US‑012 Logout: ends the session, redirect to login; refresh does not restore the session.

### 8. Zero-downtime rollout plan (high compatibility)

1. Add the SSR client and middleware with `locals.user`, without changing existing pages (fallback to `DEFAULT_USER_ID` still works).
2. Add auth pages and endpoints; UI in Layout (`AuthMenu`).
3. Set up route protection for `/recipes/*` (redirect to login); `index.astro` – hybrid mode to keep the experience unchanged for logged-in users.
4. Update `/api/recipes` to use `locals.user?.id` (with a fallback in DEV).
5. After tests, remove `DEFAULT_USER_ID` and the fallback.
