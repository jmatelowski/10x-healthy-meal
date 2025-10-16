import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  id?: string;
  className?: string;
}

export function CharacterCounter({ current, max, id, className }: CharacterCounterProps) {
  const isOverLimit = current > max;

  return (
    <span
      id={id}
      className={cn(
        "text-sm",
        {
          "text-muted-foreground": !isOverLimit,
          "text-destructive": isOverLimit,
        },
        className
      )}
      aria-live="polite"
    >
      {current} / {max}
    </span>
  );
}
