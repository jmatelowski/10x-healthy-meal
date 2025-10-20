# View Implementation Plan – Recipes List

## 1. Overview

The **Recipes List** view is the primary landing screen shown after a successful login (paths `/` and `/recipes`). It allows an authenticated user to browse their saved recipes, identify AI-generated items, and navigate to other recipe-related flows (details, creation, pagination). The view must be mobile-first, accessible (WCAG AA), and integrate with the existing `GET /api/recipes` endpoint to fetch paginated data.

## 2. View Routing

- **Path 1:** `/` – redirect to `/recipes` for authenticated users.
- **Path 2:** `/recipes` – renders the Recipes List view.
- Both routes are protected by the existing auth middleware (redirect **302 → /login** on 401).

## 3. Component Structure

```
<RecipesListPage>   (Astro page + React island)
 ├─ <Header>
 │   └─ <AddRecipeButton>
 ├─ <ContentArea>
 │   ├─ <ErrorBanner>        (optional)
 │   ├─ <EmptyState>         (shown when data.length === 0)
 │   ├─ <RecipeGrid>
 │   │   ├─ <RecipeCard>*    (repeat)
 │   │   └─ …
 │   └─ <PaginationControls>
 └─ <Footer> (reuse global)
```

\*`RecipeCard` may be implemented as a standalone React component and reused elsewhere (e.g. search results).

## 4. Component Details

### 4.1 RecipesListPage (Astro page + island)

- **Description:** Shell component responsible for data fetching, state management and rendering child components.
- **Main elements:** `<section>` wrapper, `<Header>`, `<ContentArea>`.
- **Handled interactions:** page change, initial load, error retry.
- **Validation:** none (delegated to children).
- **Types:** `RecipesListViewModel`, `RecipesListPageProps` (empty for now).
- **Props:** n/a – page handles its own fetch via hook.

### 4.2 Header

- **Description:** Top bar inside the page (not global nav) containing _“Your recipes”_ title and _Add Recipe_ CTA.
- **Main elements:** `<h1>`, `<AddRecipeButton>`.
- **Handled interactions:** click → navigate to `/recipes/new`.
- **Validation:** none.
- **Types:** none.
- **Props:** none.

### 4.3 AddRecipeButton

- **Description:** Styled button that routes to creation form.
- **Main elements:** `<Button>` from `src/components/ui/button.tsx` (shadcn).
- **Handled interactions:** onClick → `router.push('/recipes/new')`.
- **Validation:** none.
- **Types/Props:** standard button props.

### 4.4 ContentArea

- **Description:** Wrapper stacking ErrorBanner, EmptyState / RecipeGrid, PaginationControls.
- **Main elements:** flex column container.
- **Handled interactions:** none (pure layout).
- **Props:** `{ state: RecipesListState }`.

### 4.5 ErrorBanner

- **Description:** Displays API or network errors with retry button.
- **Main elements:** `<div role="alert">`, retry `<button>`.
- **Handled interactions:** retry → re-fetch via hook.
- **Validation:** none.
- **Types:** `FetchError` (extends `Error`).
- **Props:** `{ message: string; onRetry: () => void }`.

### 4.6 EmptyState

- **Description:** Shown when `recipes.length === 0` and not loading.
- **Main elements:** SVG or PNG illustration, friendly message, **Add Recipe** CTA.
- **Handled interactions:** click CTA → `/recipes/new`.
- **Validation:** none.
- **Props:** none.

### 4.7 RecipeGrid

- **Description:** Responsive CSS grid of `RecipeCard`s (min-max columns via Tailwind).
- **Main elements:**ul li
- **Handled interactions:** none.
- **Validation:** none.
- **Props:** `{ recipes: RecipeCardViewModel[] }`.

### 4.8 RecipeCard

- **Description:** Compact card showing title, updated date, 100-char preview, AI badge.
- **Main elements:** clickable `<article>`; `<h2>`; `<p>`; badge.
- **Handled interactions:** click → navigate to `/recipes/{id}`.
- **Validation:** truncation (preview ≤ 100 chars, add ellipsis via CSS).
- **Types:** `RecipeCardViewModel`.
- **Props:** `{ recipe: RecipeCardViewModel }`.

### 4.9 PaginationControls

