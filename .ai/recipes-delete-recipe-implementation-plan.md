# API Endpoint Implementation Plan: Delete Recipe (`DELETE /recipes/{id}`)

## 1. Endpoint Overview

Permanently delete a single recipe owned by the authenticated user.

- Removes the record from `recipes` table.
- Cascades are already configured for dependant tables (e.g. `ON DELETE CASCADE` on foreign-key relations), so no extra cleanup is necessary.

## 2. Request Details

- **HTTP Method:** DELETE
- **URL Structure:** `/api/recipes/{id}`
- **Parameters:**
  - **Path (required)** `id` – UUID v4 of the recipe to delete
- **Request Body:** _none_
- **Headers:**
  - `Authorization: Bearer <access_token>` – Supabase session JWT (handled by Astro middleware)

## 3. Used Types

| Purpose               | Type                                                             | Source                    |
| --------------------- | ---------------------------------------------------------------- | ------------------------- |
| Path param validation | `DeleteRecipeParamsSchema = z.object({ id: z.string().uuid() })` | new local zod schema      |
| Service param         | `DeleteRecipeParams { id: string; userId: string }`              | new                       |
| Response DTO          | `{ message: "Recipe deleted" }`                                  | new constant type         |
| Error payloads        | `ErrorResponseDto { error: string }`                             | (already used across API) |

## 4. Response Details

| Status                    | When                                                 | Body                               |
| ------------------------- | ---------------------------------------------------- | ---------------------------------- |
| 200 OK                    | Recipe successfully removed                          | `{ "message": "Recipe deleted" }`  |
| 400 Bad Request           | `id` is not a valid UUID                             | `{ "error": "Invalid recipe id" }` |
| 401 Unauthorized          | No valid session                                     | `{ "error": "Unauthorized" }`      |
| 404 Not Found             | Recipe does not exist **or** does not belong to user | `{ "error": "Recipe not found" }`  |
| 500 Internal Server Error | Unexpected DB error                                  | `{ "error": "Server error" }`      |

## 5. Data Flow

1. **Astro API Route** (`src/pages/api/recipes/[id].ts`) receives DELETE request.
2. Zod validates `id` param.
3. Auth middleware populates `ctx.locals.session`; extract `user.id`.
4. Call `RecipeService.deleteRecipe({ id, userId })`.
5. Service executes single SQL using Supabase:
   ```ts
   await supabase.from("recipes").delete().match({ id, user_id: userId });
   ```
6. If `count === 0`, return 404.
7. Return 200 JSON success.
8. Errors are caught, logged, and converted to 500.

## 6. Security Considerations

1. **Authentication** – Require valid Supabase session; return 401 otherwise.
2. **Authorization (IDOR)** – `user_id` match in DELETE condition prevents deleting others’ data.
3. **Injection** – Supabase query builder parameterises inputs; additionally `id` is validated as UUID.
4. **CSRF** – Endpoint expects Bearer token; standard SPA pattern, but if deployed with cookies ensure SameSite=Lax.
5. **Rate Limiting** – (Future) apply if abuse observed.

## 7. Error Handling

| Scenario        | Action                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Invalid UUID    | Return 400 immediately.                                                         |
| No session      | Return 401.                                                                     |
| No matching row | Return 404.                                                                     |
| Supabase error  | Log with `console.error` (later integrate with centralized logger), return 500. |

## 8. Performance Considerations

- Primary key index on `id` makes delete O(1).
- No JOINs or large payloads.
- Use Postgres `ON DELETE CASCADE` where appropriate (already in place for `user_id`).

## 9. Implementation Steps

1. **Create Zod schema** `DeleteRecipeParamsSchema` in `src/lib/validators/recipes.ts`.
2. **Add service** in `src/lib/services/recipes.ts`:
   ```ts
   export async function deleteRecipe({ id, userId }: DeleteRecipeParams, supabase: SupabaseClient) {
     const { error, count } = await supabase.from("recipes").delete({ count: "exact" }).match({ id, user_id: userId });
     if (error) throw error;
     if (count === 0) throw new NotFoundError("Recipe not found");
   }
   ```
3. **Create/extend custom errors** (`NotFoundError`, `ValidationError`, etc.) in `src/lib/errors.ts` for consistent handling.
4. **Implement API route** `src/pages/api/recipes/[id].ts`:
   - `export const prerender = false;`
   - `export async function DELETE(ctx: APIContext) { ... }`
   - Validate param → auth → call service → return JSON.
5. **Unit tests** (Vitest):
   - Success path.
   - 404 when not owned.
   - 400 invalid UUID.
   - 401 unauthenticated.
6. **E2E tests** (Playwright):
   - User deletes own recipe and UI list updates.
7. **Docs** – Update API documentation in `/docs/api.md`.
8. **CI** – Add tests to pipeline.
9. **Code review** – ensure security list above covered.
