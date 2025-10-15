import { z } from "zod";

/**
 * Zod schema for POST /generations payload
 * - trims strings
 * - Enforces length limits
 */
export const zCreateGeneration = z.object({
  title: z.string().trim().min(1, "Title is required").max(50, "Title must be ≤ 50 characters"),
  content: z.string().trim().min(1, "Content is required").max(10_000, "Content must be ≤ 10 000 characters"),
});

export type CreateGenerationCommand = z.infer<typeof zCreateGeneration>;
