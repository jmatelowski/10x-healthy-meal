# API Endpoint Implementation Plan: POST /recipes

## 1. Endpoint Overview

Create a new recipe provided manually by the authenticated user. The recipe is stored in the `recipes` table with `source = "manual"`. Returns basic details of the newly-created recipe so the client can immediately display it.

## 2. Request Details

- HTTP Method: **POST**
- URL: `/recipes`
- Headers:
  - `Authorization: Bearer <supabase-jwt>` (required)
  - `Content-Type: application/json`
- Request Body (JSON):
  ```jsonc
  {
    "title": "Quinoa Salad", // string, ≤ 50 chars, non-empty
    "content": "...", // string, ≤ 10 000 chars, non-empty
  }
  ```
- Parameters:
  - Required: `title`, `content`
  - Optional: —

## 3. Used Types

- `CreateRecipeCommand` (already in `src/types.ts`)
- **NEW** `RecipeCreationResponseDto` (add to `src/types.ts`):
  ```ts
  export interface RecipeCreationResponseDto {
    id: string;
    status: "accepted"; // always accepted for manual
    recipe: {
      title: string;
      content: string;
    };
  }
  ```
- DB helper type: `RecipeRow` (existing)

## 4. Response Details

| Status                    | When                                      | Body                        |
| ------------------------- | ----------------------------------------- | --------------------------- |
| **201 Created**           | Recipe successfully stored                | `RecipeCreationResponseDto` |
| 400 Bad Request           | Payload validation fails                  | `{ error: string }`         |
| 401 Unauthorized          | Missing / invalid JWT                     | —                           |
| 404 Not Found             | Auth user exists but (edge) deleted in DB | `{ error: string }`         |
| 500 Internal Server Error | Unhandled DB error                        | `{ error: string }`         |

## 5. Data Flow

1. **Astro API route** (`src/pages/api/recipes.ts`)
   1. Assert `request.method === "POST"`; otherwise return 405.
   2. Obtain `supabase` client via `Astro.locals` (per backend rule).
   3. Authenticate user via `supabase.auth.getUser()`; on failure → 401.
   4. Parse JSON, validate with Zod (`createRecipeSchema`).
   5. Call `recipesService.createManualRecipe` with `(supabase, user.id, payload)`.
   6. On success → 201 JSON response.
2. **Service layer** (`src/lib/services/recipes.service.ts`)
   1. Insert row into `recipes` with provided values & `source = 'manual'`.
   2. Return inserted row id and fields.
3. **Database**
   - RLS policy ensures `user_id = auth.uid()`; service uses client JWT so enforced automatically.

## 6. Security Considerations

- **Authentication**: Supabase JWT mandatory.
- **Authorization / RLS**: insertion allowed only for current user.
- **Input Validation**: Zod length & non-empty checks prevent SQL injection & oversized payloads.
- **Rate Limiting**: Handled globally by existing middleware (100 req/min).
- **CORS**: existing config; ensure response headers inherited.

## 7. Error Handling

| Scenario                     | Status | Notes                                 |
| ---------------------------- | ------ | ------------------------------------- |
| Title missing/empty          | 400    | Zod error aggregated & returned       |
| Title > 50 chars             | 400    | "title must be ≤ 50 characters"       |
| Content missing/empty        | 400    | —                                     |
| Content > 10 000 chars       | 400    | "content must be > 10 000 characters" |
| Unauthenticated              | 401    | —                                     |
| DB throws (e.g., connection) | 500    | Log stack & return generic message    |

Errors are **not** logged to `generation_error_logs` because this is unrelated. Consider adding Sentry logging in middleware.

## 8. Performance Considerations

- Single-row insert; low latency.
- `recipes.user_id` already indexed; no extra indices needed.
- Validate body size (≤ 50 KB middleware) before parsing JSON.
- Early returns on validation/auth to avoid unnecessary DB calls.

## 9. Implementation Steps

1. **Types**
   - Append `RecipeCreationResponseDto` to `src/types.ts`.
2. **Validation**
   - Create `src/lib/validation/recipe.schema.ts` with Zod:
     ```ts
     import { z } from "zod";
     export const createRecipeSchema = z.object({
       title: z.string().min(1).max(50),
       content: z.string().min(1).max(10_000),
     });
     export type CreateRecipeDTO = z.infer<typeof createRecipeSchema>;
     ```
3. **Service**
   - Add `src/lib/services/recipes.service.ts`:
     ```ts
     import type { SupabaseClient } from "@supabase/supabase-js";
     export async function createManualRecipe(
       db: SupabaseClient,
       userId: string,
       { title, content }: { title: string; content: string }
     ) {
       const { data, error } = await db
         .from("recipes")
         .insert({ user_id: userId, title, content, source: "manual" })
         .select("id, title, content")
         .single();
       if (error) throw error;
       return data;
     }
     ```
4. **API Route**
   - Create `src/pages/api/recipes.ts`:

     ```ts
     import type { APIRoute } from "astro";
     import { createRecipeSchema } from "@/lib/validation/recipe.schema";
     import { createManualRecipe } from "@/lib/services/recipes.service";
     import type { RecipeCreationResponseDto } from "@/types";

     export const prerender = false;

     export const POST: APIRoute = async (ctx) => {
       const { supabase } = ctx.locals;
       const { data: authData, error: authErr } = await supabase.auth.getUser();
       if (authErr || !authData?.user) {
         return new Response(null, { status: 401 });
       }

       let payload;
       try {
         payload = createRecipeSchema.parse(await ctx.request.json());
       } catch (e) {
         return new Response(JSON.stringify({ error: e.errors?.[0]?.message ?? "Invalid payload" }), { status: 400 });
       }

       try {
         const recipe = await createManualRecipe(supabase, authData.user.id, payload);
         const body: RecipeCreationResponseDto = {
           id: recipe.id,
           status: "accepted",
           recipe: { title: recipe.title, content: recipe.content },
         };
         return new Response(JSON.stringify(body), {
           status: 201,
           headers: { "Content-Type": "application/json" },
         });
       } catch (err) {
         console.error(err);
         return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
       }
     };
     ```

5. **Tests**
   - Add unit tests for validation and service logic (if test framework configured).
6. **Docs**
   - Update README and OpenAPI specification (if any) with new endpoint.
