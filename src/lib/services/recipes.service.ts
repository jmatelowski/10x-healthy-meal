import type { SupabaseClient } from "@/db/supabase.client";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";

export class RecipesService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createManualRecipe(
    title: string,
    content: string
  ): Promise<Pick<Tables<"recipes">, "id" | "title" | "content">> {
    const { data, error } = await this.supabase
      .from("recipes")
      .insert({ user_id: DEFAULT_USER_ID, title, content, source: "manual" })
      .select("id, title, content")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to insert recipe");
    }

    return data;
  }
}
