import type { Tables, Enums } from "./db/database.types";

// ------------------------------------
// Enums re-export for convenience
// ------------------------------------
export type DietPref = Enums<"diet_pref_enum">;
export type GenerationStatus = Enums<"generation_status_enum">;

// ------------------------------------
// Shared helper types
// ------------------------------------
export interface PaginationMetaDto {
  page: number;
  page_size: number;
  total: number;
}

// ------------------------------------
// User DTOs & Commands
// ------------------------------------
export interface UserProfileDto {
  id: string;
  email: string;
  preferences: DietPref[];
  created_at: string; // ISO8601
}

export interface UpdatePreferencesCommand {
  /** Full replacement array, ≤6 values */
  preferences: DietPref[];
}

// ------------------------------------
// Recipe DTOs & Commands
// ------------------------------------

// DB base type for convenience
export type RecipeRow = Tables<"recipes">;

export type RecipeSource = "manual" | "ai";

// Base recipe type for UI components
export interface RecipeBase {
  title: string;
  content: string;
}

export interface RecipeDto {
  id: RecipeRow["id"];
  title: RecipeRow["title"];
  content: RecipeRow["content"];
  source: RecipeSource;
  created_at: RecipeRow["created_at"];
  updated_at: RecipeRow["updated_at"];
}

// Slimmer list item version
export type RecipeListItemDto = Pick<RecipeDto, "id" | "title" | "source" | "created_at" | "updated_at">;

export interface RecipeListResponseDto {
  data: RecipeListItemDto[];
  pagination: PaginationMetaDto;
}

export interface RecipesQueryParams {
  page?: number;
  page_size?: number;
  sort?: string; // e.g. "updated_at desc"
}

export interface CreateRecipeCommand {
  title: RecipeRow["title"];
  content: RecipeRow["content"];
}

export interface UpdateRecipeCommand {
  title?: RecipeRow["title"];
  content?: RecipeRow["content"];
}

// ------------------------------------
// Responses
// ------------------------------------

export interface RecipeCreationResponseDto {
  id: string;
  status: "accepted";
  recipe: {
    title: string;
    content: string;
  };
}

// ------------------------------------
// Generation DTOs & Commands
// ------------------------------------

export type GenerationRow = Tables<"generations">;

export interface GenerationDto {
  id: GenerationRow["id"];
  status: GenerationStatus | null; // pending = null
  model: GenerationRow["model"];
  duration: GenerationRow["generation_duration"];
  ai_recipe?: {
    title: string;
    content: string;
  };
  accepted_recipe_id: GenerationRow["accepted_recipe_id"];
  created_at: GenerationRow["created_at"];
  updated_at: GenerationRow["updated_at"];
}

export interface AcceptGenerationResponseDto {
  recipe_id: string;
  message: string;
}

export interface GenerationCreationResponseDto {
  id: string;
  status: null;
  recipe_proposal: {
    title: string;
    content: string;
  };
}

/**
 * Command payload accepted by POST /generations endpoint
 */
export interface CreateGenerationCommand {
  title: string;
  content: string;
}

// ------------------------------------
// Admin DTOs
// ------------------------------------
export type GenerationErrorLogRow = Tables<"generation_error_logs">;

export type GenerationErrorLogDto = GenerationErrorLogRow;

export interface GenerationErrorLogListResponseDto {
  data: GenerationErrorLogDto[];
  pagination: PaginationMetaDto;
}

// ------------------------------------
// View Model Types for Recipe Create
// ------------------------------------

/**
 * View model for recipe draft form state
 */
export interface RecipeDraftViewModel {
  title: string;
  content: string;
  errors: {
    title?: string[];
    content?: string[];
  };
  touched: {
    title: boolean;
    content: boolean;
  };
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * State for AI Review modal
 */
export interface AiReviewState {
  open: boolean;
  generationId: string | null;
  proposal: RecipeBase | null;
  errorMessage?: string;
}
