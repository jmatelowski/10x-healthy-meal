import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";

interface SubmitButtonProps {
  isSubmitting: boolean;
  disabled?: boolean;
  loadingText: string;
  children: React.ReactNode;
  className?: string;
}

export function SubmitButton({
  isSubmitting,
  disabled = false,
  loadingText,
  children,
  className = "w-full",
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isSubmitting} className={className}>
      {isSubmitting ? (
        <>
          <LoadingSpinner />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
