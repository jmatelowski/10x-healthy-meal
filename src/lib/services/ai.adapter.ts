export interface AiRecipeProposal {
  title: string;
  content: string;
  model: string;
}

export async function generateRecipeProposal(title: string, content: string) {
  // Simulate latency – 1 s delay to mimic external AI request
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    title: `${title} (Healthier Version)`,
    content: `Here is a healthier twist on your recipe: \n${content.slice(0, 30)}...`,
    model: "mock-model",
  } as const;
}
