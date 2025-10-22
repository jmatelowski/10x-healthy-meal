import { useState } from "react";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { requestPasswordReset } from "@/lib/api/auth";
import { zResetRequestCommand } from "@/lib/validation/auth.schema";

interface ResetFormState {
  email: string;
  errors: {
    email?: string[];
    form?: string[];
  };
  touched: {
    email: boolean;
  };
  isValid: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
}

export default function RequestPasswordResetForm() {
  const [formState, setFormState] = useState<ResetFormState>({
    email: "",
    errors: {},
    touched: {
      email: false,
    },
    isValid: false,
    isSubmitting: false,
    isSuccess: false,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<ResetFormState>) => {
    setFormState((prev) => {
      const newState = { ...prev, ...updates };

      // Perform validation on the new state
      const result = zResetRequestCommand.safeParse({
        email: newState.email,
      });

      if (result.success) {
        return {
          ...newState,
          isValid: true,
          errors: { ...newState.errors, email: undefined },
        };
      }

      const errors: { email?: string[]; form?: string[] } = {
        ...newState.errors,
      };

      // Clear field errors first
      errors.email = undefined;

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as "email";

        // Show validation errors only if field is touched
        if (!newState.touched[field]) {
          return;
        }

        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      });

      return {
        ...newState,
        isValid: false,
        errors,
      };
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState({
      email: e.target.value,
      touched: {
        ...formState.touched,
        email: true,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const touchedState = {
      email: true,
    };

    updateFormState({
      touched: touchedState,
    });

    // Validate the form
    const result = zResetRequestCommand.safeParse({
      email: formState.email,
    });

    if (!result.success) {
      return;
    }

    updateFormState({ isSubmitting: true, errors: {} });

    try {
      await requestPasswordReset({
        email: formState.email,
      });

      // Always show success message for anti-enumeration
      updateFormState({
        isSubmitting: false,
        isSuccess: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again.";

      updateFormState({
        isSubmitting: false,
        errors: {
          form: [errorMessage],
        },
      });
    }
  };

  const isFormValid = formState.isValid && formState.email.trim() !== "";

  // Show success state
  if (formState.isSuccess) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="rounded-md border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Check Your Email</h2>
          <p className="text-sm text-green-700 mb-4">
            If an account with that email address exists, we have sent you instructions to reset your password.
          </p>
          <p className="text-xs text-green-600">Please check your email and follow the link to reset your password.</p>
        </div>

        <div className="mt-6">
          <a href="/auth/login" className="text-primary hover:underline text-sm">
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormErrorAlert errors={formState.errors.form} />

        <FormField
          label="Email"
          type="email"
          value={formState.email}
          onChange={handleEmailChange}
          placeholder="Enter your email..."
          errors={formState.errors.email}
          disabled={formState.isSubmitting}
          autoComplete="email"
          required
        />

        <div className="pt-4">
          <SubmitButton
            isSubmitting={formState.isSubmitting}
            disabled={!isFormValid}
            loadingText="Sending instructions..."
          >
            Send Reset Instructions
          </SubmitButton>
        </div>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm">
            <a href="/auth/login" className="text-primary hover:underline">
              Back to Sign In
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Do not have an account?{" "}
            <a href="/auth/register" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
