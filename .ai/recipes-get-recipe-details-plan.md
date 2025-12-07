# API Endpoint Implementation Plan: GET /recipes/{id}

## 1. Endpoint Overview

Returns a single recipe that belongs to the authenticated user. The response contains full recipe data suitable for a detail view or editing.

## 2. Request Details

- HTTP Method: GET
- URL Pattern: `/api/recipes/{id}`
- Path Parameters
  - `id` (string, UUID) – **required**
- Request Body: _none_

## 3. Used Types

- `RecipeDto` (from `src/types.ts`)
- `DietPref`, `RecipeSource` (transitively inside `RecipeDto`)
- New internal Zod schema:
  ```ts
  export const zRecipePathParams = z.object({
    id: z.string().uuid(),
  });
  export type RecipePathParams = z.infer<typeof zRecipePathParams>;
  ```

## 4. Response Details

| Status | Meaning                         | Response Body         |
| ------ | ------------------------------- | --------------------- |
| 200    | Success                         | `RecipeDto`           |
| 400    | Invalid UUID path param         | `{ error, details }`  |
| 401    | Missing or invalid user session | `{ error }`           |
| 404    | Recipe not found / not owner    | `{ error }`           |
| 500    | Unhandled server / DB error     | `{ error, details? }` |

Example 200:

```jsonc
{
  "id": "uuid",
  "title": "Quinoa Salad",
  "content": "...",
  "source": "manual",
  "created_at": "2025-10-13T12:00:00Z",
  "updated_at": "2025-10-13T12:00:00Z",
}
```

## 5. Data Flow

1. API request reaches Astro route file `src/pages/api/recipes/[id].ts`.
2. Astro middleware has already attached `locals.supabase` and `locals.user` (authenticated user).
3. Extract `id` from `params` and validate via `zRecipePathParams`.
4. Instantiate `RecipesService` with `locals.supabase`.
5. Call `recipesService.getRecipe(userId, id)` which:
   - Builds query:
     ```ts
     supabase
       .from("recipes")
       .select("id,title,content,source,created_at,updated_at")
       .eq("id", recipeId)
       .eq("user_id", userId) // IDOR prevention
       .single();
     ```
   - Maps row→`RecipeDto`.
6. If not found, return 404.
7. Return 200 JSON on success.
8. Catch any Supabase errors → 500.

## 6. Security Considerations

- **Authentication:** Require valid session (`locals.user`); otherwise 401.
- **Authorization:** Query filters by `user_id` and relies on Postgres RLS.
- **Input Validation:** Zod UUID check defends against malformed input.
- **Rate Limiting (future):** Consider global/user-level rate limits to thwart scraping or brute-force ID probing.
- **Logging:** Log 5xx with stack trace; never leak DB errors to client.

## 7. Error Handling

| Case                          | Status | Message             |
| ----------------------------- | ------ | ------------------- |
| Invalid UUID                  | 400    | "Invalid recipe id" |
| Not authenticated             | 401    | "Unauthorized"      |
| Recipe not found or not owner | 404    | "Recipe not found"  |
| Supabase/network failure      | 500    | "Server error"      |

## 8. Performance Considerations

- Query fetches a single row with `single()` — negligible cost.
- Ensure select list omits large text if not necessary (here `content` is needed).
- Add `.abortSignal` if using fetch aborts in future.
- Supabase latency dominates; no additional optimization required.

## 9. Implementation Steps

1. **File Structure**
   - Create `src/pages/api/recipes/[id].ts` following Astro endpoint conventions.
2. **Validation Schema**
   - Add `zRecipePathParams` in `src/lib/validation/recipe.schema.ts` (or new file).
3. **Service Layer**
   - Extend `RecipesService` with `getRecipe`.
   - Unit-test service with Vitest using MSW to mock Supabase.
4. **API Route Handler**
   - `export const GET: APIRoute = async ({ params, locals }) => { … }`
   - Steps: auth check → validate id → call service → map result → return JSON.
5. **Error Handling**
   - Return 400/401/404/500 per table above; include `Content-Type: application/json`.
6. **Integration Tests**
   - Playwright test: unauthenticated(401), invalid id(400), foreign id(404), happy path(200).
7. **Docs & Types**
   - Update `src/types.ts` exports if new types added.
   - Document endpoint in API reference markdown.
