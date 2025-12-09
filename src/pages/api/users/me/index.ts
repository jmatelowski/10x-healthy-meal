import type { APIRoute } from "astro";
import { deleteUserAccount } from "@/lib/services/user.service";
export const prerender = false;

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
