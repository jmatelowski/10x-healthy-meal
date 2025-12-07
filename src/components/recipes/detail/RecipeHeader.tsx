import type { RecipeSource } from "@/types";
import { SourceBadge } from "@/components/common/SourceBadge";

interface RecipeHeaderProps {
  title: string;
  source: RecipeSource;
}

export default function RecipeHeader({ title, source }: RecipeHeaderProps) {
  return (
    <header className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight order-2 sm:order-1">{title}</h1>
        <div className="order-1 sm:order-2 self-start">
          <SourceBadge source={source} />
        </div>
      </div>
    </header>
  );
}
