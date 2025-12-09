import type { APIRoute } from "astro";
import { zRegisterCommand } from "@/lib/validation/auth.schema";
import { UserService } from "@/lib/services/user.service";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = zRegisterCommand.safeParse(body);

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

    // Attempt to sign up with Supabase (auto-login enabled for MVP)
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        // Skip email confirmation for MVP - auto-login
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      let errorMessage = "A server error occurred. Please try again.";

      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        errorMessage = "Account already exists.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
        }),
        {
          status: error.message.includes("already") ? 409 : 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if user was created and session established (auto-login)
    if (data.user && data.session) {
      const userId = data.user.id;
      const userEmail = data.user.email;
      // Fetch diet preferences (should be empty on new signup)

      const userService = new UserService(locals.supabase);
      const dietPreferences = await userService.getDietPreferences(userId);

      // Success - return enriched login response
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
    } else {
      // This shouldn't happen with auto-login, but handle gracefully
      return new Response(
        JSON.stringify({
          status: "ok",
          message: "Account created successfully. Please check your email to verify your account.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({
        error: "A server error occurred. Please try again.",
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
