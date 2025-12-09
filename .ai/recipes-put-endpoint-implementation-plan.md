# API Endpoint Implementation Plan: PUT /recipes/{id}

## 1. Endpoint Overview

Updates an existing recipe belonging to the authenticated user. Accepts partial changes (`title`, `content`) and returns the updated recipe on success. Only the owner of the recipe may update it; `source` and ownership fields are immutable.

## 2. Request Details

- **HTTP Method:** PUT
- **URL Pattern:** `/recipes/{id}`
- **Path Parameters:**
  - `id` (UUID, required) — Identifier of the recipe to update.
- **Request Body (JSON):**
  ```json
  {
    "title": "string 1‒50 chars", // optional
    "content": "string 1‒10 000 chars" // optional
  }
  ```
  At least one property must be present. Extra properties are rejected.
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT>` (handled by Supabase Auth)

## 3. Used Types

- **Command Model**: `UpdateRecipeCommand` (already in `src/types.ts`)
- **DTOs**:
  - `RecipeDto` — Full recipe representation returned in the response.

## 4. Response Details

| Status                    | Scenario                                                            | Body                                        |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 200 OK                    | Successful update                                                   | `RecipeDto`                                 |
| 400 Bad Request           | Validation failed (malformed UUID, empty body, string length, etc.) | `{ message: string; errors?: FieldErrors }` |
| 401 Unauthorized          | Request not authenticated                                           | `{ message: string }`                       |
| 403 Forbidden             | Authenticated but not the owner of the recipe                       | `{ message: string }`                       |
| 404 Not Found             | Recipe with `id` does not exist                                     | `{ message: string }`                       |
| 500 Internal Server Error | Unhandled server error                                              | `{ message: string; requestId?: string }`   |

## 5. Data Flow

1. **Astro API Route** (`src/pages/api/recipes/[id].ts`)
   1. Extract `id` from `Astro.params` and validate UUID.
   2. Parse & validate JSON body with Zod → `UpdateRecipeCommand`.
   3. Retrieve `supabase` client and `session` from `Astro.locals`.
   4. Ensure user is authenticated; obtain `user.id`.
   5. Call `RecipeService.updateRecipe({ userId, recipeId: id, command })`.
2. **Service Layer** (`src/lib/services/recipe.service.ts`)
   1. Fetch recipe by `id` and `user_id` in a single query.
   2. If not found → `NotFoundError`.
   3. Update allowed columns (`title`, `content`, `updated_at = now()`).
   4. Return updated row mapped to `RecipeDto`.
3. **Database**
   - Single `UPDATE ... WHERE id = :id AND user_id = :userId` statement with the Supabase TypeScript client.
   - Row-Level Security in Supabase additionally enforces ownership.
4. **API Route**
   - Serialises `RecipeDto` to JSON and returns `200`.

## 6. Security Considerations

- **Authentication**: Require valid Supabase session; otherwise 401.
- **Authorisation**: Verify `user_id === recipe.user_id`; otherwise 403. RLS policy also covers this.
- **Input Validation**: Zod schema limits string lengths and strips unknown keys to avoid mass assignment.
- **Denial of Service**: Enforce 10 000-char limit already in DB & Zod to avoid oversized payloads.
- **SQL Injection**: Supabase client uses parameterised queries.
- **Logging**: Log unexpected errors with request ID for traceability (optional Sentry integration).

## 7. Error Handling

- Use custom error classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `InternalServerError`).
- Map errors to HTTP status codes in a central `errorResponse` helper.
- For 5xx errors, store details in `generation_error_logs` only if the failure is related to AI generation (not applicable here). Otherwise log to application logger.

## 8. Performance Considerations

- Query is indexed by primary key; O(1) lookup.
- Only modified fields are sent in `UPDATE` statement to minimise row churn.
- Function executes in < 10 ms under normal load.

## 9. Implementation Steps

1. **Define Zod Schema** (`src/lib/schemas/recipe.ts`)
   ```ts
   export const updateRecipeSchema = z
     .object({
       title: z.string().min(1).max(50).optional(),
       content: z.string().min(1).max(10_000).optional(),
     })
     .refine((data) => data.title || data.content, {
       message: "At least one of 'title' or 'content' must be provided",
     });
   export type UpdateRecipePayload = z.infer<typeof updateRecipeSchema>;
   ```
2. **Create Service** (`src/lib/services/recipe.service.ts`)
   ```ts
   export async function updateRecipe(params: { userId: string; recipeId: string; command: UpdateRecipePayload }) {
     /* ... */
   }
   ```
3. **Update API Route** (`src/pages/api/recipes/[id].ts`)
   - Add `PUT` handler:
     ```ts
     if (Astro.request.method === "PUT") return handlePut(Astro);
     ```
   - Implement `handlePut` to:
     1. Validate path `id` (UUID regexp).
     2. Parse & validate body via `updateRecipeSchema`.
     3. Check auth (Astro.locals.session?.user).
     4. Call `updateRecipe` service.
     5. Return `json(recipe, 200)`.
4. **Error Helper** (`src/lib/utils/error-response.ts`) if not existing—maps custom errors to responses.
5. **Tests**
   - **Unit**: Service function updates only intended fields.
   - **Integration**: API PUT returns 200 and updates DB row; 404 when not found; 403 when not owner.
   - **E2E**: Playwright test to edit a recipe via UI & verify update.
6. **Docs**: Update OpenAPI spec / README.
7. **Deploy**.
