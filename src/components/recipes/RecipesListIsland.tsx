import React from "react";
import { useRecipesList } from "@/lib/hooks/useRecipesList";
import { RecipeCard } from "./RecipeCard";
import { PaginationControls } from "./PaginationControls";
import { Header } from "./Header";

const RecipesListIsland: React.FC = () => {
  const { state, gotoPage } = useRecipesList({});
  const { loading, error, data, pagination } = state;

  if (loading) {
    return (
      <section>
        <Header />
        <div className="text-center py-8">
          <span className="text-muted-foreground">Loading recipes...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <Header />
        <div role="alert" className="text-center py-8 text-red-500">
          <p>{error.message}</p>
        </div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="text-center py-16">
        <Header />
        <p className="text-lg text-muted-foreground mb-4">No recipes yet. Create your first recipe to get started!</p>
        <a href="/recipes/new" className="btn">
          Create New Recipe
        </a>
      </section>
    );
  }

  return (
    <section>
      <Header />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((recipe) => (
          <li key={recipe.id}>
            <RecipeCard recipe={recipe} onClick={(id) => (window.location.href = `/recipes/${id}`)} />
          </li>
        ))}
      </ul>
      {pagination && <PaginationControls pagination={pagination} onPageChange={gotoPage} />}
    </section>
  );
};

export default RecipesListIsland;
