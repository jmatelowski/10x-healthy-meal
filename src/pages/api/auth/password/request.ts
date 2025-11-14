import type { APIRoute } from "astro";
import { zResetRequestCommand } from "@/lib/validation/auth.schema";

export const prerender = false;

// Simple in-memory rate limiting for MVP
// In production, this should be moved to Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 5;

function getClientIP(request: Request): string {
  // Try to get real IP from headers (for reverse proxy setups)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback - this might not work in all deployment scenarios
  return "unknown";
}

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize rate limit data
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return false;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  // Increment counter
  clientData.count++;
  return false;
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "900", // 15 minutes in seconds
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = zResetRequestCommand.safeParse(body);

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

    const { email } = validationResult.data;

    const redirectTo = `/auth/update-password`;

    // Send password reset email via Supabase
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Anti-enumeration: Always return success regardless of whether email exists
    // Only log errors server-side for monitoring
    if (error) {
      console.error("Password reset error:", {
        email: email, // Safe to log for debugging
        error: error.message,
        timestamp: new Date().toISOString(),
        clientIP,
      });
    }

    // Always return success response for anti-enumeration
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
    console.error("Password reset request error:", error);

    // Always return success for anti-enumeration, but log the error
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
  }
};
