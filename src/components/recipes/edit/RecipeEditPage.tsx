import { useEffect } from "react";
import { useRecipe } from "@/lib/hooks/useRecipe";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import NotFoundMessage from "../detail/NotFoundMessage";
import ErrorMessage from "../detail/ErrorMessage";
import RecipeEditForm from "./RecipeEditForm";

interface RecipeEditPageProps {
  id: string;
}

export default function RecipeEditPage({ id }: RecipeEditPageProps) {
  const { data: recipe, loading, error, fetchRecipe } = useRecipe(id);

  // Fetch recipe on mount
  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Recipe</h1>
        <p className="text-sm text-muted-foreground">Update the title and content of your recipe.</p>
      </div>

      <RecipeEditForm
        recipeId={recipe.id}
        initialValue={{
          title: recipe.title,
          content: recipe.content,
        }}
      />
    </main>
  );
}
