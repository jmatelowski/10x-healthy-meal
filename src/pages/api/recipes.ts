import type { APIRoute } from "astro";
import type { RecipeCreationResponseDto, RecipeListResponseDto, RecipeSortField, SortDirection } from "@/types";
import { zCreateRecipeSchema, zRecipesQueryParams } from "@/lib/validation/recipe.schema";
import { RecipesService } from "@/lib/services/recipes.service";
import { DEFAULT_USER_ID } from "@/db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const recipesService = new RecipesService(locals.supabase);

  // ----- Validation -----
  const payload = await request.json();
  const parsed = zCreateRecipeSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.issues }), {
      status: 400,
    });
  }

  // ----- Service call -----
  try {
    const recipe = await recipesService.createManualRecipe(parsed.data.title, parsed.data.content);

    const body: RecipeCreationResponseDto = {
      id: recipe.id,
      status: "accepted",
      recipe: {
        title: recipe.title,
        content: recipe.content,
      },
    };

    return new Response(JSON.stringify(body), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const GET: APIRoute = async ({ url, locals }) => {
  const recipesService = new RecipesService(locals.supabase);

  // ----- Parse and validate query parameters -----
  const queryParams = Object.fromEntries(url.searchParams);
  const parsed = zRecipesQueryParams.safeParse(queryParams);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: parsed.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { page, page_size, sort } = parsed.data;

  // Parse sort parameter
  const [sortField, sortDir] = sort.split(" ") as [RecipeSortField, SortDirection];

  // ----- Get user ID (placeholder for now) -----
  // TODO: Replace with actual user authentication when auth is implemented
  const userId = DEFAULT_USER_ID;

  // ----- Service call -----
  try {
    const { items, total } = await recipesService.listRecipes({
      userId,
      page,
      pageSize: page_size,
      sortField,
      sortDir,
    });

    const response: RecipeListResponseDto = {
      data: items,
      pagination: {
        page,
        page_size,
        total,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/recipes error:", error);

    return new Response(
      JSON.stringify({
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
