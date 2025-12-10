import type { APIRoute } from "astro";
import { UserService } from "@/lib/services/user.service";
import { zUpdatePreferencesSchema } from "@/lib/validation/user.schema";
import { ZodError } from "zod";
import { NotFoundError } from "@/lib/errors";

export const prerender = false;

/**
 * PUT /api/users/me/preferences
 * Replaces the authenticated user's complete set of dietary preferences.
 *
 * This endpoint is idempotent - the final state equals the provided list.
 * The operation atomically deletes existing preferences and inserts new ones.
 *
 * @returns 204 No Content on successful update
 * @returns 400 Bad Request if validation fails (invalid JSON, >6 prefs, unknown enum)
 * @returns 401 Unauthorized if user not authenticated
 * @returns 404 Not Found if user record missing
 * @returns 500 Internal Server Error on database failure
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  // Auth check - middleware should guarantee user exists for protected routes
  if (!locals.user) {
    throw new Error("User should be authenticated at this point");
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = zUpdatePreferencesSchema.parse(body);

    // Call service to replace preferences
    const userService = new UserService(locals.supabase);
    await userService.replaceUserDietPrefs(locals.user.id, validatedData.preferences);

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (err) {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle user not found errors
    if (err instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle JSON parse errors
    if (err instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return generic internal server error
    return new Response(JSON.stringify({ error: "internal_server_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
