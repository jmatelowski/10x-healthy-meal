import type { SupabaseClient } from "@/db/supabase.client";
import type { UserProfileDto, DietPref } from "@/types";
import { NotFoundError } from "@/lib/errors";

export class UserService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Fetches the user profile including email and dietary preferences.
   * Returns null if user not found in auth.users.
   * Throws on database errors.
   *
   * @param userId - The authenticated user's ID
   * @returns UserProfileDto or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    // Fetch user from auth.users table
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError) {
      throw new Error(`Failed to fetch user: ${authError.message}`);
    }

    if (!user || user.id !== userId) {
      return null;
    }

    // Fetch dietary preferences from user_diet_preferences table
    const { data: preferencesData, error: preferencesError } = await this.supabase
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
   * Replaces the complete set of dietary preferences for a user.
   * This operation is idempotent - the final state equals the provided list.
   *
   * Implementation uses a transaction pattern:
   * 1. Delete all existing preferences for the user
   * 2. Insert new preferences in bulk
   *
   * @param userId - The authenticated user's ID
   * @param preferences - Array of diet preferences (≤6)
   * @throws Error with statusCode property for specific HTTP responses
   */
  async replaceUserDietPrefs(userId: string, preferences: DietPref[]): Promise<void> {
    // First, verify the user exists in auth
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      const err = Object.assign(new Error("User not found"), { statusCode: 404 });
      throw err;
    }

    // Step 1: Delete all existing preferences for this user
    const { error: deleteError } = await this.supabase.from("user_diet_preferences").delete().eq("user_id", userId);

    if (deleteError) {
      throw new Error(`Failed to delete existing preferences: ${deleteError.message}`);
    }

    // Step 2: Insert new preferences if any provided
    if (preferences.length > 0) {
      const rows = preferences.map((pref) => ({
        user_id: userId,
        diet_pref: pref,
      }));

      const { error: insertError } = await this.supabase.from("user_diet_preferences").insert(rows);

      if (insertError) {
        throw new Error(`Failed to insert new preferences: ${insertError.message}`);
      }
    }
  }

  /**
   * Permanently deletes the authenticated user via Supabase Admin API.
   * This cascades all user-owned data via Postgres ON DELETE CASCADE.
   * Throws error on failure, or NotFoundError if user was already deleted.
   *
   * @param admin - Supabase client with admin privileges
   * @param userId - The user's ID to delete
   */
  async deleteUserAccount({ admin, userId }: { admin: SupabaseClient; userId: string }): Promise<void> {
    // Call Supabase Admin API to delete user from auth.users
    const { error: adminDeleteError } = await admin.auth.admin.deleteUser(userId);

    if (adminDeleteError && adminDeleteError.status === 404) {
      // User not found: treat as already deleted
      throw new NotFoundError("User not found");
    }

    if (adminDeleteError) {
      throw new Error("Failed to delete user (admin)");
    }
  }
}
