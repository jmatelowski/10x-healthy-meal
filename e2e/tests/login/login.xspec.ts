import { test, expect } from "@playwright/test";
import path from "path";
import { LoginPage } from "../../pages/LoginPage";

const TEST_EMAIL = process.env.E2E_USERNAME as string;
const TEST_PASSWORD = process.env.E2E_PASSWORD as string;

test.describe.configure({ mode: "serial" });

test("should login successfully with valid credentials", async ({ page }) => {
  const login = new LoginPage(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/login/);

  await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
  await login.signIn();

  await expect(page).toHaveURL("/");

  const storageStatePath = path.resolve(process.cwd(), "e2e", "fixtures", "auth-storage.json");
  await page.context().storageState({ path: storageStatePath });
});

test("should show error with invalid credentials and not redirect", async ({ page }) => {
  const login = new LoginPage(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/login/);

  await expect(login.signInButton).toBeDisabled();

  await login.fillCredentials("wrong@example.com", "incorrectPassword123");
  await login.signIn();

  await expect(login.formErrorAlert).toHaveText("Invalid email or password.");

  await expect(page).toHaveURL(/\/auth\/login/);
});
