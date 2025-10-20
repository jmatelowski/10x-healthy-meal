import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Sign out using Supabase auth - clears session cookies
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Success - session cookies are automatically cleared by SSR client
    return new Response(
      JSON.stringify({
        status: "ok",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
