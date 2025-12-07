# View Implementation Plan – Recipe Detail

## 1. Overview

The **Recipe Detail** view presents a single recipe in full and lets the owner manage it.
Primary goals:

1. Display the recipe title, full content, data source badge (AI / Manual) and last-modified date.
2. Provide management actions – **Edit** and **Delete** – with a confirmation flow for irreversible deletion.
3. Handle loading, empty and error states (400/403/404/500).
4. Meet accessibility (a11y) standards and follow HealthyMeal coding guidelines.

---

## 2. View Routing

Path: `/recipes/:id`
Astro file: `src/pages/recipes/[id].astro`
• `:id` is a UUID identifying the recipe (validated server-side).

---

## 3. Component Structure

```
RecipeDetailPage [.astro]
└─ <RecipeDetailIsland id={id}/> [.tsx]
   ├─ RecipeHeader
   │   └─ SourceBadge
   ├─ RecipeMetadata
   ├─ RecipeContent
   ├─ RecipeActions
   │   ├─ EditButton (Link)
   │   └─ DeleteButton (opens modal)
   ├─ ConfirmDeleteModal (Dialog + Portal)
   ├─ LoadingSpinner
   └─ NotFoundMessage / ErrorMessage
```

---

## 4. Component Details

### RecipeDetailPage (.astro)

- **Description:** SSR wrapper providing HTML shell and route param `id`, hydrates `RecipeDetailIsland`.
- **Main elements:** `<Layout>`, `<RecipeDetailIsland id={Astro.params.id} />`.
- **Events:** none.
- **Validation:** none (handled in island / backend).
- **Types:** `AstroGlobal` params.
- **Props:** `id: string`.

### RecipeDetailIsland

- **Description:** Top-level React component; fetches recipe, manages state & child rendering.
- **Elements:** children listed in tree; conditionally renders Loading / Error / NotFound.
- **Events:** `useEffect` fetch, delete mutation callbacks.
- **Validation:** ensures `id` is non-empty before fetch.
- **Types:** `RecipeDetailViewModel`, `FetchState`, `DeleteState`.
- **Props:** `{ id: string }`.

### RecipeHeader

- **Description:** Displays title and data-source badge.
- **Elements:** `<h1>`, `<SourceBadge>`.
- **Events:** none.
- **Validation:** truncates title >50 chars with ellipsis visually (plain display).
- **Types:** `props: { title: string; source: RecipeSource }`.

### SourceBadge

- **Description:** Tiny pill showing "AI" or "Manual".
- **Elements:** `<span>` with Tailwind styles (bg-green/blue).
- **Events:** none.
- **Types:** `{ source: RecipeSource }`.

### RecipeMetadata

- **Description:** Shows `updated_at` (and optionally created_at) in human friendly format.
- **Elements:** `<time>` with tooltip full ISO.
- **Events:** none.
- **Types:** `{ updatedAt: string }`.

### RecipeContent

- **Description:** Renders full recipe content with preserved whitespace.
- **Elements:** `<article>` using `prose` class; wrap in `<pre white-space:pre-wrap>` OR markdown renderer if available.
- **Events:** none.
- **Validation:** none.
- **Types:** `{ content: string }`.

### RecipeActions

- **Description:** Horizontal row with **Edit** and **Delete**.
- **Elements:** `<Link>` to `/recipes/{id}/edit`, `<Button>` delete.
- **Events:** `onClick` delete → opens modal.
- **Validation:** none.
- **Types:** `{ onDelete(): void; recipeId: string }`.

### ConfirmDeleteModal

- **Description:** shadcn/ui `Dialog` with focus trap; asks confirmation, warns irreversibility.
- **Elements:** `Dialog`, `DialogContent`, `DialogHeader`, two Buttons (Cancel / Delete).
- **Events:** Cancel → close; Delete → call `deleteRecipe`.
- **Validation:** none.
- **Types:** `{ open: boolean; onClose(): void; onConfirm(): void; deleting: boolean; error?: string }`.

### LoadingSpinner

Simple centred spinner (shared component).

### NotFoundMessage / ErrorMessage

Reusable component showing message & link back to `/recipes`.

