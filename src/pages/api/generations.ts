import type { APIRoute } from "astro";

export const prerender = false;

import { zCreateGeneration } from "@/lib/validation/generation.schema";
import { GenerationService } from "@/lib/services/generation.service";

export const POST: APIRoute = async ({ request, locals }) => {
  // User is guaranteed to exist due to middleware auth check
  if (!locals.user) {
    throw new Error("User should be authenticated at this point");
  }

  const body = await request.json();

  const parsed = zCreateGeneration.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.issues }), {
      status: 400,
    });
  }

  try {
    const service = new GenerationService(locals.supabase);
    const dto = await service.generateRecipe(locals.user.id, parsed.data);
    return new Response(JSON.stringify(dto), { status: 202 });
  } catch (err) {
    console.error("POST /generations failed", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
