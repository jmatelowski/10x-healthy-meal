import { createHash } from "crypto";

import { DEFAULT_USER_ID, type SupabaseClient } from "@/db/supabase.client";
import { generateRecipeProposal } from "./ai.adapter";
import type { CreateGenerationCommand, GenerationCreationResponseDto } from "@/types";
import type { Database } from "@/db/database.types";

export class GenerationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async generateRecipe(cmd: CreateGenerationCommand): Promise<GenerationCreationResponseDto> {
    const startedAt = Date.now();

    const title = cmd.title.trim();
    const content = cmd.content.trim();

    const proposal = await generateRecipeProposal(title, content);

    // ----- Hashes & lengths -----
    const source_title_hash = GenerationService.sha256Hex(title);
    const source_text_hash = GenerationService.sha256Hex(content);

    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: DEFAULT_USER_ID,
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
        user_id: DEFAULT_USER_ID,
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

  private static sha256Hex(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  private static async logError(
    supabase: SupabaseClient,
    payload: Database["public"]["Tables"]["generation_error_logs"]["Insert"]
  ) {
    await supabase.from("generation_error_logs").insert(payload);
  }
}
