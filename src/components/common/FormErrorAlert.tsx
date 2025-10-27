import { InlineErrors } from "./InlineErrors";

interface FormErrorAlertProps {
  errors?: string[];
  className?: string;
}

export function FormErrorAlert({ errors, className = "" }: FormErrorAlertProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="form-error-alert"
      className={`rounded-md border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <InlineErrors messages={errors} />
    </div>
  );
}
