import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

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

  // Skip middleware logic for API routes - they handle auth individually
  if (pathname.startsWith("/api/")) {
    return next();
  }

  // Define public routes that don't require authentication (whitelist approach)
  const publicRoutes = ["/auth/login", "/auth/register", "/auth/reset-password", "/auth/update-password"];

  // Handle public routes - redirect if already logged in
  if (publicRoutes.includes(pathname)) {
    if (user) {
      const redirect = context.url.searchParams.get("redirect") || "/";
      return context.redirect(redirect);
    }
    return next();
  }

  // All other routes are protected by default - redirect if not logged in
  if (!user) {
    const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
    return context.redirect(redirectUrl);
  }

  return next();
});
