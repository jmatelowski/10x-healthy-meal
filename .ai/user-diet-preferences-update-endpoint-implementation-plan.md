# API Endpoint Implementation Plan: PUT `/users/me/preferences`

## 1. Endpoint Overview

Replaces the currently authenticated user’s complete set of dietary preferences with the array provided in the request body.

- **Idempotent** – the final state equals the provided list.
- **Auth-protected** – only the logged-in user may update their own preferences.

## 2. Request Details

| Aspect      | Value                                                |
| ----------- | ---------------------------------------------------- |
| HTTP Method | **PUT**                                              |
| URL         | `/users/me/preferences`                              |
| Headers     | `Authorization: Bearer <JWT>` (verified by Supabase) |
| Body (JSON) |

````jsonc
{
  "preferences": ["vegan", "nut_allergy"]
}
```|

### Parameters
* **Required** – `preferences`
  * Array length ≤ 6
  * Each value must be a member of `diet_pref_enum`
* **Optional** – none

## 3. Used Types
```ts
// src/types/diet-pref.ts
export const dietPrefEnum = z.enum([
  "vegan",
  "vegetarian",
  "nut_allergy",
  "gluten_free",
  "lactose_free",
  "keto",
  // ...extend as DB enum grows
]);
export type DietPref = z.infer<typeof dietPrefEnum>;

// DTO – request payload
export interface UpdateDietPrefsDto {
  preferences: DietPref[];
}
````

## 4. Response Details

| Status               | When                                                          | Body                                   |
| -------------------- | ------------------------------------------------------------- | -------------------------------------- |
| **204 No Content**   | Preferences successfully replaced                             | —                                      |
| **400 Bad Request**  | • Invalid JSON / schema<br>• >6 prefs<br>• Unknown enum value | `{ "error": "invalid_request" }`       |
| **401 Unauthorized** | Missing / invalid JWT                                         | `{ "error": "unauthorized" }`          |
| **404 Not Found**    | User record missing (rare)                                    | `{ "error": "user_not_found" }`        |
| **500 Internal**     | DB failure / unhandled error                                  | `{ "error": "internal_server_error" }` |

## 5. Data Flow

```text
Client ──PUT /users/me/preferences────────► Astro API Route
            ▲                                   │
            │                                   ▼
      204 / error                        Service Layer
                                              │
                               Supabase (transaction)
                       ├─ DELETE FROM user_diet_preferences WHERE user_id = ?
                       └─ INSERT INTO user_diet_preferences (user_id, diet_pref) VALUES (...)
```

1. **Astro Endpoint** (`src/pages/api/users/me/preferences.ts`)
   1. Extract `supabase` from `locals` and obtain authenticated `user.id`.
   2. Parse + validate body with Zod.
   3. Call service `replaceUserDietPrefs(...)`.
   4. Return 204.

2. **Service Layer** (`src/lib/services/diet-pref.service.ts`)
   - `replaceUserDietPrefs(supabase, userId, prefs: DietPref[]): Promise<void>`
   - Runs **transaction**: delete existing rows; bulk insert new rows.
   - Throws typed errors mapped to HTTP codes.

## 6. Security Considerations

1. **Authentication** – Supabase JWT; endpoint rejects if not authenticated.
2. **Authorization** – user id taken solely from JWT; no path/param user ids.
3. **Row-level Security** – keep Supabase RLS enabled to restrict `user_diet_preferences` to owner.
4. **Input Validation** – Zod enum + length guard prevent SQL injection via literals.
5. **Rate Limiting / Abuse** – middleware could throttle repeated preference writes.
6. **Transport** – enforce HTTPS.

## 7. Error Handling

| Scenario                       | Action                | Logging                           |
| ------------------------------ | --------------------- | --------------------------------- |
| Bad JSON, schema fail          | 400                   | no DB log                         |
| Not authenticated              | 401                   | no log                            |
| User not found                 | 404                   | warn                              |
| Supabase error (delete/insert) | 500                   | log full error via central logger |
| Transaction partial failure    | Roll back; return 500 | log                               |

## 8. Performance Considerations

- Max 6 inserts → negligible latency.
- Single transaction avoids race conditions.
- Bulk insert instead of per-row loop.
- Index on `(user_id, diet_pref)` (PK/unique) already implied → fast deletes.
- No caching required (per-user data).

## 9. Implementation Steps

1. **Types & Validation**
   - Add `dietPrefEnum` + `UpdateDietPrefsDto` (if missing).
   - Create Zod schema `updateDietPrefsSchema`.

2. **Service** `diet-pref.service.ts`

   ```ts
   export async function replaceUserDietPrefs(sb: SupabaseClient, userId: string, prefs: DietPref[]): Promise<void> {
     const { error: txErr } = await sb.rpc("perform_replace_user_prefs", { _user_id: userId, _prefs: prefs }); // optional SQL function
     // Fallback JS-side:
     // await sb.from("user_diet_preferences").delete().eq("user_id", userId);
     // if (prefs.length) await sb.from("user_diet_preferences").insert(prefs.map(p => ({ user_id: userId, diet_pref: p })));
     if (txErr) throw txErr;
   }
   ```

3. **API Route** `src/pages/api/users/me/preferences.ts`
   - `export const prerender = false;`
   - Implement `PUT` handler:
     1. Auth check via `locals.supabase.auth.getUser()`.
     2. Parse body → `updateDietPrefsSchema`.
     3. Call service; catch errors, map to responses.

4. **Logging**
   - Use existing `@/lib/logger` (or create) for 500s.

5. **Documentation**
   - Update API reference & README.
