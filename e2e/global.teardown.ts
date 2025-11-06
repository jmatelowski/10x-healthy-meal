import { createClient } from "@supabase/supabase-js";
import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const E2E_USERNAME_ID = process.env.E2E_USERNAME_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !E2E_USERNAME_ID) {
  console.error("[E2E_TEARDOWN] Missing required environment variables: SUPABASE_URL, SUPABASE_KEY, E2E_USERNAME_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

teardown("cleanup db", async () => {
  const storageStatePath = path.resolve(process.cwd(), "e2e", "fixtures", "auth-storage.json");

  try {
    fs.writeFileSync(storageStatePath, JSON.stringify({}));
    console.info("[E2E_TEARDOWN] Emptied storage state file.");
  } catch (err) {
    console.error("[E2E_TEARDOWN] Failed to empty storage state file:", err);
    process.exit(1);
  }

  try {
    const { error } = await supabase.from("recipes").delete().eq("user_id", E2E_USERNAME_ID);

    if (error) {
      console.error("[E2E_TEARDOWN] Error occurred while cleaning recipes table:", error.message);
      process.exit(1);
    }
    console.info("[E2E_TEARDOWN] Test entries removed from recipes table.");
  } catch (err) {
    console.error("[E2E_TEARDOWN] Exception:", err);
    process.exit(1);
  }
});
