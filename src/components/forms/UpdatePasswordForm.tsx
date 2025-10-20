import { useState } from "react";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { updatePassword } from "@/lib/api/auth";
import { zPasswordUpdateCommand } from "@/lib/validation/auth.schema";

interface UpdatePasswordFormState {
  password: string;
  confirmPassword: string;
  errors: {
    password?: string[];
    confirmPassword?: string[];
    form?: string[];
  };
  touched: {
    password: boolean;
    confirmPassword: boolean;
  };
  isValid: boolean;
  isSubmitting: boolean;
}

export default function UpdatePasswordForm() {
  const [formState, setFormState] = useState<UpdatePasswordFormState>({
    password: "",
    confirmPassword: "",
    errors: {},
    touched: {
      password: false,
      confirmPassword: false,
    },
    isValid: false,
    isSubmitting: false,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<UpdatePasswordFormState>) => {
    setFormState((prev) => {
      const newState = { ...prev, ...updates };

      // Perform validation on the new state
      const result = zPasswordUpdateCommand.safeParse({
        password: newState.password,
      });

      const errors: {
        password?: string[];
        confirmPassword?: string[];
        form?: string[];
      } = {
        ...newState.errors,
      };

      // Clear field errors first
      errors.password = undefined;
      errors.confirmPassword = undefined;

      let isValid = true;

      if (!result.success) {
        isValid = false;
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as "password";

          // Show validation errors only if field is touched
          if (!newState.touched[field]) {
            return;
          }

          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        });
      }

      // Check password confirmation
      if (newState.touched.confirmPassword && newState.password !== newState.confirmPassword) {
        isValid = false;
        if (newState.confirmPassword !== "") {
          errors.confirmPassword = ["Passwords do not match."];
        }
      }

      return {
        ...newState,
        isValid,
        errors,
      };
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState({
      password: e.target.value,
      touched: {
        ...formState.touched,
        password: true,
      },
    });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState({
      confirmPassword: e.target.value,
      touched: {
        ...formState.touched,
        confirmPassword: true,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const touchedState = {
      password: true,
      confirmPassword: true,
    };

    updateFormState({
      touched: touchedState,
    });

    // Validate the form
    const result = zPasswordUpdateCommand.safeParse({
      password: formState.password,
    });

    if (!result.success || formState.password !== formState.confirmPassword) {
      return;
    }

    updateFormState({ isSubmitting: true, errors: {} });

    try {
      await updatePassword({
        password: formState.password,
      });

      // Redirect to home page with success message
      window.location.href = "/?message=password-updated";
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

  const isFormValid =
    formState.isValid && formState.password !== "" && formState.password === formState.confirmPassword;

  return (
    <div className="max-w-md mx-auto">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormErrorAlert errors={formState.errors.form} />

        <FormField
          label="New Password"
          type="password"
          value={formState.password}
          onChange={handlePasswordChange}
          placeholder="Enter your new password..."
          errors={formState.errors.password}
          disabled={formState.isSubmitting}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Confirm New Password"
          type="password"
          value={formState.confirmPassword}
          onChange={handleConfirmPasswordChange}
          placeholder="Confirm your new password..."
          errors={formState.errors.confirmPassword}
          disabled={formState.isSubmitting}
          autoComplete="new-password"
          required
        />

        <div className="pt-4">
          <SubmitButton
            isSubmitting={formState.isSubmitting}
            disabled={!isFormValid}
            loadingText="Updating password..."
          >
            Update Password
          </SubmitButton>
        </div>

        {/* Links */}
        <div className="text-center">
          <p className="text-sm">
            <a href="/auth/login" className="text-primary hover:underline">
              Back to Sign In
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
