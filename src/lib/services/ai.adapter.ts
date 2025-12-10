import { OpenRouterService } from "./openrouter.service";
import { zRecipeDraft } from "@/lib/validation/recipe.schema";
import type { ChatMessage } from "./openrouter.types";

export interface AiRecipeProposal {
  title: string;
  content: string;
  model: string;
}

export async function generateRecipeProposal(
  title: string,
  content: string,
  preferences: string
): Promise<AiRecipeProposal> {
  const openRouter = new OpenRouterService();

  const systemMessage: ChatMessage = {
    role: "system",
    content: `
      You are an expert Culinary Nutritionist and Food Scientist. Your task is to minimally edit a recipe to strictly adhere to specific dietary preferences while preserving the original language, tone, structure, and formatting.

      ## OBJECTIVE
      Adapt the provided recipe so that:
      1. **All selected dietary restrictions are fully satisfied**, and  
      2. **The original tone, style, flow, and formatting remain unchanged**, including narrative vs. list format.

      Your changes must be **surgical**, altering only the ingredient or instruction elements required to meet the dietary rules.


      ## CONTEXT

      You will be provided with:
      - **Recipe Title**
      - **Recipe Content** (ingredients and/or instructions; may be narrative, list-based, mixed, or freeform)
      - **Target Diet Preferences** (zero or more of: "vegan", "vegetarian", "nut_allergy", "gluten_free", "lactose_free", "keto")

      ## CRITICAL RULES & CONSTRAINTS

      ### 1. Language Preservation (CRITICAL)
      - Detect the language of the **original Recipe Content**.  
      - Respond **strictly in that same language**.  
      - Do **not** translate or alter linguistic tone, idioms, or voice.

      ### 2. Style & Structure Preservation (CRITICAL)
      - Maintain the **exact formatting style** of the input (narrative stays narrative; lists stay lists; mixed formats remain mixed).
      - Do **not** convert a story to a numbered list or vice versa.
      - Do **not** add new structural elements that were not present in the original.
      - Only modify **specific ingredient words or corresponding instruction phrases** necessary to meet dietary requirements.

      ### 3. Dietary Compliance (CRITICAL)
      You must satisfy **all** selected preferences simultaneously:

      - **vegan**: No meat, seafood, dairy, eggs, honey, gelatin, or animal-derived ingredients.  
      - **vegetarian**: No meat, poultry, or seafood; dairy & eggs allowed unless vegan is also selected.  
      - **nut_allergy**: No peanuts, tree nuts, nut oils, nut milks, nut flours, or nut-based derivatives.  
      - **gluten_free**: Remove wheat, barley, rye, and triticale; use gluten-free equivalents.  
      - **lactose_free**: Use lactose-free dairy or plant-based variants; do not remove structurally necessary dairy items without replacing them.  
      - **keto**: Remove sugars, grains, starchy vegetables, and high-carb ingredients; focus on low-carb, high-fat substitutions.

      ### 4. Empty Preferences Case
      If the preferences list is empty or null:
      - Make **light, health-oriented optimizations** (reduce refined sugar, sodium, and saturated fats)  
      - Keep the **core identity and flavor profile** unchanged.

      ### 5. Substitution Logic
      - Make substitutions **realistic, accessible, and culinary-sound**.
      - Never simply delete essential ingredients; replace with a functional equivalent.
      - Substitute only when necessary.


      ### OUTPUT FORMAT
      You must return a valid, parseable JSON object. Do not include markdown formatting or conversational text outside the JSON. The structure MUST be:
      {
        "title": "String (The adapted title, e.g., 'Keto-Friendly Lasagna')",
        "content": "String (The adapted content, e.g., 'Ingredients and Instructions')",
      }
    `,
  };

  const userMessage: ChatMessage = {
    role: "user",
    content: `
      Please adapt the following recipe based on the constraints below:

      **Target Diet Preferences:** [${preferences}]

      **Original Recipe Title:** ${title}

      **Original Recipe Content:** ${content}
    `,
  };

  const result = await openRouter.generateStructured([systemMessage, userMessage], zRecipeDraft);

  return {
    title: result.title,
    content: result.content,
    model: openRouter.getModel(),
  };
}
