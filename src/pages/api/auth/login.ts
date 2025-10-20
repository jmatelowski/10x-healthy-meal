import type { APIRoute } from "astro";
import { zLoginCommand } from "@/lib/validation/auth.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = zLoginCommand.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, password } = validationResult.data;

    // Attempt to sign in with Supabase
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      return new Response(
        JSON.stringify({
          error: "invalid_credentials",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Success - session cookies are automatically set by SSR client
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
    console.error("Login error:", error);
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
