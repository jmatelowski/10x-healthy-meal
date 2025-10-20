import { useState } from "react";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { loginUser } from "@/lib/api/auth";
import { z } from "zod";

// Simple validation schema - only required fields
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

interface LoginFormState {
  email: string;
  password: string;
  errors: {
    email?: string[];
    password?: string[];
    form?: string[];
  };
  touched: {
    email: boolean;
    password: boolean;
  };
  isSubmitting: boolean;
}

export default function LoginForm() {
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
    touched: {
      email: false,
      password: false,
    },
    isSubmitting: false,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<LoginFormState>) => {
    setFormState((prev) => {
      const newState = { ...prev, ...updates };

      // Only validate touched fields
      const errors: { email?: string[]; password?: string[]; form?: string[] } = {
        ...newState.errors,
      };

      // Validate individual fields if they are touched
      if (newState.touched.email) {
        const emailResult = loginSchema.shape.email.safeParse(newState.email);
        if (!emailResult.success) {
          errors.email = emailResult.error.issues.map((issue) => issue.message);
        } else {
          errors.email = undefined;
        }
      }

      if (newState.touched.password) {
        const passwordResult = loginSchema.shape.password.safeParse(newState.password);
        if (!passwordResult.success) {
          errors.password = passwordResult.error.issues.map((issue) => issue.message);
        } else {
          errors.password = undefined;
        }
      }

      return {
        ...newState,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const touchedState = {
      email: true,
      password: true,
    };

    updateFormState({
      touched: touchedState,
    });

    // Validate the entire form
    const result = loginSchema.safeParse({
      email: formState.email,
      password: formState.password,
    });

    if (!result.success) {
      return;
    }

    updateFormState({ isSubmitting: true, errors: {} });

    try {
      await loginUser({
        email: formState.email,
        password: formState.password,
      });

      // Redirect to home page on success
      window.location.href = "/";
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

  // Check if form is valid for enabling submit button
  const isFormValid = loginSchema.safeParse({
    email: formState.email,
    password: formState.password,
  }).success;

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
          autoComplete="current-password"
          required
        />

        <div className="pt-4">
          <SubmitButton isSubmitting={formState.isSubmitting} disabled={!isFormValid} loadingText="Signing in...">
            Sign In
          </SubmitButton>
        </div>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Do not have an account?{" "}
            <a href="/auth/register" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
          <p className="text-sm">
            <a href="/auth/reset-password" className="text-primary hover:underline">
              Forgot your password?
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
