import type { SupabaseClient } from "@/db/supabase.client";
import type { UserProfileDto, DietPref } from "@/types";

export class UserService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Returns user's diet preferences as a string array.
   * Throws if underlying Supabase operation fails.
   */
  async getDietPreferences(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase.from("user_diet_preferences").select("diet_pref").eq("user_id", userId);
    if (error) {
      throw new Error(`Could not fetch user diet preferences: ${error.message}`);
    }
    return Array.isArray(data) ? data.map((row) => row.diet_pref) : [];
  }
}

/**
 * Fetches the user profile including email and dietary preferences.
 * Returns null if user not found in auth.users.
 * Throws on database errors.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's ID
 * @returns UserProfileDto or null if not found
 */
export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfileDto | null> {
  // Fetch user from auth.users table
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Failed to fetch user: ${authError.message}`);
  }

  if (!user || user.id !== userId) {
    return null;
  }

  // Fetch dietary preferences from user_diet_preferences table
  const { data: preferencesData, error: preferencesError } = await supabase
    .from("user_diet_preferences")
    .select("diet_pref")
    .eq("user_id", userId);

  if (preferencesError) {
    throw new Error(`Failed to fetch preferences: ${preferencesError.message}`);
  }

  // Map to DietPref array
  const preferences: DietPref[] = Array.isArray(preferencesData)
    ? preferencesData.map((row) => row.diet_pref as DietPref)
    : [];

  // Construct and return UserProfileDto
  return {
    id: user.id,
    email: user.email || "",
    preferences,
    created_at: user.created_at,
  };
}

/**
 * Permanently deletes the authenticated user via Supabase Admin API.
 * This cascades all user-owned data via Postgres ON DELETE CASCADE.
 * Throws error on failure, or {statusCode: 404} if user was already deleted.
 */
export async function deleteUserAccount({ admin, userId }: { admin: SupabaseClient; userId: string }): Promise<void> {
  // Call Supabase Admin API to delete user from auth.users
  const { error: adminDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (adminDeleteError && adminDeleteError.status === 404) {
    // User not found: treat as already deleted (return 404 at API layer)
    const err = Object.assign(new Error("User not found"), { statusCode: 404 });

    throw err;
  }
  if (adminDeleteError) {
    throw new Error("Failed to delete user (admin)");
  }
}
