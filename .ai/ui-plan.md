# UI Architecture for HealthyMeal

## 1. UI Structure Overview

- App shell: Public layout for `/login`, `/register`; Authenticated app layout for all other routes with header, main, and footer.
- Routing: Astro pages with React components. Protected routes verify Supabase JWT via middleware; unauthorized users are redirected to `/login`.
- Global state: `AuthProvider` (Supabase session/user) and `UserPreferencesProvider` (with dietary preferences). No external state libraries.
- Forms & validation: React Hook Form 7 manages form state and leverages the Zod resolver; schemas are shared with the backend (title ≤ 50, content ≤ 10 000). Real-time validation with a character counter for recipe content.
- Modals: Accessible, focus-trapped, Esc to close, background scroll locked. Used for AI Review and destructive confirmations (delete recipe/account).
- Responsiveness: Tailwind 4, mobile-first. Cards grid on recipe list; 2×3 toggle grid in preferences. Optimized for <640 px.
- Accessibility: Labeled inputs, `aria-pressed` for toggle buttons, `aria-label` and `aria-disabled` for pagination controls, keyboard navigation, and appropriate color contrast.
- Security: Auth-only access to recipes and profile; confirmation for destructive actions; minimal error disclosures; logout clears session.
- Error handling (MVP): Inline form errors; friendly empty states; API errors logged to console.

## 2. View List

### Login

- View path: `/login`
- Main purpose: Sign in existing users and establish authenticated session.
- Key information to display:
  - Email, password inputs; link to registration; concise error messages on failure.
- Key view components:
  - EmailInput, PasswordInput (show/hide with `aria-pressed`), PrimaryButton (Log in), InlineError, Link to `/register`.
- UX, accessibility, and security considerations:
  - Autocomplete for credentials; submit disabled until minimally valid.
  - On success, redirect to `/recipes`.
  - Failure shows generic error; no sensitive details. Rate limiting enforced server-side.

### Register

- View path: `/register`
- Main purpose: Create a new account with minimal form.
- Key information to display:
  - Email, password, confirm password; link to `/login`.
- Key view components:
  - EmailInput, PasswordInput (show/hide), PasswordConfirmInput (show/hide), PrimaryButton (Register), InlineError.
- UX, accessibility, and security considerations:
  - Password ≥ 8 chars (no strength meter); confirm must match.
  - Duplicate email shows generic error. No email verification in MVP.
  - On success, auto-login and redirect to `/recipes`.

### Recipes List

- View path: `/` and `/recipes`
- Main purpose: Primary landing after login; browse user recipes with pagination.
- Key information to display:
  - Recipe cards (title, updated date, content preview - up to 100 characters, elliped), AI badge when `source = 'ai'`, Add Recipe CTA, pagination controls, empty-state with CTA.
- Key view components:
  - Header with Add Recipe button; RecipeCard (title, updated_at, AI Badge); Pagination (page/page_size); EmptyState (graphic + CTA); Optional ErrorBanner.
- UX, accessibility, and security considerations:
  - Mobile-first cards grid; clear visual tag for AI content.
  - Pagination buttons include `aria-label` and `aria-disabled`.
  - Empty list shows friendly message and “Add your first recipe”.
  - Data is scoped to authenticated user; 401 redirects to `/login`.

### Recipe Create

- View path: `/recipes/new`
- Main purpose: Add a new manual recipe or send to AI for adaptation.
- Key information to display:
  - Title (≤50), Content (≤10,000), character counters, actions: Save, Adjust with AI.
- Key view components:
  - ValidatedForm (Zod), CharacterCounter, PrimaryButton (Save), SecondaryButton (Adjust with AI), InlineErrors.
- UX, accessibility, and security considerations:
  - Real-time validation; disable actions when invalid.
  - Save posts to `/recipes`; Adjust sends draft to `/generations` and opens AI Review modal.
  - No unsaved-changes guard per MVP.

### AI Review Modal

- View path: Overlay on `/recipes/new` route
- Main purpose: Review AI-adapted recipe and accept or reject.
- Key information to display:
  - Proposed title and content; accept and reject actions.
- Key view components:
  - Modal (focus-trap, Esc support, background scroll lock), RecipePreview/Diff, PrimaryButton (Accept), SecondaryButton (Reject), InlineStatus for polling/timeout.
- UX, accessibility, and security considerations:
  - Esc closes modal; focus returns to trigger; `aria-modal` and labelled title.
  - Accept saves as `source='ai'` and navigates to recipe detail; Reject closes without saving.
  - Handle 202/polling and timeout (show retry/cancel guidance).

### Recipe Detail

- View path: `/recipes/:id`
- Main purpose: View full recipe content and manage it.
- Key information to display:
  - Title, content, AI badge if applicable, updated_at; actions: Edit, Delete.
