import type { APIRoute } from "astro";
import { zLoginCommand } from "@/lib/validation/auth.schema";
import { UserService } from "@/lib/services/user.service";

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
    const { data: sessionData, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !sessionData || !sessionData.user) {
      // Map Supabase errors to user-friendly messages
      return new Response(
        JSON.stringify({
          error: "Invalid email or password.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const userId = sessionData.user.id;
    const userEmail = sessionData.user.email;

    // Fetch diet preferences from user_diet_preferences
    const userService = new UserService(locals.supabase);
    const dietPreferences = await userService.getDietPreferences(userId);

    // Success, return enriched profile
    return new Response(
      JSON.stringify({
        id: userId,
        email: userEmail,
        dietPreferences: dietPreferences || [],
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
