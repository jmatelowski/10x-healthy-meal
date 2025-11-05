import { useId } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { InlineErrors } from "./InlineErrors";

interface FormFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
  register: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormField({
  label,
  type = "text",
  placeholder,
  disabled = false,
  autoComplete,
  required = false,
  register,
  error,
}: FormFieldProps) {
  const fieldId = useId();
  const errorId = useId();

  // Convert RHF error to string array
  const errorMessages = error ? [error.message || ""] : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={type}
          {...register}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          aria-invalid={!!errorMessages?.length}
          aria-describedby={errorId}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <InlineErrors id={errorId} messages={errorMessages} />
      </div>
    </div>
  );
}
