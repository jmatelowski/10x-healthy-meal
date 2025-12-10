# API Endpoint Implementation Plan: DELETE /users/me

## 1. Endpoint Overview

Permanently delete the currently authenticated user **and** cascade-delete all user-owned data (recipes, generations, dietary preferences, etc.).

- **Audience**: authenticated end-users.
- **Success Response**: `204 No Content`.
- **Side-effects**: removes the record from `auth.users` via Supabase Admin API and relies on `ON DELETE CASCADE` foreign-keys to clean application tables.

## 2. Request Details

- **HTTP Method**: `DELETE`
- **URL**: `/users/me`
- **Headers**:
  - `Authorization: Bearer <access_token>` – mandatory Supabase JWT.
- **Query / Path Params**: none
- **Request Body**: _empty_

## 3. Used Types

Because the endpoint returns **204** and accepts no body, no new DTOs are needed. Service-layer signature:

```ts
// src/lib/services/userService.ts
export async function deleteUserAccount(options: {
  supabase: SupabaseClient;
  admin: SupabaseClient; // service-role client
  userId: string;
}): Promise<void>;
```

## 4. Response Details

| Status                    | When                                                    | Body                |
| ------------------------- | ------------------------------------------------------- | ------------------- |
| **204 No Content**        | Deletion succeeded                                      | –                   |
| 401 Unauthorized          | Missing/invalid JWT                                     | `{ error: string }` |
| 404 Not Found             | Authenticated user id is missing in `auth.users` (rare) | `{ error: string }` |
| 500 Internal Server Error | Unhandled DB / network error                            | `{ error: string }` |

## 5. Data Flow

1. **Auth Middleware** resolves the current session ⇒ `context.locals.user` ➜ `user.id`.
2. **Endpoint handler** calls `userService.deleteUserAccount()` inside a transaction.
3. `deleteUserAccount()` steps:
   1. Start DB `BEGIN`.
   2. Call **Supabase Admin API** `auth.admin.deleteUser(userId)` using **service-role** client (bypasses RLS).
   3. Rely on `ON DELETE CASCADE` for application tables referencing `auth.users.id` (e.g. `recipes`, `generations`, `user_diet_preferences`).
   4. `COMMIT`.
4. Return `204`.
5. **Error path**: rollback transaction, log error row in `generation_error_logs` **if** deletion of generations/recipes fails; otherwise log to a generic logger.

## 6. Security Considerations

- **Authentication**: JWT checked automatically by Supabase middleware.
- **Authorization**: user can delete **only their own** account (`/users/me` avoids exposing IDs).
- **RLS Bypass for Auth Deletion**: Deleting from `auth.users` requires service-role key; keep it in `import.meta.env.SUPABASE_SERVICE_ROLE_KEY` (server-only runtime).
- **CSRF**: browsers must send `Authorization` header; additionally configure SameSite cookies for session tokens.
- **Rate Limiting**: optional—limit destructive actions per IP/user.
- **Replay-attack**: JWT iat/exp validated by Supabase.

## 7. Error Handling

| Scenario                | Status | Action                                                                            |
| ----------------------- | ------ | --------------------------------------------------------------------------------- |
| No JWT / expired        | 401    | `return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })` |
| Admin API returns 404   | 404    | user already gone – return 404                                                    |
| DB error during cascade | 500    | rollback; log with `logger.error`, optionally insert into `generation_error_logs` |
| Env var missing         | 500    | startup time check & fail fast                                                    |

## 8. Performance Considerations

- **Cascade cost** grows with user data size; ensure FK columns are indexed.
- **Transaction** keeps lock scope minimal: perform admin deletion first, then commit.
- **Asynchronous purge** (future): move heavy deletes to a background job via `supabase.functions` if data volume becomes large.

## 9. Implementation Steps

1. **Create service-role client helper** in `src/db/supabase.service.ts`.
2. **Add `deleteUserAccount()`** in `src/lib/services/userService.ts` following the Data Flow.
3. **Create endpoint file** `src/pages/api/users/me/index.ts`:

   ```ts
   import { deleteUserAccount } from "@/lib/services/userService";
   export const prerender = false;

   export async function DELETE({ locals }: APIContext) {
     const { supabase, user } = locals;
     if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
     try {
       await deleteUserAccount({
         supabase,
         admin: locals.supabaseAdmin,
         userId: user.id,
       });
       return new Response(null, { status: 204 });
     } catch (err) {
       console.error("Delete user failed", err);
       return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
     }
   }
   ```

4. **Wire `supabaseAdmin`** into `src/middleware/auth.ts` so that each `locals` carries both regular (RLS-bound) and admin client.
5. **Unit Tests** (Vitest):
   - Successful deletion returns 204.
   - Unauthorized returns 401.
   - Admin API error propagated as 500.
6. **E2E Tests** (Playwright): sign-up user ➜ create recipe ➜ call DELETE /users/me ➜ ensure login fails & recipe 404.
7. **Docs**: update API reference & README.
8. **CI/CD**: add env var `SUPABASE_SERVICE_ROLE_KEY` to deployment secrets.
