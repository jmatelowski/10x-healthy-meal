# View Implementation Plan [Recipe Create + AI Review Modal]

## 1. Overview

The Recipe Create view enables users to create a new recipe manually or send the draft to AI for adaptation. It validates Title (≤50 chars) and Content (≤10,000 chars) with real-time counters and inline errors. The AI Review modal overlays the create view to present the AI-adapted proposal, allowing the user to accept (persist as `source='ai'`) or reject (close without saving). The UX follows MVP constraints, prioritizing simple validation, accessible controls, and clear error handling.

## 2. View Routing

- Path: `/recipes/new`
- Modal: AI Review appears as an overlay on the same route (client state-driven modal; no separate URL is required for MVP).

## 3. Component Structure

- `pages/recipes/new` (Astro page) using React client components for interactivity
  - `RecipeCreateForm` (React)
    - `ValidatedForm` (internal form logic using Zod)
      - `TextField` (Title) + `InlineErrors` + `CharacterCounter`
      - `TextareaField` (Content) + `InlineErrors` + `CharacterCounter`
      - `PrimaryButton` (Adjust with AI) and `SecondaryButton` (Save)
  - `AiReviewModal` (React, portal/modal)
    - `ModalShell` (focus trap, Esc support, labelled title, scroll lock)
    - `RecipePreview` (MVP show proposal directly)
    - `InlineStatus` (polling state, errors, timeout guidance)
    - `PrimaryButton` (Accept) and `DangerButton` (Reject)

## 4. Component Details

### RecipeCreateForm

- Component description: Interactive form for entering a recipe Title and Content with live validation, counter (for content), and actions to Save or Adjust with AI.
- Main elements:
  - `form` with controlled inputs (`input[type=text]` for Title, `textarea` for Content)
  - `CharacterCounter` next to content field (remaining characters)
  - `InlineErrors` under fields
  - `Button` components: Save (secondary), Adjust with AI (primary)
- Handled interactions:
  - Type in Title/Content → update state, counters, clear/show errors
  - Click Save → POST `/recipes` with `{ title, content }`
  - Click Adjust with AI → POST `/generations` with `{ title, content }`, open modal with loader, payload on 202 request
- Handled validation (client):
  - Title: required, string, length 1–50
  - Content: required, string, length 1–10,000
  - Disable action buttons if invalid
  - Add loader state if submitting, second action button should be disabled
- Types:
  - Uses `CreateRecipeCommand` and `RecipeCreationResponseDto`
  - Uses `CreateGenerationCommand` and `GenerationCreationResponseDto`
  - Local `RecipeDraftViewModel` for form state
- Props:
  - None (top-level page component owns it). Optionally accepts `onCreated(id)` callback if integrated into a larger flow.

### AiReviewModal

- Component description: Accessible modal presenting AI’s proposed recipe for review, with accept/reject actions and inline status feedback.
- Main elements:
  - `dialog`/`div` with `role="dialog"`, `aria-modal="true"`, labelled title
  - `RecipePreview` showing proposed `title` and `content`
  - `InlineStatus` area for showing polling/timeout or errors
  - Buttons: Accept (primary), Reject (danger)
- Handled interactions:
  - Esc key closes (reject)
  - Click Reject → close modal without saving
  - Click Accept → POST `/generations/{id}/accept` (service; see API Integration), then navigate to recipe detail `/recipes/{recipe_id}`
- Handled validation:
  - None beyond verifying a valid proposal payload exists
- Types:
  - Inputs: `{ generationId: string, proposal: RecipeBase }`
  - Accept response: `AcceptGenerationResponseDto`
- Props:
  - `open: boolean`
  - `generationId: string | null`
  - `onClose: () => void`
  - `onAccepted: (recipeId: string) => void`

### CharacterCounter

- Component description: Displays remaining character count against max.
- Main elements: `span` or `div` with subdued text, color changes near limit
- Handled interactions: none
- Validation: none; derived from parent
- Types: `{ current: number; max: number }`
- Props: `current: number; max: number; aria-describedby id forwarding`

### InlineErrors

- Component description: Renders a list or single inline error under a field.
- Main elements: `p`/`div` with `aria-live="polite"` and `id` for `aria-describedby`
- Types: `string[] | string | null`
- Props: `messages?: string[] | string`

### ModalShell

- Component description: A11y modal wrapper with focus trap, Esc to close, labelled title, background scroll lock.
- Main elements: overlay, content container, close button (optional)
- Types: `{ open: boolean; labelledBy: string }`
- Props: `open`, `onClose`, `title`, `children`

