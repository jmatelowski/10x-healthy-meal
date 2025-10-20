# API Endpoint Implementation Plan: GET /recipes

## 1. Endpoint Overview

Returns a paginated, sortable list of the authenticated user’s recipes. Supports client-driven pagination and sorting with safe defaults. Response includes lightweight recipe list items and pagination metadata.

## 2. Request Details

- HTTP Method: GET
- URL Structure: /api/recipes
- Parameters:
  - Required: none
  - Optional:
    - `page` (integer, default 1, 1-based)
    - `page_size` (integer, default 20, max 100)
    - `sort` (string, default `updated_at desc`, format: `<field> <direction>`)
- Request Body: none

## 3. Used Types

- DTOs
  - `RecipeListItemDto` (from `src/types.ts`): `{ id, title, source, created_at, updated_at }`
  - `RecipeListResponseDto` (from `src/types.ts`): `{ data: RecipeListItemDto[], pagination: PaginationMetaDto }`
  - `PaginationMetaDto` (from `src/types.ts`): `{ page, page_size, total }`
- Query Params Model (new)
  - Use existing `RecipesQueryParams` (from `src/types.ts`): `{ page?: number; page_size?: number; sort?: string }`

## 4. Response Details

- Status Codes
  - 200: Successful read, returns `RecipeListResponseDto`
  - 400: Invalid query params
  - 401: Unauthorized (missing/invalid session if enforced)
  - 500: Server-side error
- JSON Structure
  - `data`: Array of `RecipeListItemDto`
  - `pagination`: `{ page, page_size, total }`

## 5. Data Flow

1. Request enters `GET /api/recipes` Astro API route.
2. Extract and validate query params via Zod.
3. Instantiate `RecipesService` with `locals.supabase`.
4. Compute sort mapping and pagination (limit/offset).
5. Query Supabase `recipes` table, filtered by current user id, applying sorting, limit, and offset, selecting required fields only.
6. In parallel, fetch total count for the same filter (via `select('*', { count: 'exact', head: true })` or equivalent pattern with Supabase).
7. Map rows to `RecipeListItemDto`.
8. Return `200` with `RecipeListResponseDto`.
9. On validation or database errors, return appropriate error responses.

## 6. Security Considerations

- Authentication: use `locals.supabase` bound to the current session; avoid importing global client. If auth is not yet wired, continue using `DEFAULT_USER_ID` as placeholder but keep user filtering in one place for easy swap.
- Authorization: enforce that only recipes belonging to the authenticated user are returned (`user_id = currentUserId`).
- Input hardening: whitelist sort fields and directions; cap `page_size` to 100; validate numeric bounds (`page >= 1`).
- Avoid leaking other columns (e.g., `content`) in list view; select explicit fields only.

## 7. Error Handling

- 400 Bad Request:
  - Invalid `page`, `page_size` (non-integer, out of range)
  - Invalid `sort` (unknown field/direction)
- 401 Unauthorized:
  - If session is required and missing.
- 500 Internal Server Error:
  - Database query failures

Error response format:

```json
{ "error": "<short message>", "details": <optional details> }
```

Log server errors using `console.error` for now (consistent with POST /recipes). No error table is required for this read endpoint.

## 8. Performance Considerations

- Use index-friendly sort fields (`updated_at`, `created_at`, `title`). Ensure DB has indexes on commonly sorted columns if needed.
- Select only needed columns for list items to reduce payload size.
- Use `count: 'exact', head: true` to get total efficiently without retrieving rows.
- Validate and cap `page_size` to avoid large scans.

## 9. Implementation Steps

1. Validation Schema
   - Add `zRecipesQueryParams` in `src/lib/validation/recipe.schema.ts`:
     - `page`: optional int, default 1, min 1
     - `page_size`: optional int, default 20, min 1, max 100
     - `sort`: optional string, default `updated_at desc`; validate `<field> <direction>` where `field ∈ {updated_at, created_at, title}` and `direction ∈ {asc, desc}`.
   - Export `RecipesQueryParamsDTO` type.
2. Service Layer
   - Extend `RecipesService` in `src/lib/services/recipes.service.ts` with:
     - `listRecipes(params: { userId: string; page: number; pageSize: number; sortField: 'updated_at'|'created_at'|'title'; sortDir: 'asc'|'desc'; }): Promise<{ items: RecipeListItemDto[]; total: number }>`
     - Implement two queries:
       - Data: `.from('recipes').select('id,title,source,created_at,updated_at').eq('user_id', userId).order(sortField, { ascending: sortDir==='asc' }).range(offset, offset+pageSize-1)`
       - Count: `.from('recipes').select('*', { count: 'exact', head: true }).eq('user_id', userId)`
     - Handle and throw meaningful errors when Supabase returns errors.
3. API Route
   - Update/create `GET` handler in `src/pages/api/recipes.ts`:
     - `export const GET: APIRoute = async ({ url, locals }) => { ... }`
     - Parse query params using `zRecipesQueryParams.safeParse(Object.fromEntries(url.searchParams))`.
     - Determine `userId` from session (`locals.supabase.auth.getUser()` or existing pattern). If not available, use `DEFAULT_USER_ID` placeholder but keep a TODO to switch when auth is ready. Return 401 when auth is enforced.
     - Call `recipesService.listRecipes({ userId, page, pageSize, sortField, sortDir })`.
     - Map to `RecipeListResponseDto` and return 200 JSON.
     - On validation error return 400 JSON; on service error return 500 JSON.
4. Types
   - Reuse `RecipeListItemDto`, `RecipeListResponseDto`, `RecipesQueryParams`, `PaginationMetaDto` from `src/types.ts`.