- Key view components:
  - RecipeHeader (title + AI Badge), Content, Metadata, Button (Edit), Button (Delete), ConfirmDeleteModal.
- UX, accessibility, and security considerations:
  - Clear hierarchy and readable text; delete confirmation describes irreversibility.
  - 404 handled with message and link back to list.

### Recipe Edit

- View path: `/recipes/:id/edit`
- Main purpose: Update existing recipe (overwrites previous version).
- Key information to display:
  - Pre-filled title/content fields with counters; action: Save.
- Key view components:
  - ValidatedForm (Zod), CharacterCounter, PrimaryButton (Save), InlineErrors.
- UX, accessibility, and security considerations:
  - Real-time validation; no unsaved-changes guard per MVP.

### User Profile

- View path: `/profile`
- Main purpose: Maintain user profile. Select and save dietary preferences via toggle buttons. Allow permanent account deletion with explicit confirmation.
- Key information to display:
  - Six options: vegetarian, vegan, gluten-free, diabetes, nut allergy, low-FODMAP.
  - Delete Account button; confirmation modal.
- Key view components:
  - Preferences card ToggleButton ×6 in 2×3 grid with icons, PrimaryButton (Save), InlineFeedback.
  - DangerZone card/panel, Button (Delete account), ConfirmDeleteModal.
- UX, accessibility, and security considerations:
  - Each toggle is a button with `aria-pressed`; keyboard navigable; visible focus.
  - Save replaces entire preferences array and updates context on success.
  - Modal confirms irreversibility; success signs out and redirects to `/login`.

### Global Confirm Dialog (Reusable)

- View path: Overlay on current route
- Main purpose: Confirm destructive actions (delete recipe/account) consistently.
- Key information to display:
  - Title, description, primary danger action, secondary cancel action.
- Key view components:
  - Modal (focus-trap, Esc), DangerButton, SecondaryButton.
- UX, accessibility, and security considerations:
  - Keyboard accessible; `aria-modal`; background scroll locked.

## 3. User Journey Map

- Primary happy path:
  1. User opens `/login`, enters credentials, clicks Log in → redirected to `/recipes`.
  2. On `/recipes`, empty state shown for new users → clicks “Add Recipe” → `/recipes/new`.
  3. Enters title/content (counters validate limits) → clicks “Adjust with AI”.
  4. AI Review modal appears with proposal → clicks Accept → recipe saved (`source='ai'`) → navigated to `/recipes/:id`.
  5. From detail, user can Edit (`/recipes/:id/edit`) or Delete (with confirmation).
  6. User updates preferences at `/profile/preferences` and saves.
  7. Optionally, user deletes account at `/profile/account` (confirmation) → signed out to `/login`.

- Alternative/error flows:
  - API failures (400/422/500): inline messages; console logging; user can retry.
  - Generation timeout (≥30 s): modal shows timeout; allow retry or cancel.
  - Unauthorized (401): redirect to `/login`.
  - Not found (404): show message and back-to-list link.

## 4. Layout and Navigation Structure

- Public layout (Login/Register): Centered auth card with minimal header (app name) and links between auth pages.
- Authenticated app layout:
  - Header: title (app name), primary nav (Recipes, Preferences), secondary actions (Add Recipe, Logout).
  - Main: Routed content with optional breadcrumbs on detail/edit.
  - Footer: Minimal links/legal.
- Navigation patterns:
  - Primary nav links in header; prominent “Add Recipe” CTA on list/header.
  - Pagination controls at the list bottom; accessible labels/states.
  - Modals are route-aware (query param) and restore focus on close.
- Route protection:
  - Middleware checks JWT for protected routes; unauthorized → `/login`.
  - Logout clears contexts and navigates to `/login`.

## 5. Key Components

- AuthProvider / AuthGuard: Manages Supabase session; protects routes; redirects unauthenticated users.
- PreferencesProvider: Stores dietary preferences; refreshes after save.
- EmailInput / PasswordInput: Labeled fields; password supports show/hide via `aria-pressed`.
- Button variants: Primary, secondary, danger; loading/disabled states.
- RecipeCard: Displays title, updated_at, AI Badge; navigates to detail.
- AI Badge: Distinct tag indicating `source='ai'` with accessible text.
- ValidatedForm (Zod): Real-time validation and inline error feedback.
- CharacterCounter: Remaining characters for title/content fields.
- Pagination: Accessible controls reflecting `page`/`page_size`.
- Modal: Focus trap, Esc support, scroll lock; used by AI Review and Confirm.
- ConfirmDialog: Standard destructive action confirmation.
- RecipePreview/Diff: Presents AI proposal for review; optional diff view.
- ErrorBanner / InlineError: Non-intrusive error presentation; logs to console per MVP.
