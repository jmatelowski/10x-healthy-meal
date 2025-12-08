import { type Page, type Locator, expect } from "@playwright/test";

export class RecipesListPage {
  constructor(public page: Page) {}

  getRecipeCardByTitle(title: string): Locator {
    return this.page.getByRole("button", { name: `View recipe: ${title}` });
  }

  async expectRecipeHasManualTag(article: Locator) {
    await expect(article.getByTestId("recipe-source-badge")).toHaveText("Manual");
  }

  async expectRecipeHasAiTag(article: Locator) {
    await expect(article.getByTestId("recipe-source-badge")).toHaveText("AI");
  }
}
