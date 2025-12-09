import { useState, useCallback } from "react";
import { updateRecipe } from "@/lib/api/recipes";
import type { RecipeDto } from "@/types";

interface UpdateRecipeState {
  loading: boolean;
  error?: string;
  data?: RecipeDto;
}

export function useUpdateRecipe(id: string) {
  const [state, setState] = useState<UpdateRecipeState>({
    loading: false,
    error: undefined,
    data: undefined,
  });

  const update = useCallback(
    async (payload: { title?: string; content?: string }) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));

        const recipeDto = await updateRecipe(id, payload);

        setState({
          loading: false,
          error: undefined,
          data: recipeDto,
        });

        return recipeDto;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Network error. Please check your connection and try again";

        setState({
          loading: false,
          error: errorMessage,
          data: undefined,
        });
        throw error;
      }
    },
    [id]
  );

  return {
    ...state,
    updateRecipe: update,
  };
}
