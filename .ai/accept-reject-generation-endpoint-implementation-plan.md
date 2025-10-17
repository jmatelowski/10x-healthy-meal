## API Endpoint Implementation Plan: POST /generations/{id}/accept and POST /generations/{id}/reject

### 1. Endpoint Overview

Implements user actions on AI recipe generations:

- Accept: Atomically saves the AI proposal as a `recipes` row (source = 'ai') and updates the corresponding `generations` row to `status = 'accepted'` with `accepted_recipe_id` set.
- Reject: Marks a generation as `status = 'rejected'`.

Both endpoints must enforce ownership, validate inputs, and return appropriate status codes.

### 2. Request Details

- **HTTP Methods**: POST
- **Base URL**: `/api/generations/{id}/accept`, `/api/generations/{id}/reject`

- **Path Parameters**:
  - **Required**: `id` (UUID of the generation)

- **Request Body**:
  - Accept:
    - Required JSON body with the recipe to persist (mirror recipe constraints):
      - `title` string, trimmed, 1..50
      - `content` string, trimmed, 1..10_000
  - Reject:
    - No body

- **Headers**:
  - `Content-Type: application/json` (Accept only)
  - Auth headers as required by Supabase (session cookie/JWT via `locals.supabase`)

### 3. Used Types

- `AcceptGenerationResponseDto` (from `src/types.ts`):
  - `{ recipe_id: string; message: string; }`
- `GenerationStatus` enum (DB enum via `src/types.ts`): includes `'accepted' | 'rejected'`.
- Validation schemas:
  - Reuse `zCreateRecipeSchema` for Accept body (title/content constraints), or define `zAcceptGeneration` delegating to it.

### 4. Response Details

- Accept:
  - 200 OK, body: `AcceptGenerationResponseDto` – `{ recipe_id, message: "AI recipe saved" }`
  - Error statuses: 400, 401, 404, 409, 500
- Reject:
  - 204 No Content
  - Error statuses: 400, 401, 404, 409, 500

### 5. Data Flow

1. Client calls Accept with generation `id` and AI proposal (`title`, `content`).
2. API route validates path and body using Zod; authenticates via `locals.supabase`.
3. Service performs an atomic operation in the database:
   - Insert into `recipes` with `user_id`, `title`, `content`, `source = 'ai'`.
   - Update `generations` for the same `user_id` and `id` where `status IS NULL` to set:
     - `status = 'accepted'` and `accepted_recipe_id = <new_recipe_id>`.
   - If any step fails, the entire operation rolls back.
   - Implementation approach: a Postgres RPC function called via `supabase.rpc('accept_generation', ...)` to guarantee atomicity under a single transaction.
4. On success, service returns `recipe_id`, API returns 200 with `AcceptGenerationResponseDto`.
5. For Reject, the service marks the row `status = 'rejected'` only if owned by the user and currently `status IS NULL` (pending). Returns 204.

### 6. Security Considerations

- **Authentication**: Require an authenticated user context via `locals.supabase`. Return 401 if not authenticated.
- **Authorization**: All DB operations must scope by `user_id = auth.uid()` (or `DEFAULT_USER_ID` during development). The RPC functions should enforce ownership checks server-side.
- **Input Validation**:
  - Path `id` must be a UUID (validate via Zod or regex).
  - Accept body must pass `zCreateRecipeSchema` (trim + length constraints aligned with DB checks).
- **State Validation**:
  - Accept/Reject only allowed when `status IS NULL` (pending). If already `accepted` or `rejected`, return 409.
- **RLS**: Although RLS is disabled for development, design RPC with `SECURITY DEFINER` and explicit `WITH CHECK (user_id = auth.uid())` logic so it remains secure when RLS is enabled in production.
- **Leak minimization**: Return 404 for non-owned or non-existing generations to avoid user enumeration.

### 7. Error Handling

- 400 Bad Request: Invalid UUID path parameter; invalid body (title/content constraints). Include Zod issues in response.
- 401 Unauthorized: No valid session / user in `locals`.
- 404 Not Found: Generation not found for user, or does not exist.
- 409 Conflict: Generation already accepted or rejected.
- 500 Internal Server Error: Unexpected DB or RPC failures.

