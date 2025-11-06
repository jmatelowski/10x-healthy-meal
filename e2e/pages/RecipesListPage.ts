import { type Page, type Locator, expect } from "@playwright/test";

export class RecipesListPage {
  constructor(public page: Page) {}

  getRecipeCardByTitle(title: string): Locator {
    return this.page.getByRole("article").filter({ has: this.page.getByRole("heading", { name: title }) });
  }

  async expectRecipeHasManualTag(article: Locator) {
    await expect(article.getByTestId("recipe-source-badge")).toHaveText("Manual");
  }

  async expectRecipeHasAiTag(article: Locator) {
    await expect(article.getByTestId("recipe-source-badge")).toHaveText("AI");
  }
}
