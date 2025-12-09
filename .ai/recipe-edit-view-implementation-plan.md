# View Implementation Plan – Recipe Edit View

## 1. Overview

The Recipe Edit view (`/recipes/:id/edit`) allows an authenticated user to update an existing recipe. The form is pre-filled with the current title and content and enforces the same validation rules as recipe creation (title ≤ 50 chars, content ≤ 10 000 chars). On save, the view issues a `PUT /recipes/{id}` request; success redirects to the Recipe Detail view, while errors are surfaced inline.

## 2. View Routing

- **Path:** `/recipes/:id/edit`
- **Route type:** Astro server-side page (`src/pages/recipes/[id]/edit.astro`)
- **Access control:** Only accessible to authenticated users (guard in `middleware.ts` or per-page check).

## 3. Component Structure

```
<RecipeEditPage>
 ├─ <RecipeEditForm>
 │   ├─ <FormField name="title"> (React Hook Form + Zod)
 │   │    ├─ <TextInput />
 │   │    └─ <CharacterCounter max=50 />
 │   ├─ <FormField name="content">
 │   │    ├─ <Textarea />
 │   │    └─ <CharacterCounter max=10_000 />
 │   ├─ <InlineErrors />
 │   └─ <PrimaryButton type="submit">Save</PrimaryButton>
 └─ <FetchErrorBanner /> (optional)
```

## 4. Component Details

### 4.1 `RecipeEditPage`

- **Purpose:** Wrapper that fetches recipe data, handles loading/error states, and renders `RecipeEditForm`.
- **Elements:** `<Suspense>` or conditional rendering blocks; `<Spinner>` during load.
- **Events:** none (delegates to form).
- **Props:** none (route params accessed via Astro).
- **Validation:** n/a.
- **Types:** `FetchState`, `RecipeDetailViewModel`.

### 4.2 `RecipeEditForm`

- **Purpose:** Controlled form for editing recipe.
- **Elements:** `<form>` using React Hook Form (`useForm`), `TextInput`, `Textarea`, `CharacterCounter`, `PrimaryButton`.
- **Events:** `onSubmit` (calls `updateRecipe`), `onChange` for live validation.
- **Validation:**
  - `title`: required, 1-50 chars.
  - `content`: required, 1-10 000 chars.
  - Zod schema `updateRecipeSchema` shared with backend.
- **Types:** `UpdateRecipePayload`, `RecipeEditViewModel` (local form state).
- **Props:**
  - `initialValue: RecipeBase` (prefilled data).

### 4.3 `CharacterCounter`

- **Purpose:** Shows used/remaining characters.
- **Elements:** `<span>` with visually hidden label for accessibility.
- **Events:** none (reads length via prop).
- **Validation:** switches text-color to error when limit exceeded (should not happen due to validation, but defensive).
- **Types:** `{ current: number; max: number }`.
- **Props:** `current`, `max`.

### 4.4 `InlineErrors`

- **Purpose:** Lists validation errors under each field.
- **Elements:** `<ul role="alert">` with `<li>` messages.
- **Types:** `FieldErrors` from React Hook Form.
- **Props:** `errors`.

### 4.5 `FetchErrorBanner`

- **Purpose:** Displays non-field API errors (403, 404, 500).
- **Elements:** `<Alert variant="error">`.
- **Props:** `message: string`.

## 5. Types

### 5.1 Existing

- `RecipeBase` (title, content)
- `UpdateRecipePayload` (import from `recipe.schema.ts`)
- `RecipeDetailViewModel` (already defined)

### 5.2 New

```ts
export interface RecipeEditViewModel extends RecipeBase {
  errors: {
    title?: string[];
    content?: string[];
  };
  touched: {
    title: boolean;
    content: boolean;
  };
  isValid: boolean;
  isSubmitting: boolean;
}
```

## 6. State Management

- **`useRecipe(id)`**: fetches recipe, returns `{ data, loading, error }`.
- **`useUpdateRecipe(id)`**: wrapper around mutation with optimistic UI option.
- **Form state** handled by React Hook Form; component-local, no global store required.

## 7. API Integration

- **GET** `/recipes/{id}` (existing) → `RecipeDto` → map to `RecipeDetailViewModel`.
- **PUT** `/recipes/{id}`
  - **Request:** **Body must contain ONLY `title` and/or `content` keys** as defined by `UpdateRecipePayload`; omit any other fields (e.g., `id`, `source`). Prefer building the payload from React Hook Form’s `dirtyFields` map to include only changed properties.
  - **Constraints:** At least one of the two properties is required; extra properties are rejected by API.
  - **Response 200:** `RecipeDto`.
  - **Errors:** 400 validation, 403 forbidden, 404 not found, 500 server.
- Integration via Supabase client or `fetch` helper inside form submit handler.

## 8. User Interactions

| Interaction        | Component        | Outcome                                                                            |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| Page load          | `RecipeEditPage` | show spinner → form pre-filled or error banner                                     |
| Edit title/content | `RecipeEditForm` | live counters update, errors shown on blur/type                                    |
| Click “Save”       | `RecipeEditForm` | submits PUT → on success navigate to `/recipes/:id`; on error show inline messages |

## 9. Conditions and Validation

- Client mirrors backend schema to reduce mismatches **and strips unknown keys before sending (only `title`/`content`).**
- Empty submission disabled (`isValid` gate or disabled button).
- Title/content length validated both client-side and server.

## 10. Error Handling

- **400**: parse `errors` field → map to form errors.
- **403 / 404**: show `FetchErrorBanner` with message and “Back to list” link.
- **Network/500**: generic error banner.
- Retry option via button or browser refresh.

## 11. Implementation Steps

1. Generate new page file `src/pages/recipes/[id]/edit.astro` that mounts `RecipeEditPage` React component via `<ClientOnly>`.
2. Implement `useRecipe` and `useUpdateRecipe` hooks in `src/lib/hooks/recipe.ts`.
3. Build `RecipeEditPage` component in `src/components/recipes/edit/RecipeEditPage.tsx`.
4. Create `RecipeEditForm` and supporting components in the same folder; reuse shared `CharacterCounter`, `InlineErrors`, `PrimaryButton`.
5. Import and reuse `updateRecipeSchema` from shared validation module.
6. **On submit, construct payload using `pick(formValues, ["title", "content"])` and include only keys present in `dirtyFields` to satisfy API restriction.**
7. Add route guard to ensure user is authenticated.
8. Write unit tests for `RecipeEditForm` validation, payload construction, and API integration (Vitest + MSW).
