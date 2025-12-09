import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { loginUser } from "@/lib/api/auth";
import { zLoginCommand } from "@/lib/validation/auth.schema";
import type { LoginParams } from "@/lib/api/auth.types";
import { navigate } from "astro:transitions/client";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginParams>({
    resolver: zodResolver(zLoginCommand),
  });

  const onSubmit = async (data: LoginParams) => {
    try {
      await loginUser(data);

      // Redirect to target page (from query param) or home page on success
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect") || "/";

      // Prevent redirect loop: don't redirect back to auth pages
      // if (redirectTo.startsWith("/auth/")) {
      //   redirectTo = "/";
      // }

      navigate(redirectTo);
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
          autoComplete="current-password"
          required
        />

        <div className="pt-4">
          <SubmitButton isSubmitting={isSubmitting} disabled={false} loadingText="Signing in...">
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
