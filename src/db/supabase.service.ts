import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "astro:env/server";
import type { Database } from "./database.types";

// Returns a service-role Supabase client (admin bypasses RLS)
export function getSupabaseAdminClient() {
  const url = SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env is missing for admin client");
  }
  return createClient<Database>(url, serviceKey);
}
