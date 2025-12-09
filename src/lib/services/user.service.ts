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
