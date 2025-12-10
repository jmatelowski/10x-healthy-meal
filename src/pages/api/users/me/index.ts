import type { APIRoute } from "astro";
import { deleteUserAccount, getUserProfile } from "@/lib/services/user.service";

export const prerender = false;

/**
 * GET /api/users/me
 * Returns the authenticated user's profile including dietary preferences.
 *
 * @returns 200 with UserProfileDto
 * @returns 401 if user not authenticated (handled by middleware)
 * @returns 404 if user not found in database
 * @returns 500 on server error
 */
export const GET: APIRoute = async ({ locals }) => {
  // Middleware guarantees user exists for non-public API routes
  // Double-check for type safety
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const profile = await getUserProfile(locals.supabase, locals.user.id);

    if (!profile) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Log error for debugging
    console.error("GET /api/users/me failed:", err);

    return new Response(JSON.stringify({ error: "internal_server_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/users/me
 * Permanently deletes the authenticated user and all associated data.
 *
 * @returns 204 on successful deletion
 * @returns 401 if user not authenticated
 * @returns 404 if user not found
 * @returns 500 on server error
 */
export const DELETE: APIRoute = async ({ locals }) => {
  const { user } = locals;
  // We'll handle admin client instantiation below to avoid passing it via locals
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    // Import admin client helper here so secret never traverses locals
    const { getSupabaseAdminClient } = await import("@/db/supabase.service");
    await deleteUserAccount({
      admin: getSupabaseAdminClient(),
      userId: user.id,
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err && err.statusCode === 404) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
