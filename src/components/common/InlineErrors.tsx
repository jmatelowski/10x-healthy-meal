import { cn } from "@/lib/utils";

interface InlineErrorsProps {
  messages?: string[] | string | null;
  id?: string;
  className?: string;
}

export function InlineErrors({ messages, id, className }: InlineErrorsProps) {
  const errorMessages = messages ? (Array.isArray(messages) ? messages : [messages]) : [];
  const hasErrors = errorMessages.length > 0;

  return (
    <div id={id} className={cn("mt-1 min-h-[1.25rem]", className)} aria-live="polite" role="alert">
      {hasErrors ? (
        errorMessages.map((message) => (
          <p key={message} className="text-sm text-destructive" data-testid={id ? `field-error-${id}` : "field-error"}>
            {message}
          </p>
        ))
      ) : (
        <div className="h-5" aria-hidden="true" />
      )}
    </div>
  );
}
