import type { SupabaseClient } from "@/db/supabase.client";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { RecipeListItemDto, RecipeSource, ListRecipesParams } from "@/types";

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

  /**
   * Retrieves a paginated list of recipes for a specific user
   * @param params - Query parameters including userId, pagination, and sorting
   * @returns Promise with recipe items and total count
   */
  async listRecipes({
    userId,
    page = 1,
    pageSize = 20,
    sortField = "updated_at",
    sortDir = "desc",
  }: ListRecipesParams): Promise<{ items: RecipeListItemDto[]; total: number }> {
    const offset = (page - 1) * pageSize;

    // Execute data and count queries in parallel
    const [dataResult, countResult] = await Promise.all([
      // Get paginated recipe data
      this.supabase
        .from("recipes")
        .select("id, title, source, created_at, updated_at")
        .eq("user_id", userId)
        .order(sortField, { ascending: sortDir === "asc" })
        .range(offset, offset + pageSize - 1),

      // Get total count
      this.supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    if (dataResult.error) {
      throw new Error(`Failed to fetch recipes: ${dataResult.error.message}`);
    }

    if (countResult.error) {
      throw new Error(`Failed to fetch recipe count: ${countResult.error.message}`);
    }

    const items: RecipeListItemDto[] = (dataResult.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      source: row.source as RecipeSource,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const total = countResult.count || 0;

    return { items, total };
  }
}
