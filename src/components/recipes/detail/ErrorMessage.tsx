import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">{message}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}

        <Button asChild variant="outline">
          <a href="/recipes">Back to Recipes</a>
        </Button>
      </div>
    </div>
  );
}
