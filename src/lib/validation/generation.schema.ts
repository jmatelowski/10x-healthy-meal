import { z } from "zod";
import { zCreateRecipeSchema } from "./recipe.schema";

/**
 * Zod schema for POST /generations payload
 * - trims strings
 * - Enforces length limits
 */
export const zCreateGeneration = z.object({
  title: z.string().trim().min(1, "Title is required").max(50, "Title must be ≤ 50 characters"),
  content: z.string().trim().min(1, "Content is required").max(10_000, "Content must be ≤ 10 000 characters"),
});

/**
 * Zod schema for generation ID path parameter validation
 */
export const zGenerationIdParam = z.string().uuid("Invalid generation id");

/**
 * Zod schema for POST /generations/{id}/accept payload
 * - reuses recipe validation constraints
 */
export const zAcceptGeneration = zCreateRecipeSchema;

export type CreateGenerationCommand = z.infer<typeof zCreateGeneration>;
export type AcceptGenerationCommand = z.infer<typeof zAcceptGeneration>;
