import { useState, useEffect } from "react";
import { toast } from "sonner";
import { navigate } from "astro:transitions/client";
import { useRecipe } from "@/lib/hooks/useRecipe";
import { useDeleteRecipe } from "@/lib/hooks/useDeleteRecipe";
import type { DeleteState } from "@/types";
import RecipeHeader from "./RecipeHeader";
import RecipeMetadata from "./RecipeMetadata";
import RecipeContent from "./RecipeContent";
import RecipeActions from "./RecipeActions";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import NotFoundMessage from "./NotFoundMessage";
import ErrorMessage from "./ErrorMessage";

interface RecipeDetailIslandProps {
  id: string;
}

export default function RecipeDetailIsland({ id }: RecipeDetailIslandProps) {
  const { data: recipe, loading, error, fetchRecipe } = useRecipe(id);
  const { deleteRecipe, deleting, error: deleteError } = useDeleteRecipe(id);

  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    deleting: false,
    error: undefined,
  });

  // Fetch recipe on mount
  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  const handleDeleteClick = () => {
    setDeleteState((prev) => ({ ...prev, open: true }));
  };

  const handleDeleteConfirm = async () => {
    setDeleteState((prev) => ({ ...prev, deleting: true, error: undefined }));

    const success = await deleteRecipe();

    if (success) {
      toast.success("Recipe deleted successfully", {
        duration: 3000,
      });
      // Navigate using Astro's navigate API
      navigate("/recipes");
    } else {
      setDeleteState((prev) => ({
        ...prev,
        deleting: false,
        error: deleteError || "Failed to delete recipe",
      }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteState({
      open: false,
      deleting: false,
      error: undefined,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading recipe...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (error === "Recipe not found") {
    return <NotFoundMessage />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRecipe} />;
  }

  // Recipe not loaded
  if (!recipe) {
    return <ErrorMessage message="Recipe data not available" onRetry={fetchRecipe} />;
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6" role="main">
      <RecipeHeader title={recipe.title} source={recipe.source} />

      <RecipeMetadata updatedAt={recipe.updatedAt} />

      <RecipeContent content={recipe.content} />

      <RecipeActions recipeId={recipe.id} onDelete={handleDeleteClick} />

      <ConfirmDeleteModal
        open={deleteState.open}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        deleting={deleteState.deleting || deleting}
        error={deleteState.error}
        title="Delete Recipe"
        description="Are you sure you want to delete this recipe? This action cannot be undone."
      />
    </main>
  );
}
