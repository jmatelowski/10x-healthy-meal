import { useState, useCallback } from "react";
import { fetchRecipe } from "@/lib/api/recipes";
import type { RecipeDetailViewModel, FetchState } from "@/types";

export function useRecipe(id: string) {
  const [state, setState] = useState<FetchState>({
    loading: true,
    error: undefined,
    data: undefined,
  });

  const fetchRecipeData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      const recipeDto = await fetchRecipe(id);

      // Transform DTO to view model
      const viewModel: RecipeDetailViewModel = {
        id: recipeDto.id,
        title: recipeDto.title,
        content: recipeDto.content,
        source: recipeDto.source,
        updatedAt: recipeDto.updated_at,
      };

      setState({
        loading: false,
        error: undefined,
        data: viewModel,
      });
    } catch (error) {
      console.error("Error fetching recipe:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again";
      setState({
        loading: false,
        error: errorMessage,
        data: undefined,
      });
    }
  }, [id]);

  return {
    ...state,
    fetchRecipe: fetchRecipeData,
  };
}
