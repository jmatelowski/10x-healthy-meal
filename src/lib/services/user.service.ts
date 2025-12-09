import type { SupabaseClient } from "@/db/supabase.client";

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
