import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
} from "@/lib/errors";

/**
 * Centralized error response helper for API routes
 * Maps custom error classes to appropriate HTTP responses
 */
export function errorToApiResponse(error: unknown): Response {
  const headers = { "Content-Type": "application/json" };

  // Handle custom error classes
  if (error instanceof NotFoundError) {
    return new Response(JSON.stringify({ message: error.message }), { status: 404, headers });
  }

  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({ message: error.message }), { status: 400, headers });
  }

  if (error instanceof BadRequestError) {
    return new Response(JSON.stringify({ message: error.message }), { status: 400, headers });
  }

  if (error instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ message: error.message }), { status: 401, headers });
  }

  if (error instanceof ForbiddenError) {
    return new Response(JSON.stringify({ message: error.message }), { status: 403, headers });
  }

  if (error instanceof InternalServerError) {
    const response: { message: string; requestId?: string } = {
      message: error.message,
    };

    if (error.requestId) {
      response.requestId = error.requestId;
    }

    return new Response(JSON.stringify(response), { status: 500, headers });
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    // Check for specific error messages that indicate auth issues
    if (error.message === "Unauthorized" || error.message.includes("not authenticated")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers });
    }

    // Check for database constraint violations or similar
    if (error.message.includes("violates") || error.message.includes("constraint")) {
      return new Response(JSON.stringify({ message: "Invalid request data" }), { status: 400, headers });
    }
  }

  // Generic server error fallback
  console.error("Unhandled API error:", error);

  return new Response(
    JSON.stringify({
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && {
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    }),
    { status: 500, headers }
  );
}

/**
 * Generate a unique request ID for error tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
