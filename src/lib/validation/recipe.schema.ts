import { z } from "zod";

/**
 * Zod schema for POST /recipes payload
 * - trims strings
 * - enforces length limits
 */
export const zCreateRecipeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(50, "Title must be ≤ 50 characters"),
  content: z.string().trim().min(1, "Content is required").max(10_000, "Content must be ≤ 10 000 characters"),
});

export type CreateRecipeDTO = z.infer<typeof zCreateRecipeSchema>;
