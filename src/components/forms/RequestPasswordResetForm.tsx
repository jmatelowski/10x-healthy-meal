import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/common/FormField";
import { FormErrorAlert } from "@/components/common/FormErrorAlert";
import { SubmitButton } from "@/components/common/SubmitButton";
import { requestPasswordReset } from "@/lib/api/auth";
import { zResetRequestCommand } from "@/lib/validation/auth.schema";
import type { RequestPasswordResetParams } from "@/lib/api/auth.types";

export default function RequestPasswordResetForm() {
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
  } = useForm<RequestPasswordResetParams>({
    resolver: zodResolver(zResetRequestCommand),
    mode: "onTouched",
  });

  const onSubmit = async (data: RequestPasswordResetParams) => {
    try {
      await requestPasswordReset(data);

      // Always show success message for anti-enumeration
      setIsSuccess(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error. Please check your connection and try again.";
      setError("root", { message: errorMessage });
    }
  };

  // Show success state
  if (isSuccess) {
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

        <div className="pt-4">
          <SubmitButton isSubmitting={isSubmitting} disabled={!isValid} loadingText="Sending instructions...">
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
