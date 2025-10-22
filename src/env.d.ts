/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
    }
  }
}
