import type { APIRoute } from "astro";
import { zPasswordUpdateCommand } from "@/lib/validation/auth.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = zPasswordUpdateCommand.safeParse(body);

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

    const { password } = validationResult.data;

    // Update user password via Supabase
    const { error } = await locals.supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Password update error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to update password. Please try again.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Success
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
    console.error("Password update request error:", error);
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
