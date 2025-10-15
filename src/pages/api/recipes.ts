import type { APIRoute } from "astro";
import type { RecipeCreationResponseDto } from "@/types";
import { zCreateRecipeSchema } from "@/lib/validation/recipe.schema";
import { RecipesService } from "@/lib/services/recipes.service";

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
    // eslint-disable-next-line no-console
    console.error(error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
