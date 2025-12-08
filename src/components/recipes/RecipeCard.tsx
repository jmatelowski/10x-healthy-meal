import React from "react";
import type { RecipeListItemDto } from "@/types";
import { SourceBadge } from "@/components/common/SourceBadge";

interface RecipeCardProps {
  recipe: RecipeListItemDto;
  onClick: (id: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  return (
    <div
      className="p-4 border rounded shadow hover:shadow-md transition cursor-pointer h-36 flex flex-col justify-between"
      tabIndex={0}
      role="button"
      aria-label={`View recipe: ${recipe.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(recipe.id);
        }
      }}
      onClick={() => onClick(recipe.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-lg leading-tight flex-1 mr-2">{recipe.title}</h2>
        <SourceBadge source={recipe.source} />
      </div>
      <p className="text-xs text-muted-foreground">Last update: {new Date(recipe.updated_at).toLocaleDateString()}</p>
    </div>
  );
};
