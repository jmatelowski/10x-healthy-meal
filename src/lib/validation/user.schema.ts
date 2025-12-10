import { z } from "zod";

/**
 * Enum matching database diet_pref_enum
 * Must stay in sync with Supabase enum definition
 */
export const zDietPrefEnum = z.enum(["vegetarian", "vegan", "gluten_free", "diabetes", "nut_allergy", "low_fodmap"]);

export type DietPrefEnum = z.infer<typeof zDietPrefEnum>;

/**
 * Zod schema for PUT /users/me/preferences payload
 * - Validates array of diet preferences
 * - Enforces max 6 preferences
 * - Each value must be valid diet_pref_enum
 */
export const zUpdatePreferencesSchema = z.object({
  preferences: z
    .array(zDietPrefEnum)
    .max(6, "Maximum 6 dietary preferences allowed")
    .refine((prefs) => new Set(prefs).size === prefs.length, {
      message: "Duplicate preferences are not allowed",
    }),
});

export type UpdatePreferencesPayload = z.infer<typeof zUpdatePreferencesSchema>;
