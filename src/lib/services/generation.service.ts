import type { SupabaseClient } from "@/db/supabase.client";
import { generateRecipeProposal } from "./ai.adapter";
import type { CreateGenerationCommand, GenerationCreationResponseDto } from "@/types";
import type { Database } from "@/db/database.types";
import { UserService } from "./user.service";

export class GenerationService {
  private readonly userService: UserService;

  constructor(private readonly supabase: SupabaseClient) {
    this.userService = new UserService(supabase);
  }

  async generateRecipe(userId: string, cmd: CreateGenerationCommand): Promise<GenerationCreationResponseDto> {
    const startedAt = Date.now();

    const title = cmd.title.trim();
    const content = cmd.content.trim();

    const preferences = await this.userService.getUserDietPreferences(userId);
    const proposal = await generateRecipeProposal(title, content, preferences.join(", "));

    // ----- Hashes & lengths -----
    const source_title_hash = await GenerationService.sha256Hex(title);
    const source_text_hash = await GenerationService.sha256Hex(content);

    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: userId,
        model: proposal.model,
        source_title_hash,
        source_title_length: title.length,
        source_text_hash,
        source_text_length: content.length,
        generation_duration: Date.now() - startedAt,
        status: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      await GenerationService.logError(this.supabase, {
        user_id: userId,
        model: proposal.model,
        source_title_hash,
        source_title_length: title.length,
        source_text_hash,
        error_code: error?.code || "insert_error",
        error_message: error?.message || "Unknown error during generation insert",
      });
      throw new Error("Database insert failed");
    }

    return {
      id: data.id,
      status: null,
      recipe_proposal: {
        title: proposal.title,
        content: proposal.content,
      },
    };
  }

  /**
   * Accepts a generation and creates a recipe atomically
   * @param generationId UUID of the generation to accept
   * @param recipeData Recipe data (title and content) to save
   * @returns Promise with the created recipe ID
   * @throws Error with specific codes for 404/409/500 scenarios
   */
  async acceptGeneration(
    userId: string,
    generationId: string,
    recipeData: { title: string; content: string }
  ): Promise<{ recipe_id: string }> {
    try {
      const { data, error } = await this.supabase.rpc("accept_generation", {
        p_user_id: userId,
        p_generation_id: generationId,
        p_title: recipeData.title,
        p_content: recipeData.content,
      });

      if (error) {
        // Map PostgreSQL error codes to HTTP status codes
        if (error.code === "02000") {
          // No data found - generation not found or not owned
          throw new Error("GENERATION_NOT_FOUND");
        }
        if (error.code === "23505") {
          // Unique violation - generation already processed
          throw new Error("GENERATION_ALREADY_PROCESSED");
        }
        // Other database errors
        console.error("Accept generation RPC error:", error);
        throw new Error("DATABASE_ERROR");
      }

      if (!data) {
        throw new Error("DATABASE_ERROR");
      }

      return { recipe_id: data };
    } catch (error) {
      // Re-throw known errors, wrap unknown ones
      if (
        error instanceof Error &&
        ["GENERATION_NOT_FOUND", "GENERATION_ALREADY_PROCESSED", "DATABASE_ERROR"].includes(error.message)
      ) {
        throw error;
      }
      console.error("Unexpected error in acceptGeneration:", error);
      throw new Error("DATABASE_ERROR");
    }
  }

  /**
   * Rejects a generation by updating its status
   * @param generationId UUID of the generation to reject
   * @throws Error with specific codes for 404/409/500 scenarios
   */
  async rejectGeneration(userId: string, generationId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc("reject_generation", {
        p_user_id: userId,
        p_generation_id: generationId,
      });

      if (error) {
        // Map PostgreSQL error codes to HTTP status codes
        if (error.code === "02000") {
          // No data found - generation not found or not owned
          throw new Error("GENERATION_NOT_FOUND");
        }
        if (error.code === "23505") {
          // Unique violation - generation already processed
          throw new Error("GENERATION_ALREADY_PROCESSED");
        }
        // Other database errors
        console.error("Reject generation RPC error:", error);
        throw new Error("DATABASE_ERROR");
      }
    } catch (error) {
      // Re-throw known errors, wrap unknown ones
      if (
        error instanceof Error &&
        ["GENERATION_NOT_FOUND", "GENERATION_ALREADY_PROCESSED", "DATABASE_ERROR"].includes(error.message)
      ) {
        throw error;
      }
      console.error("Unexpected error in rejectGeneration:", error);
      throw new Error("DATABASE_ERROR");
    }
  }

  private static async sha256Hex(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private static async logError(
    supabase: SupabaseClient,
    payload: Database["public"]["Tables"]["generation_error_logs"]["Insert"]
  ) {
    await supabase.from("generation_error_logs").insert(payload);
  }
}
