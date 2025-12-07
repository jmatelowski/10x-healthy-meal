import { Button } from "@/components/ui/button";

export default function NotFoundMessage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Recipe Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          The recipe you&apos;re looking for doesn&apos;t exist or may have been deleted.
        </p>
      </div>

      <Button asChild variant="outline">
        <a href="/recipes">Back to Recipes</a>
      </Button>
    </div>
  );
}
