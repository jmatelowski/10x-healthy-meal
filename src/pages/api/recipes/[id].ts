import type { APIRoute } from "astro";
import type { RecipeDto } from "@/types";
import { zRecipePathParams } from "@/lib/validation/recipe.schema";
import { RecipesService } from "@/lib/services/recipes.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  // User is guaranteed to exist due to middleware auth check
  if (!locals.user) {
    throw new Error("User should be authenticated at this point");
  }

  // ----- Path parameter validation -----
  const parsed = zRecipePathParams.safeParse(params);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid recipe id",
        details: parsed.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { id: recipeId } = parsed.data;
  const userId = locals.user.id;

  // ----- Service call -----
  const recipesService = new RecipesService(locals.supabase);

  try {
    const recipe: RecipeDto = await recipesService.getRecipe(userId, recipeId);

    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/recipes/[id] error:", error);

    // Handle specific error cases
    if (error instanceof Error && error.message === "Recipe not found") {
      return new Response(
        JSON.stringify({
          error: "Recipe not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic server error
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
