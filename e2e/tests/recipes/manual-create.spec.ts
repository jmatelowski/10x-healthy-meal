import { test, expect } from "@playwright/test";
import { RecipeCreatePage } from "../../pages/RecipeCreatePage";
import { RecipesListPage } from "../../pages/RecipesListPage";

test("manual recipe creation appears on list with manual tag", async ({ page }) => {
  const recipesList = new RecipesListPage(page);
  const createRecipe = new RecipeCreatePage(page);

  const uniqueTitle = `Test Recipe ${Date.now()}`;
  const body = "Test content for manual recipe";

  await page.goto("/recipes/new");

  await createRecipe.fillRecipe(uniqueTitle, body);
  await createRecipe.save();

  await expect(page).toHaveURL(/\/recipes/);

  const card = recipesList.getRecipeCardByTitle(uniqueTitle);
  await expect(card).toBeVisible();
  await recipesList.expectRecipeHasManualTag(card);
});
