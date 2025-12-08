import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { RecipeListItemDto, RecipeSource, ListRecipesParams, RecipeDto } from "@/types";
import { NotFoundError } from "@/lib/errors";

export class RecipesService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createManualRecipe(
    userId: string,
    title: string,
    content: string
  ): Promise<Pick<Tables<"recipes">, "id" | "title" | "content">> {
    const { data, error } = await this.supabase
      .from("recipes")
      .insert({ user_id: userId, title, content, source: "manual" })
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

  /**
   * Retrieves a single recipe by ID for a specific user
   * @param userId - The user ID who owns the recipe
   * @param recipeId - The UUID of the recipe to retrieve
   * @returns Promise with the recipe data
   * @throws Error if recipe not found or database error occurs
   */
  async getRecipe(userId: string, recipeId: string): Promise<RecipeDto> {
    const { data, error } = await this.supabase
      .from("recipes")
      .select("id, title, content, source, created_at, updated_at")
      .eq("id", recipeId)
      .eq("user_id", userId) // IDOR prevention - only user's own recipes
      .single();

    if (error) {
      throw new Error(`Failed to fetch recipe: ${error.message}`);
    }

    if (!data) {
      throw new Error("Recipe not found");
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      source: data.source as RecipeSource,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Deletes a single recipe by ID for a specific user.
   * Throws NotFoundError if the recipe does not exist or does not belong to the user.
   */
  async deleteRecipe({ id, userId }: { id: string; userId: string }) {
    const { error, count } = await this.supabase
      .from("recipes")
      .delete({ count: "exact" })
      .match({ id, user_id: userId });

    if (error) throw error;
    if (!count) throw new NotFoundError("Recipe not found");
    // Return void on success
  }
}
