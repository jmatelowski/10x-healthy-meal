import { http, HttpResponse } from "msw";
import type { CreateRecipeCommand, CreateGenerationCommand, RecipeBase } from "../types";

export const handlers = [
  http.post("/api/recipes", async ({ request }) => {
    const data = (await request.json()) as CreateRecipeCommand;

    if (data.title === "fetch should fail - network" || data.content === "fetch should fail - network") {
      return HttpResponse.error();
    }

    return HttpResponse.json({ id: "mock-recipe-id", ...data }, { status: 200 });
  }),

  http.post("/api/generations", async ({ request }) => {
    const data = (await request.json()) as CreateGenerationCommand;

    if (data.title === "fetch should fail - network" || data.content === "fetch should fail - network") {
      return HttpResponse.error();
    }

    const proposal: RecipeBase = {
      title: data.title,
      content: data.content,
    };
    return HttpResponse.json(
      {
        id: "mock-generation-id",
        recipe_proposal: proposal,
      },
      { status: 202 }
    );
  }),
];
