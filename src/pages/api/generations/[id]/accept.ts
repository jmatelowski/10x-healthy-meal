import type { APIRoute } from "astro";
import type { AcceptGenerationResponseDto } from "@/types";
import { zGenerationIdParam, zAcceptGeneration } from "@/lib/validation/generation.schema";
import { GenerationService } from "@/lib/services/generation.service";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals, request }) => {
  // User is guaranteed to exist due to middleware auth check
  if (!locals.user) {
    throw new Error("User should be authenticated at this point");
  }

  // ----- Path parameter validation -----
  const idValidation = zGenerationIdParam.safeParse(params.id);
  if (!idValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: idValidation.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const generationId = idValidation.data;

  // ----- Request body validation -----
  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyValidation = zAcceptGeneration.safeParse(requestBody);
  if (!bodyValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: bodyValidation.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const recipeData = bodyValidation.data;

  // ----- Service call -----
  try {
    const service = new GenerationService(locals.supabase);
    const result = await service.acceptGeneration(locals.user.id, generationId, recipeData);

    const response: AcceptGenerationResponseDto = {
      recipe_id: result.recipe_id,
      message: "AI recipe saved",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Map service errors to HTTP status codes
    if (error instanceof Error) {
      switch (error.message) {
        case "GENERATION_NOT_FOUND":
          return new Response(JSON.stringify({ error: "Generation not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        case "GENERATION_ALREADY_PROCESSED":
          return new Response(JSON.stringify({ error: "Generation already processed" }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        case "DATABASE_ERROR":
        default:
          console.error("Accept generation error:", { generationId, error });
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    // Fallback for unexpected error types

    console.error("Unexpected accept generation error:", { generationId, error });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
