import { createClient } from "@supabase/supabase-js";
import { test as teardown } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const E2E_USERNAME_ID = process.env.E2E_USERNAME_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !E2E_USERNAME_ID) {
  // Guard clause, wyloguj błąd w env
  console.error("[E2E_TEARDOWN] Brak wymaganych zmiennych środowiskowych: SUPABASE_URL, SUPABASE_KEY, E2E_USERNAME_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

teardown("cleanup db", async () => {
  try {
    const { error } = await supabase.from("recipes").delete().eq("user_id", E2E_USERNAME_ID);

    if (error) {
      console.error("[E2E_TEARDOWN] Błąd w czasie czyszczenia tabeli recipes:", error.message);
      process.exit(1);
    }
    console.info("[E2E_TEARDOWN] Usunięto testowe wpisy z tabeli recipes.");
  } catch (err) {
    console.error("[E2E_TEARDOWN] Wyjątek:", err);
    process.exit(1);
  }
});
