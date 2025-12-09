# View Implementation Plan – User Profile

## 1. Overview

The **User Profile** view (`/profile`) allows authenticated users to:

1. Select and save their dietary preferences (multi-select of six presets).
2. Permanently delete their account (and all associated data) after explicit confirmation.

The page must be keyboard-accessible, provide clear feedback for all actions, and keep the application state (client context) in sync with backend changes.

---

## 2. View Routing

| Path       | Access Guard                                                          | SSR mode                                                                                     |
| ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/profile` | Authenticated users only – redirect to `/auth/login` if not logged-in | Astro server-side; hydrate React components client-side only where interactivity is required |

---

## 3. Component Structure

```
<PageLayout>
  ├── <PreferencesCard>
  │     ├── <PreferenceTagInput>
  │     └── <PrimaryButton type="submit">Save</PrimaryButton>
  ├── <SaveSuccessModal />
  └── <DangerZonePanel>
         ├── <DeleteAccountButton />
         └── <ConfirmDeleteModal />  (portal)
```

---

## 4. Component Details

### 4.1 `PageLayout`

- **Description:** Provides page headline, centered max-width container, and vertical spacing.
- **Elements:** `<main>`, `<h1>`, `slot` for children.
- **Events:** none.
- **Validation:** none.
- **Types:** none.
- **Props:** `children` (ReactNode).

### 4.2 `PreferencesCard`

- **Purpose:** Encapsulates form for managing dietary preferences.
- **Elements:** `<form>` containing a grid of six `PreferenceTagInput`s (styled `<input type="checkbox">`), and `PrimaryButton` (Save).
- **Events:**
  - `onSubmit` – triggers `handleSave`.
  - Child toggle `onClick` – toggles `aria-pressed` state.
- **Validation:**
  - Max 6 preferences (`Zod.array(DietPrefEnum).max(6)`).
- **Types:**
  - `PreferencesFormViewModel` (see §5).
- **Props:**
  - `initialPreferences: DietPref[]`
  - `onSubmit: (prefs: DietPref[]) => Promise<void>`

### 4.3 `PreferenceTagInput`

- **Purpose:** Checkbox styled as tag representing one diet preference.
- **Elements:** `<input type="checkbox">` visually hidden + `<label>` styled as tag/chip with icon & label.
- **Events:** Change event on input toggles selected state (managed by form library).
- **Validation:** none (handled in parent).
- **Types:** none.
- **Props:**
  - `value: DietPref`
  - `icon: ReactElement`

### 4.4 `SaveSuccessModal`

- **Purpose:** Modal dialog confirming preferences were saved successfully.
- **Elements:** Dialog with success icon, message, and Close button.
- **Events:** `onClose` – dismisses modal.
- **Validation:** none.
- **Types:** `SaveModalState` (see §5)
- **Props:**
  - `open: boolean`
  - `onClose: () => void`

### 4.5 `DangerZonePanel`

- **Purpose:** Visually separates destructive actions.
- **Elements:** `<section>` with red border, descriptive text, `DeleteAccountButton`.
- **Events:** none.
- **Validation:** none.
- **Types:** none.
- **Props:** none.

### 4.6 `DeleteAccountButton`

- **Purpose:** Opens confirmation modal.
- **Elements:** `<Button variant="destructive">Delete account</Button>`
- **Events:** `onClick` → `setModalOpen(true)`
- **Validation:** none.
- **Types:** none.
- **Props:** none.

### 4.7 `ConfirmDeleteModal`

- **Purpose:** Confirms irreversible account deletion.
- **Elements:** Modal dialog with message, Cancel & Delete buttons.
- **Events:**
  - `onConfirm` → `handleDeleteAccount`
  - `onCancel` → close modal
- **Validation:** none.
- **Types:**
  - `DeleteModalState` (see §5)
- **Props:**
  - `open: boolean`
  - `loading: boolean`
  - `onConfirm: () => Promise<void>`
  - `onClose: () => void`

---

## 5. Types

```ts
// Existing types imported from src/types.ts
import { DietPref } from "@/types";

