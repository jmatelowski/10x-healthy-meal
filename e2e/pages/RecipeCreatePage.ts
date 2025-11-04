import type { Page, Locator } from "@playwright/test";

export class RecipeCreatePage {
  constructor(public page: Page) {}

  get form(): Locator {
    return this.page.locator("form");
  }
  get titleInput(): Locator {
    return this.page.getByLabel(/recipe title/i);
  }
  get contentTextarea(): Locator {
    return this.page.getByLabel(/recipe content/i);
  }
  get saveButton(): Locator {
    return this.page.getByRole("button", { name: /save recipe/i });
  }
  async fillRecipe(title: string, content: string) {
    await this.titleInput.fill(title);
    await this.contentTextarea.fill(content);
  }
  async save() {
    await this.saveButton.click();
  }
}
