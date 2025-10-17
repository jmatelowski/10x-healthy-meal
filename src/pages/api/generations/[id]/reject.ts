import type { APIRoute } from "astro";
import { zGenerationIdParam } from "@/lib/validation/generation.schema";
import { GenerationService } from "@/lib/services/generation.service";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  // ----- Authentication check -----
  if (!locals.supabase) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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

  // ----- Service call -----
  try {
    const service = new GenerationService(locals.supabase);
    await service.rejectGeneration(generationId);

    // Return 204 No Content for successful rejection
    return new Response(null, {
      status: 204,
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
          console.error("Reject generation error:", { generationId, error });
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    // Fallback for unexpected error types

    console.error("Unexpected reject generation error:", { generationId, error });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
