import { defineMiddleware } from "astro:middleware";
import type { APIContext, MiddlewareNext } from "astro";

import { createSupabaseServerInstance } from "../db/supabase.client";

const apiMiddleware = async (context: APIContext, next: MiddlewareNext) => {
  const pathname = context.url.pathname;
  const user = context.locals.user;

  // Public API routes that don't require authentication
  const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

  // Skip authentication check for public API routes
  if (publicApiRoutes.includes(pathname)) {
    return next();
  }

  // All other API routes require authentication
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return next();
};

const pageMiddleware = async (context: APIContext, next: MiddlewareNext) => {
  const pathname = context.url.pathname;
  const user = context.locals.user;

  const publicRoutes = ["/auth/login", "/auth/register", "/auth/reset-password", "/auth/update-password"];

  if (publicRoutes.includes(pathname)) {
    if (user) {
      const redirect = context.url.searchParams.get("redirect") || "/";
      return context.redirect(redirect);
    }
    return next();
  }

  if (!user) {
    const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
    return context.redirect(redirectUrl);
  }

  return next();
};

export const onRequest = defineMiddleware(async (context, next) => {
  // Create SSR-compatible Supabase client with cookie management
  context.locals.supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Get authenticated user session
  const {
    data: { user },
  } = await context.locals.supabase.auth.getUser();

  // Set user in locals for use in pages and API routes
  context.locals.user = user;

  const pathname = context.url.pathname;

  if (pathname.startsWith("/api/")) {
    return apiMiddleware(context, next);
  } else {
    return pageMiddleware(context, next);
  }
});