// View-specific types
interface PreferencesFormViewModel {
  preferences: DietPref[]; // currently selected prefs
  submitting: boolean; // POST in progress
  error?: string; // server-side error
}

interface SaveModalState {
  open: boolean;
}

interface DeleteModalState {
  open: boolean;
  deleting: boolean;
  error?: string;
}
```

---

## 6. State Management

- **React Hook Form** + **ZodResolver** manage form state and validation inside `PreferencesCard`.
- `usePreferencesForm(initialPrefs)` custom hook returns `{ register, handleSubmit, watch, formState }`.
- `SaveSuccessModal` visibility managed by `useState` (`SaveModalState`).
- `DeleteModalState` via `useState`.
- Global auth/user context (`AuthContext`) updates after successful save or deletion to keep app in sync.

---

## 7. API Integration

| Action           | Endpoint                    | Method | Request Body               | Response         | Post-Action                                                           |
| ---------------- | --------------------------- | ------ | -------------------------- | ---------------- | --------------------------------------------------------------------- |
| Save preferences | `/api/users/me/preferences` | PUT    | `UpdatePreferencesCommand` | `UserProfileDto` | Update AuthContext with new prefs, show success msg                   |
| Delete account   | `/api/users/me`             | DELETE | –                          | 204 No Content   | Navigate to `/auth/login?message=account-deleted` & clear AuthContext |

**Request / Response Types** (imported): `UpdatePreferencesCommand`, `UserProfileDto`.

Fetch wrapper (`fetchJson`) handles JSON serialization and throws for non-OK responses.

---

## 8. User Interactions

1. **Select preference tag** – Checkbox toggles selected, tag visual changes, focus outline visible.
2. **Save** – Opens SaveSuccessModal upon successful response; on error shows error banner at top of card.
3. **Delete account** – Opens confirmation modal, etc.
4. **Keyboard Navigation** – All buttons reachable via Tab; arrow-key nav optional but nice-to-have.

---

## 9. Conditions and Validation

| Condition              | Component          | Enforcement                                                   |
| ---------------------- | ------------------ | ------------------------------------------------------------- |
| ≤ 6 unique preferences | PreferencesCard    | Zod schema + UI disables additional toggles when 6 selected   |
| Authenticated          | Route Guard        | server redirect to `/auth/login`                              |
| DELETE irreversible    | ConfirmDeleteModal | Explicit warning text + secondary confirmation button styling |

---

## 10. Error Handling

- **Network / 5xx** – Catch, show inline error & allow retry.
- **401/403** – Trigger global sign-out and redirect to `/auth/login`.
- **Validation 400** – Display server-returned error messages per field (fallback to generic).
- **Slow network** – Show spinner on Save & Delete; keep buttons disabled until resolved; Add 12 s timeout fallback.
- **Validation & network errors show error banner inside `PreferencesCard` since InlineFeedback removed.**

---

## 11. Implementation Steps

1. **Scaffold route**: create `src/pages/profile.astro` with auth guard + import of `<UserProfile />` React component.
2. **Create `UserProfile.tsx`** composing `PageLayout`, `PreferencesCard`, and `DangerZonePanel`.
3. **Implement `PreferenceTagInput`** – accessible toggle with Tailwind classes.
4. **Implement `PreferencesCard`**
   1. Set up React Hook Form with `PreferencesFormViewModel`.
   2. Map six enum values to toggles.
   3. On submit, call `savePreferences` service.
5. **Service layer**: `userService.updatePreferences` (PUT) & `userService.deleteAccount` (DELETE).
6. **Add `usePreferencesForm` hook`** for encapsulated form logic.
7. **Create `DangerZonePanel`**, `DeleteAccountButton`, `ConfirmDeleteModal` with portal using `@radix-ui/react-dialog` or custom.
8. **Update global AuthContext** after PUT/DELETE.
9. **Remove “Delete Account” from `AuthMenu` and add “Profile” navigation link.**
10. **Unit tests** (Vitest + React Testing Library) for components & hooks.
11. **E2E tests** (Playwright) for full preference update and account deletion flows.
12. **Accessibility audit** (axe) and manual keyboard testing.
13. **Docs**: Update README routing table and `.ai/profile-view-implementation-plan.md` reference.
