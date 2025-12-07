import { z } from "zod";
import type { RecipeSortField, SortDirection } from "@/types";

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

/**
 * Zod schema for recipe draft validation (client-side)
 * - mirrors backend constraints
 * - used for real-time validation in forms
 */
export const zRecipeDraft = z.object({
  title: z.string().min(1, "Title is required").max(50, "Title must be ≤ 50 characters"),
  content: z.string().min(1, "Content is required").max(10_000, "Content must be ≤ 10 000 characters"),
});

export type RecipeDraft = z.infer<typeof zRecipeDraft>;

// Valid sort fields and directions for validation
const VALID_SORT_FIELDS: RecipeSortField[] = ["updated_at", "created_at", "title"];
const VALID_SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

/**
 * Zod schema for GET /recipes query parameters
 * - validates pagination and sorting parameters
 * - enforces safe defaults and limits
 */
export const zRecipesQueryParams = z.object({
  page: z.coerce.number().int().min(1, "Page must be ≥ 1").default(1),
  page_size: z.coerce.number().int().min(1, "Page size must be ≥ 1").max(100, "Page size must be ≤ 100").default(20),
  sort: z
    .string()
    .regex(
      /^(updated_at|created_at|title)\s+(asc|desc)$/,
      "Sort must be '<field> <direction>' where field is updated_at|created_at|title and direction is asc|desc"
    )
    .default("updated_at desc")
    .refine((value) => {
      const [field, direction] = value.split(" ");
      return (
        VALID_SORT_FIELDS.includes(field as RecipeSortField) &&
        VALID_SORT_DIRECTIONS.includes(direction as SortDirection)
      );
    }, "Invalid sort field or direction"),
});

export type RecipesQueryParamsDTO = z.infer<typeof zRecipesQueryParams>;

/**
 * Zod schema for GET /recipes/{id} path parameters
 * - validates UUID format for recipe ID
 */
export const zRecipePathParams = z.object({
  id: z.string().uuid("Invalid recipe ID format"),
});

export type RecipePathParams = z.infer<typeof zRecipePathParams>;

/**
 * Zod schema for DELETE /recipes/{id} path parameters
 * - validates UUID format for recipe ID
 */
export const zDeleteRecipeParamsSchema = z.object({
  id: z.string().uuid("Invalid recipe id"),
});

export type DeleteRecipeParams = z.infer<typeof zDeleteRecipeParamsSchema>;
