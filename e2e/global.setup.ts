import { expect, test as setup } from "@playwright/test";
import path from "path";

import { LoginPage } from "./pages/LoginPage";

setup("global setup", async ({ page }) => {
  const TEST_EMAIL = process.env.E2E_USERNAME as string;
  const TEST_PASSWORD = process.env.E2E_PASSWORD as string;

  const login = new LoginPage(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/login/);

  await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
  await login.signIn();

  await expect(page).toHaveURL("/");

  const storageStatePath = path.resolve(process.cwd(), "e2e", "fixtures", "auth-storage.json");
  await page.context().storageState({ path: storageStatePath });

  console.info("E2E global setup complete!");
});
