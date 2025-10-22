import { useState } from "react";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { loginUser } from "@/lib/api/auth";

interface LoginFormState {
  email: string;
  password: string;
  errors: {
    form?: string[];
  };
  isSubmitting: boolean;
}

export default function LoginForm() {
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
    isSubmitting: false,
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      email: e.target.value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      password: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      await loginUser({
        email: formState.email,
        password: formState.password,
      });

      // Redirect to target page (from query param) or home page on success
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect") || "/";

      // Prevent redirect loop: don't redirect back to auth pages
      // if (redirectTo.startsWith("/auth/")) {
      //   redirectTo = "/";
      // }

      window.location.href = redirectTo;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again.";

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: {
          form: [errorMessage],
        },
      }));
    }
  };

  // Check if form has content for enabling submit button
  const isFormValid = formState.email.trim().length > 0 && formState.password.length > 0;

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