- **Description:** Displays page numbers, next/prev. Accessible buttons with `aria-label` & `aria-disabled`.
- **Main elements:** `<nav role="navigation" aria-label="Pagination">` containing buttons/links.
- **Handled interactions:** click page/next/prev → update hook state.
- **Validation:** disable next/prev on edges.
- **Types:** `PaginationMetaDto` (existing) + internal helpers.
- **Props:** `{ pagination: PaginationMetaDto; onPageChange: (page:number) => void }`.

## 5. Types

### 5.1 Existing Imports

- `RecipeListItemDto`, `PaginationMetaDto` (from `src/types.ts`).

### 5.2 New Types

```ts
/** View–specific state returned by hook */
export interface RecipesListState {
  loading: boolean;
  error?: FetchError;
  data: RecipeCardViewModel[];
  pagination: PaginationMetaDto;
}

/** Transformed item ready for UI */
export interface RecipeCardViewModel {
  id: string;
  title: string;
  preview: string; // first 100 chars of content
  updatedAt: string; // ISO8601
  isAi: boolean; // source === 'ai'
}

/** Hook parameters */
export interface UseRecipesListParams {
  initialPage?: number;
  pageSize?: number; // default 20, max 100
  sort?: string; // same as API
}
```

## 6. State Management

- **React island approach:** Isolate interactive logic in a `RecipesListIsland.tsx` component imported by Astro page.
- **Custom hook:** `useRecipesList(params)` encapsulates fetch, pagination, loading/error state, and provides `gotoPage`, `retry` actions.
- **State atoms:** none (view-local).
- URL query (`?page=`) kept in sync via `useSearchParams` (`react-router-dom` v7) to allow deep-link/share.

## 7. API Integration

- **Endpoint:** `GET /api/recipes`
- **Query params:** `page`, `page_size`, `sort` (default `updated_at desc`).
- **Request type:** none (query only).
- **Response type:** `RecipeListResponseDto`.
- **Fetch util:** wrapper `fetchJson<T>` already exists in utils; else implement.
- **Transform:** map `data` → `RecipeCardViewModel` inside hook.

## 8. User Interactions

| Interaction          | Component                    | Outcome                              |
| -------------------- | ---------------------------- | ------------------------------------ |
| Page load            | RecipesListPage              | Trigger fetch with default params    |
| Click recipe card    | RecipeCard                   | Navigate to `/recipes/{id}`          |
| Click Add Recipe     | AddRecipeButton / EmptyState | Navigate to `/recipes/new`           |
| Click Next/Prev page | PaginationControls           | Update `page` state → fetch new page |
| Retry after error    | ErrorBanner                  | Re-execute last fetch                |

## 9. Conditions and Validation

1. **Auth**: 401 handled globally → redirect `/login`.
2. **PageSize ≤ 100**: enforced in hook before sending request.
3. **Preview length**: truncate client-side `content.slice(0,100)`.
4. **Pagination buttons**: `disabled` when `page === 1` or `page >= ceil(total/page_size)`.
5. **AI badge**: render when source === 'ai'.
6. **Manual badge**: render when source === 'manual'.

## 10. Error Handling

| Scenario                     | Handling                                |
| ---------------------------- | --------------------------------------- |
| Network/API failure          | show `ErrorBanner` with message + retry |
| Invalid query params in URL  | fall back to defaults, then update URL  |
| Empty list (200 & total = 0) | render `EmptyState`                     |
| Unexpected data shape        | log error, show generic banner          |

## 11. Implementation Steps

1. **Routing**: update `src/pages/index.astro` to redirect authenticated users to `/recipes`.
2. **Astro page**: create `src/pages/recipes/index.astro` that imports `<RecipesListIsland>`.
3. **Island**: scaffold `RecipesListIsland.tsx` in `src/components/recipes/`.
4. **Hook**: implement `useRecipesList` in `src/lib/hooks/useRecipesList.ts`.
5. **DTO → VM mapper** in the hook.
6. **Components**: build `RecipeCard`, `PaginationControls`, `EmptyState`, `ErrorBanner`, `Header` within `src/components/recipes/`.
7. **Styling**: apply Tailwind classes, ensure responsive grid (e.g. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
8. **Accessibility**: add `aria-label`, `aria-live` for error banner, semantic tags.