Logging:

- Log server-side errors to console for observability.
- Do not write to `generation_error_logs` (that table is for AI generation failures, not accept/reject actions).

### 8. Performance Considerations

- Use a single RPC to perform Accept atomically and minimize round-trips.
- Keep Reject as a single update or an RPC that enforces the `pending` precondition.
- Ensure indexes:
  - `generations(id)` is primary key; scope by `user_id, id` in WHERE clause for efficient lookups.
  - `recipes(id)` is primary key; insert is O(1) on index updates.
- Avoid fetching entire generation rows; only filter by `id` and `user_id`.

### 9. Implementation Steps

1. Database: Create RPC for Accept
   - New migration `supabase/migrations/20251016XX_create_accept_reject_functions.sql`:
     - Define function `accept_generation(p_user_id uuid, p_generation_id uuid, p_title varchar(50), p_content text) RETURNS uuid` as `SECURITY DEFINER` that:
       - Validates the generation exists for `p_user_id` and `status IS NULL`.
       - Inserts into `recipes(user_id, title, content, source)` VALUES (`p_user_id`, `p_title`, `p_content`, 'ai') RETURNING `id`.
       - Updates `generations` SET `status = 'accepted'`, `accepted_recipe_id = <recipe_id>` WHERE `id = p_generation_id` AND `user_id = p_user_id` AND `status IS NULL`.
       - Raises an exception with a custom SQLSTATE or error code for not found (404) and conflict (409) cases.
       - Returns the `recipe_id`.
     - Optionally define `reject_generation(p_user_id uuid, p_generation_id uuid) RETURNS void` enforcing `status IS NULL` and updating to `rejected`, raising 404/409 as appropriate.

2. Validation Schemas
   - In `src/lib/validation/generation.schema.ts` add:
     - `zGenerationIdParam = z.string().uuid("Invalid generation id")`.
     - `zAcceptGeneration = zCreateRecipeSchema` (or a wrapper object with `title`, `content`).

3. Service Layer
   - In `src/lib/services/generation.service.ts` add methods:
     - `acceptGeneration(generationId: string, payload: { title: string; content: string; }): Promise<{ recipe_id: string }>`:
       - Calls `this.supabase.rpc('accept_generation', { p_user_id, p_generation_id, p_title, p_content })`.
       - Maps RPC errors to 404/409/500.
     - `rejectGeneration(generationId: string): Promise<void>`:
       - Either call `rpc('reject_generation', ...)` or perform an `update` with `eq('id', ...)`, `eq('user_id', ...)`, `is('status', null)` and check `count` or `.single()` to determine 404/409.

4. API Routes (Astro)
   - Create `src/pages/api/generations/[id]/accept.ts`:
     - `export const prerender = false;`
     - Parse `params.id`, validate with `zGenerationIdParam`.
     - Parse body, validate with `zAcceptGeneration`.
     - Ensure auth via `locals.supabase` (401 if missing).
     - Call service `acceptGeneration` with `id` and body; on success return 200 with `{ recipe_id, message: "AI recipe saved" }`.
     - Handle Zod 400, 404/409 mapping from service, and 500 fallback.
   - Create `src/pages/api/generations/[id]/reject.ts`:
     - `export const prerender = false;`
     - Validate `params.id`; ensure auth.
     - Call service `rejectGeneration`; on success return 204.
     - Map errors to 404/409/500.

5. Types
   - Reuse `AcceptGenerationResponseDto` from `src/types.ts`. No changes required.

6. Tests (if applicable)
   - Unit: service methods map errors correctly.
   - Integration: migrations + RPC paths happy/edge cases (pending, already accepted/rejected, foreign user).

7. Documentation
   - Ensure README or API docs list the new endpoints, request/response examples, and status codes.

### 10. Status Code Matrix (Summary)

- Accept:
  - 200: `{ recipe_id, message }`
  - 400: Invalid `id` or body
  - 401: Unauthenticated
  - 404: Not found / not owned
  - 409: Already handled (accepted/rejected)
  - 500: Server error
- Reject:
  - 204: No Content
  - 400/401/404/409/500 as above
