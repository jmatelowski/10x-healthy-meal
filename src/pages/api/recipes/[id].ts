import type { APIRoute } from "astro";
import type { RecipeDto } from "@/types";
import { zRecipePathParams, zUpdateRecipeSchema } from "@/lib/validation/recipe.schema";
import { RecipesService } from "@/lib/services/recipes.service";
import { zDeleteRecipeParamsSchema } from "@/lib/validation/recipe.schema";
import { ValidationError, BadRequestError } from "@/lib/errors";
import { errorToApiResponse, generateRequestId } from "@/lib/utils/error-response";

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

// Error handling is now centralized in error-response.ts utility

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const requestId = generateRequestId();

  try {
    // ----- Authentication check -----
    if (!locals.user) {
      throw new Error("User should be authenticated at this point");
    }

    const userId = locals.user.id;

    // ----- Path parameter validation -----
    const pathParsed = zRecipePathParams.safeParse(params);
    if (!pathParsed.success) {
      return errorToApiResponse(new ValidationError("Invalid recipe ID format"));
    }

    const { id: recipeId } = pathParsed.data;

    // ----- Content-Type validation -----
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return errorToApiResponse(new BadRequestError("Content-Type must be application/json"));
    }

    // ----- Request body size check (basic DoS protection) -----
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50000) {
      // 50KB limit
      return errorToApiResponse(new BadRequestError("Request body too large"));
    }

    // ----- Request body validation -----
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return errorToApiResponse(new BadRequestError("Invalid JSON in request body"));
    }

    // Prevent mass assignment by checking for unexpected properties
    const allowedKeys = new Set(["title", "content"]);
    const bodyKeys = Object.keys(requestBody);
    const unexpectedKeys = bodyKeys.filter((key) => !allowedKeys.has(key));

    if (unexpectedKeys.length > 0) {
      return errorToApiResponse(new BadRequestError(`Unexpected properties: ${unexpectedKeys.join(", ")}`));
    }

    const bodyParsed = zUpdateRecipeSchema.safeParse(requestBody);
    if (!bodyParsed.success) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: bodyParsed.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const updateCommand = bodyParsed.data;

    // ----- Service call -----
    const recipesService = new RecipesService(locals.supabase);

    const updatedRecipe: RecipeDto = await recipesService.updateRecipe({
      userId,
      recipeId,
      command: updateCommand,
    });

    return new Response(JSON.stringify(updatedRecipe), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    // Add request ID to server errors for traceability
    if (error instanceof Error && !error.name.includes("Error")) {
      const serverError = new Error(error.message);
      serverError.name = "InternalServerError";
      (serverError as Error & { requestId?: string }).requestId = requestId;
      return errorToApiResponse(serverError);
    }
    return errorToApiResponse(error);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    throw new Error("User should be authenticated at this point");
  }
  const parsed = zDeleteRecipeParamsSchema.safeParse(params);
  if (!parsed.success) {
    return errorToApiResponse(new ValidationError("Invalid recipe id"));
  }
  const { id } = parsed.data;
  const userId = locals.user.id;
  const recipesService = new RecipesService(locals.supabase);
  try {
    await recipesService.deleteRecipe({ id, userId });
    return new Response(JSON.stringify({ message: "Recipe deleted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("DELETE /api/recipes/[id] error:", err);
    return errorToApiResponse(err);
  }
};
