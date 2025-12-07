import { Button } from "@/components/ui/button";

interface RecipeActionsProps {
  recipeId: string;
  onDelete: () => void;
}

export default function RecipeActions({ recipeId, onDelete }: RecipeActionsProps) {
  return (
    <section aria-label="Recipe actions" className="pt-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
        <Button asChild variant="outline" className="sm:w-auto">
          <a href={`/recipes/${recipeId}/edit`} aria-label="Edit this recipe">
            Edit Recipe
          </a>
        </Button>

        <Button variant="destructive" onClick={onDelete} className="sm:w-auto" aria-label="Delete this recipe">
          Delete Recipe
        </Button>
      </div>
    </section>
  );
}
