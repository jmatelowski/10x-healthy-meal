import { OpenRouterService } from "./openrouter.service";
import { zRecipeDraft } from "@/lib/validation/recipe.schema";
import type { ChatMessage } from "./openrouter.types";

export interface AiRecipeProposal {
  title: string;
  content: string;
  model: string;
}

export async function generateRecipeProposal(title: string, content: string): Promise<AiRecipeProposal> {
  const openRouter = new OpenRouterService();

  const systemMessage: ChatMessage = {
    role: "system",
    content:
      "You are a nutritionist assistant that helps adapt recipes to be healthier. Return a JSON object with 'title' and 'content' fields containing the healthier version of the recipe.",
  };

  const userMessage: ChatMessage = {
    role: "user",
    content: `Please provide a healthier version of this recipe:\n\nTitle: ${title}\n\nRecipe:\n${content}`,
  };

  const result = await openRouter.generateStructured([systemMessage, userMessage], zRecipeDraft);

  return {
    title: result.title,
    content: result.content,
    model: openRouter.getModel(),
  };
}
