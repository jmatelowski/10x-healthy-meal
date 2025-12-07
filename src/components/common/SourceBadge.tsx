import type { RecipeSource } from "@/types";

interface SourceBadgeProps {
  source: RecipeSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const isAI = source === "ai";

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${
          isAI
            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
        }
      `}
      aria-label={`Recipe source: ${source}`}
      data-testid="recipe-source-badge"
    >
      {isAI ? "AI" : "Manual"}
    </span>
  );
}