---

## 5. Types

```ts
// View-specific
export interface RecipeDetailViewModel {
  id: string;
  title: string;
  content: string;
  source: RecipeSource; // from global types
  updatedAt: string; // ISO
}

export interface FetchState {
  loading: boolean;
  error?: string;
  data?: RecipeDetailViewModel;
}

export interface DeleteState {
  open: boolean;
  deleting: boolean;
  error?: string;
}
```

(All other DTOs such as `RecipeDto` & `RecipeSource` imported from `@/types`.)

---

## 6. State Management

- **useRecipe(id):** Handles GET.
  Returns `{ data, loading, error, refetch }`.
- **useDeleteRecipe(id):** Handles DELETE mutation.
  Returns `{ deleteRecipe, deleting, error }`.
- `useBoolean(initial)` or simple `useState` for modal open.
- Toast context used for success notification (assumed existing; if not, add).

---

## 7. API Integration

1. **Fetch recipe**

```ts
GET /api/recipes/${id}
Response: RecipeDto // 200
Errors: 400 {error}, 404 {error}, 500 {error}
```

Mapping: convert `updated_at` → `updatedAt`, keep others.

2. **Delete recipe**

```ts
DELETE /api/recipes/${id}
Expected 204 No Content (or 200 {message})
Errors: 400, 403, 404, 500
```

After 204: navigate to `/recipes`, show toast "Recipe deleted".

Implementation: use `fetch` with `credentials:"include"` (cookies auth).

---

## 8. User Interactions

| Interaction      | Component          | Outcome                                                          |
| ---------------- | ------------------ | ---------------------------------------------------------------- |
| Page load        | RecipeDetailIsland | Spinner → recipe displayed or error screen                       |
| Click **Edit**   | RecipeActions      | Navigate to `/recipes/:id/edit`                                  |
| Click **Delete** | RecipeActions      | Open ConfirmDeleteModal                                          |
| Confirm delete   | ConfirmDeleteModal | Call DELETE, show spinner on button, on success redirect + toast |
| Cancel modal     | ConfirmDeleteModal | Close modal                                                      |
| API error        | any                | Show inline error message & keep state stable                    |

---

## 9. Conditions & Validation

1. `id` must be UUID – backend validates; on 400 show "Invalid ID" message.
2. Deletion irreversible – modal text emphasises this, primary button has `data-danger` style.
3. Unauthorised (403) – show message and disable actions.
4. 404 – NotFoundMessage + Back link.
5. Character limits already enforced on server; none in display.

---

## 10. Error Handling

- **Network/500**: generic error component with retry.
- **400 invalid id**: Invalid message.
- **404**: NotFoundMessage.
- **403**: “You do not have permission to view this recipe.” Show Back link.
- **Delete failure**: keep modal open, show error below buttons, allow retry.
- All errors logged with `console.error` per coding guidelines.

---

## 11. Implementation Steps

1. **Routing** – create `src/pages/recipes/[id].astro` with layout wrapper.
2. **Create types** – add view model types to `src/types.recipe-detail.ts` (or reuse index file section).
3. **Implement hooks** – `src/lib/hooks/useRecipe.ts`, `useDeleteRecipe.ts` with fetch & error handling.
4. **Build components** – in `src/components/recipes/detail/` create:
   - `RecipeDetailIsland.tsx`
   - `RecipeHeader.tsx`
   - `RecipeMetadata.tsx`
   - `RecipeContent.tsx`
   - `RecipeActions.tsx`
   - `ConfirmDeleteModal.tsx`
5. **Styling** – apply Tailwind classes; reuse `prose` for content.
6. **Toast infrastructure** – ensure global ToastProvider; else scaffold with shadcn/ui.
7. **Integrate hooks in island** – wire loading/error states & modal.
8. **Accessibility** – verify heading hierarchy, aria-labels, focus trap in modal.
9. **Tests** – unit tests hooks (Vitest) & components (RTL); e2e delete flow (Playwright + MSW mock DELETE).
10. **Documentation** – update Storybook (if used) and README dev notes.
11. **Backend sync** – ensure DELETE endpoint implementation is completed; else use MSW stub until merged.
