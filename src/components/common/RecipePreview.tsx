import type { RecipeBase } from "@/types";

interface RecipePreviewProps {
  recipe: RecipeBase;
  className?: string;
}

export function RecipePreview({ recipe, className }: RecipePreviewProps) {
  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Title</h3>
          <p className="text-base font-medium">{recipe.title}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Content</h3>
          <div className="bg-muted/30 rounded-md p-3 border">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{recipe.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
