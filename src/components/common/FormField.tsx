import { useId } from "react";
import { InlineErrors } from "./InlineErrors";

interface FormFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  errors?: string[];
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
}

export function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  errors,
  disabled = false,
  autoComplete,
  required = false,
}: FormFieldProps) {
  const fieldId = useId();
  const errorId = useId();

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
          value={value}
          onChange={onChange}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          aria-invalid={!!errors}
          aria-describedby={errorId}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <InlineErrors id={errorId} messages={errors} />
      </div>
    </div>
  );
}
