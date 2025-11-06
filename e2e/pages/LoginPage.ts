import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly formErrorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: /^sign in$/i });
    this.formErrorAlert = page.getByTestId("form-error-alert");
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.emailInput.blur();
    await this.page.waitForTimeout(1000);

    await this.passwordInput.fill(password);
    await this.passwordInput.blur();
    await this.page.waitForTimeout(1000);
  }

  async signIn(): Promise<void> {
    await expect(this.signInButton).toBeEnabled();
    await this.signInButton.click();
  }
}
