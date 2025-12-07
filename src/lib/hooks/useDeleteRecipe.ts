import { useState } from "react";
import { deleteRecipe as deleteRecipeApi } from "@/lib/api/recipes";

interface DeleteRecipeState {
  deleting: boolean;
  error?: string;
}

export function useDeleteRecipe(id: string) {
  const [state, setState] = useState<DeleteRecipeState>({
    deleting: false,
    error: undefined,
  });

  const deleteRecipe = async (): Promise<boolean> => {
    try {
      setState({ deleting: true, error: undefined });

      await deleteRecipeApi(id);

      setState({ deleting: false, error: undefined });
      return true;
    } catch (error) {
      console.error("Error deleting recipe:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again";
      setState({
        deleting: false,
        error: errorMessage,
      });
      return false;
    }
  };

  return {
    deleteRecipe,
    deleting: state.deleting,
    error: state.error,
  };
}
