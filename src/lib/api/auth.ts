import type {
  LoginParams,
  RegisterParams,
  UpdatePasswordParams,
  RequestPasswordResetParams,
  AuthResponse,
} from "./auth.types";

export async function loginUser({ email, password }: LoginParams): Promise<AuthResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    let errorMessage = "A server error occurred. Please try again.";
    if (response.status === 401 && errorData.error === "invalid_credentials") {
      errorMessage = "Invalid email or password.";
    }

    throw new Error(errorMessage);
  }

  return { success: true };
}

export async function registerUser({ email, password }: RegisterParams): Promise<AuthResponse> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    let errorMessage = "A server error occurred. Please try again.";
    if (response.status === 409 && errorData.error === "email_in_use") {
      errorMessage = "Account already exists.";
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return {
    success: true,
    message: data.message,
  };
}

export async function updatePassword({ password }: UpdatePasswordParams): Promise<AuthResponse> {
  const response = await fetch("/api/auth/password/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password,
    }),
  });

  if (!response.ok) {
    let errorMessage = "A server error occurred. Please try again.";
    if (response.status === 401) {
      errorMessage = "Your session has expired. Please request a new password reset.";
    }

    throw new Error(errorMessage);
  }

  return { success: true };
}

export async function requestPasswordReset({ email }: RequestPasswordResetParams): Promise<AuthResponse> {
  const response = await fetch("/api/auth/password/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error("A server error occurred. Please try again.");
  }

  return { success: true };
}