### RecipePreview

- Component description: Read-only display of a recipe. For MVP, no diff; can adopt diff later.
- Main elements: heading, preformatted content
- Types: `RecipeBase`
- Props: `recipe: RecipeBase`

## 5. Types

- Reuse from `src/types.ts`:
  - `CreateRecipeCommand` `{ title: string; content: string }`
  - `RecipeCreationResponseDto` `{ id: string; status: "accepted"; recipe: RecipeBase }`
  - `CreateGenerationCommand` alias of `RecipeBase`
  - `GenerationCreationResponseDto` `{ id: string; status: null; recipe_proposal: RecipeBase }`
  - `AcceptGenerationResponseDto` `{ recipe_id: string; message: string }`
- New view model types:
  - `RecipeDraftViewModel`:
    - `title: string`
    - `content: string`
    - `errors: { title?: string[]; content?: string[] }`
    - `isValid: boolean`
    - `isSubmitting: boolean`
  - `AiReviewState`:
    - `open: boolean`
    - `generationId: string | null`
    - `proposal: RecipeBase | null`
    - `errorMessage?: string`

## 6. State Management

- Local React state within `RecipeCreateForm` using `useState` and `useMemo`.
- Validation via Zod schema mirroring backend limits for Title and Content (same as `zCreateRecipeSchema`).
- Controlled inputs update `RecipeDraftViewModel` and counters.
- `AiReviewState` lives at the page level to keep modal mounted above the form.
- Optional custom hook `useAiReview` to encapsulate open/close, accept flow, and error handling.

## 7. API Integration

- POST `/recipes` (manual save):
  - Request: `CreateRecipeCommand`
  - Response: `RecipeCreationResponseDto`
  - Behavior: On 201, navigate to `/recipes`.
- POST `/generations` (adjust with AI):
  - Request: `CreateGenerationCommand`
  - Response (202): `GenerationCreationResponseDto`
  - Behavior: Open modal with `{ generationId: id, proposal: recipe_proposal }`.
- POST `/generations/{id}/accept` (accept proposal):
  - Response (200): `AcceptGenerationResponseDto`
  - Behavior: Close modal and navigate to `/recipes`.
- Headers: `Content-Type: application/json` for all POSTs.

## 8. User Interactions

- Typing in inputs updates state; counters reflect remaining characters.
- Invalid inputs disable Save/Adjust buttons and show inline messages on blur or submit attempt.
- Save: calls `/recipes`, shows loading state, handles success (navigate) and errors (inline banner/message).
- Adjust with AI: calls `/generations`, shows loading; on 202 opens modal with proposal. If server error, show inline error.
- In modal: Accept triggers accept call and navigates on success; Reject closes without side effects. Esc closes and returns focus to trigger.

## 9. Conditions and Validation

- Title: non-empty, ≤50. Content: non-empty, ≤10,000.
- Disable buttons if invalid or while submitting.
- Modal requires valid `generationId` and `proposal` to open; otherwise, prevent opening and show error.
- Accessibility: `aria-invalid` on fields with errors, `aria-describedby` linking to `InlineErrors` and counters; modal `aria-modal`, labelled title, focus management.

## 10. Error Handling

- Client-side validation prevents over-limit submissions.
- Network/server errors display non-intrusive messages near form actions.
- `/generations` timeouts: show `InlineStatus` with retry/cancel guidance; allow closing modal.
- Accept failure: keep modal open, show error message, allow retry.
- Generic fallback: "Something went wrong. Please try again."

## 11. Implementation Steps

1. Create Zod schema `zRecipeDraft` mirroring backend constraints (title ≤50, content ≤10,000).
2. Implement `RecipeCreateForm` with controlled inputs, counters, and inline errors.
3. Wire Save button to POST `/recipes`; on 201, navigate to recipes list.
4. Wire Adjust with AI to POST `/generations`; on 202, open `AiReviewModal` with proposal data.
5. Build `ModalShell` with focus trap, Esc, labelled title, and scroll lock.
6. Implement `RecipePreview` to display proposal.
7. Implement `AiReviewModal` with Accept/Reject; Accept posts to `/generations/{id}/accept` and navigates.
8. Add `InlineStatus` for loading/timeout/error messages in modal.
9. Ensure accessibility attributes and focus return to trigger on close.
10. Add error banners/inline messages for server errors.
11. Integrate existing `Button` component variants for primary/secondary actions.
12. Light styling with Tailwind 4 to match the app’s UI.
