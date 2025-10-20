import React from "react";
import type { RecipeListItemDto } from "@/types";

interface RecipeCardProps {
  recipe: RecipeListItemDto;
  onClick: (id: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  return (
    <article className="p-4 border rounded shadow hover:shadow-md transition cursor-pointer h-36 flex flex-col justify-between">
      <div
        tabIndex={0}
        role="button"
        className="flex items-center justify-between mb-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick(recipe.id);
          }
        }}
        onClick={() => onClick(recipe.id)}
      >
        <h2 className="font-semibold text-lg leading-tight flex-1 mr-2">{recipe.title}</h2>
        <span
          className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${recipe.source === "ai" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
        >
          {recipe.source === "ai" ? "AI" : "Manual"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Last update: {new Date(recipe.updated_at).toLocaleDateString()}</p>
    </article>
  );
};
