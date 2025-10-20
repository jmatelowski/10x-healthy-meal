import { useState } from "react";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { registerUser } from "@/lib/api/auth";
import { zRegisterCommand } from "@/lib/validation/auth.schema";

interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  errors: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    form?: string[];
  };
  touched: {
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  };
  isValid: boolean;
  isSubmitting: boolean;
}

export default function RegisterForm() {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
    errors: {},
    touched: {
      email: false,
      password: false,
      confirmPassword: false,
    },
    isValid: false,
    isSubmitting: false,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<RegisterFormState>) => {
    setFormState((prev) => {
      const newState = { ...prev, ...updates };

      // Perform validation on the new state
      const result = zRegisterCommand.safeParse({
        email: newState.email,
        password: newState.password,
      });

      const errors: {
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
        form?: string[];
      } = {
        ...newState.errors,
      };

      // Clear field errors first
      errors.email = undefined;
      errors.password = undefined;
      errors.confirmPassword = undefined;

      let isValid = true;

      if (!result.success) {
        isValid = false;
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as "email" | "password";

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState({
      email: e.target.value,
      touched: {
        ...formState.touched,
        email: true,
      },
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
      email: true,
      password: true,
      confirmPassword: true,
    };

    updateFormState({
      touched: touchedState,
    });

    // Validate the form
    const result = zRegisterCommand.safeParse({
      email: formState.email,
      password: formState.password,
    });

    if (!result.success || formState.password !== formState.confirmPassword) {
      return;
    }

    updateFormState({ isSubmitting: true, errors: {} });

    try {
      const result = await registerUser({
        email: formState.email,
        password: formState.password,
      });

      // Show success message or redirect based on response
      if (result.message) {
        updateFormState({
          isSubmitting: false,
          errors: {
            form: [result.message],
          },
        });
      } else {
        // Auto-login successful, redirect to home
        window.location.href = "/";
      }
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
    formState.isValid &&
    formState.email.trim() !== "" &&
    formState.password !== "" &&
    formState.password === formState.confirmPassword;

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

        <FormField
          label="Password"
          type="password"
          value={formState.password}
          onChange={handlePasswordChange}
          placeholder="Enter your password..."
          errors={formState.errors.password}
          disabled={formState.isSubmitting}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Confirm Password"
          type="password"
          value={formState.confirmPassword}
          onChange={handleConfirmPasswordChange}
          placeholder="Confirm your password..."
          errors={formState.errors.confirmPassword}
          disabled={formState.isSubmitting}
          autoComplete="new-password"
          required
        />

        <div className="pt-4">
          <SubmitButton isSubmitting={formState.isSubmitting} disabled={!isFormValid} loadingText="Creating account...">
            Create Account
          </SubmitButton>
        </div>

        {/* Links */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
