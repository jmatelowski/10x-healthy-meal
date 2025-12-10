# API Endpoint Implementation Plan: GET `/users/me`

## 1. Endpoint Overview

Return the authenticated user’s profile, including their dietary preferences.
Accessible only to logged-in users; responds with a single `UserProfileDto`.

## 2. Request Details

| Aspect       | Description                                         |
| ------------ | --------------------------------------------------- |
| HTTP Method  | **GET**                                             |
| URL          | `/users/me`                                         |
| URL Params   | none                                                |
| Query Params | none                                                |
| Headers      | `Authorization: Bearer <JWT>` (handled by Supabase) |
| Body         | —                                                   |

## 3. Used Types

- `DietPref` – enum of allowed dietary values
- `UserProfileDto` – response payload

```ts
interface UserProfileDto {
  id: string;
  email: string;
  preferences: DietPref[];
  created_at: string; // ISO-8601
}
```

## 4. Response Details

| Status                    | When                                  | Body                                   |
| ------------------------- | ------------------------------------- | -------------------------------------- |
| 200 OK                    | Authenticated user exists             | `UserProfileDto`                       |
| 401 Unauthorized          | No / invalid JWT                      | `{ "error": "unauthorized" }`          |
| 404 Not Found             | Auth token valid but user row missing | `{ "error": "user_not_found" }`        |
| 500 Internal Server Error | Unhandled failure                     | `{ "error": "internal_server_error" }` |

## 5. Data Flow

1. **Astro Server Endpoint** (`src/pages/api/users/me.ts`):  
   a. Extract `supabase` from `Astro.locals`.  
   b. Call `supabase.auth.getUser()` to obtain `user.id`.
2. **Service Layer** (`src/lib/services/user.service.ts`):  
   `getUserProfile(userId: string): Promise<UserProfileDto>`
   - Query `profiles` table (or equivalent) for user row.
   - Join / select `dietary_preferences` (array enum column).
   - Map DB row to `UserProfileDto`.
3. Return DTO as JSON.

## 6. Security Considerations

- **Authentication**: Supabase JWT validated by `supabase.auth`.
- **Authorization**: Only authenticated user can access their own profile; user id comes from JWT, no path param manipulation.
- **Least Data**: Expose only `id`, `email`, `preferences`, `created_at`.
- **Rate Limiting** (future): apply middleware if abuse possible.
- **No PII leakage**: never return `encrypted_password`, `confirmed_at`, etc.
- **HTTPS enforced** in deployment (Cloudflare Pages).

## 7. Error Handling

| Scenario                 | Handling              | Logged?                          |
| ------------------------ | --------------------- | -------------------------------- |
| Missing / invalid JWT    | Return 401; no DB hit | no                               |
| DB row not found         | Return 404            | optional warn log                |
| Supabase query throws    | Return 500            | log full error via `@lib/logger` |
| JSON serialization fails | 500                   | log                              |

## 8. Performance Considerations

- Single indexed primary-key lookup ⇒ negligible latency.
- Select specific columns to minimise payload (`select('id,email,preferences,created_at')`).
- Supabase edge caching not applicable (per-user).
- Future: wrap in terms of service-wide caching layer only if “hot” path.

## 9. Implementation Steps

1. **Create Service**
   - `src/lib/services/user.service.ts`

   ```ts
   import type { SupabaseClient } from "@/db/supabase.client";
   import type { UserProfileDto } from "@/types";

   export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfileDto | null> {
     const { data, error } = await supabase
       .from("profiles")
       .select("id,email,preferences,created_at")
       .eq("id", userId)
       .single();

     if (error) throw error;
     return data as UserProfileDto; // DB types match DTO
   }
   ```

2. **Add API Route**
   - `src/pages/api/users/me.ts`

   ```ts
   import { getUserProfile } from "@/lib/services/user.service";
   import type { APIRoute } from "astro";

   export const prerender = false;
   export const GET: APIRoute = async ({ locals, request }) => {
     const {
       data: { user },
       error: authError,
     } = await locals.supabase.auth.getUser();

     if (authError || !user) {
       return new Response(JSON.stringify({ error: "unauthorized" }), {
         status: 401,
       });
     }

     try {
       const profile = await getUserProfile(locals.supabase, user.id);
       if (!profile) {
         return new Response(JSON.stringify({ error: "user_not_found" }), {
           status: 404,
         });
       }
       return new Response(JSON.stringify(profile), {
         status: 200,
         headers: { "Content-Type": "application/json" },
       });
     } catch (err) {
       // TODO: integrate with central logger
       console.error("GET /users/me failed", err);
       return new Response(JSON.stringify({ error: "internal_server_error" }), {
         status: 500,
       });
     }
   };
   ```

3. **Docs & Changelog**
   - Update API reference in project docs.
