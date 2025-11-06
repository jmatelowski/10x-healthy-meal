import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { updatePassword } from "@/lib/api/auth";
import { zPasswordUpdateCommand } from "@/lib/validation/auth.schema";
import type { UpdatePasswordParams } from "@/lib/api/auth.types";

export default function UpdatePasswordForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
    setError,
  } = useForm<UpdatePasswordParams & { confirmPassword: string }>({
    resolver: zodResolver(zPasswordUpdateCommand),
    mode: "onTouched",
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const passwordsMatch = password === confirmPassword;

  const onSubmit = async (data: UpdatePasswordParams & { confirmPassword: string }) => {
    if (!passwordsMatch) {
      setError("confirmPassword", { message: "Passwords do not match." });
      return;
    }

    try {
      await updatePassword({
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      // Redirect to home page with success message
      window.location.replace("/?message=password-updated");
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
          label="New Password"
          type="password"
          register={register("password")}
          error={errors.password}
          placeholder="Enter your new password..."
          disabled={isSubmitting}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Confirm New Password"
          type="password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="Confirm your new password..."
          disabled={isSubmitting}
          autoComplete="new-password"
          required
        />

        <div className="pt-4">
          <SubmitButton
            isSubmitting={isSubmitting}
            disabled={!isValid || !passwordsMatch}
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
