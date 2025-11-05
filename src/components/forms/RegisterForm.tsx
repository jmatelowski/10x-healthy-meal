import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { registerUser } from "@/lib/api/auth";
import { zRegisterCommand } from "@/lib/validation/auth.schema";
import type { RegisterParams } from "@/lib/api/auth.types";

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
    setError,
  } = useForm<RegisterParams & { confirmPassword: string }>({
    resolver: zodResolver(zRegisterCommand),
    mode: "onTouched",
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const passwordsMatch = password === confirmPassword;

  const onSubmit = async (data: RegisterParams & { confirmPassword: string }) => {
    if (!passwordsMatch) {
      setError("confirmPassword", { message: "Passwords do not match." });
      return;
    }

    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
      });

      // Show success message or redirect based on response
      if (result.message) {
        setError("root", { message: result.message });
      } else {
        // Auto-login successful, redirect to home
        window.location.replace("/");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again.";
      setError("root", { message: errorMessage });
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <FormErrorAlert errors={errors.root?.message ? [errors.root.message] : undefined} />

        <FormField
          label="Email"
          type="email"
          register={register("email")}
          error={errors.email}
          placeholder="Enter your email..."
          disabled={isSubmitting}
          autoComplete="email"
          required
        />

        <FormField
          label="Password"
          type="password"
          register={register("password")}
          error={errors.password}
          placeholder="Enter your password..."
          disabled={isSubmitting}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Confirm Password"
          type="password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="Confirm your password..."
          disabled={isSubmitting}
          autoComplete="new-password"
          required
        />

        <div className="pt-4">
          <SubmitButton
            isSubmitting={isSubmitting}
            disabled={!isValid || !passwordsMatch}
            loadingText="Creating account..."
          >
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
