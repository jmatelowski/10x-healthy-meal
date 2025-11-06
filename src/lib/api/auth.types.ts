export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UpdatePasswordParams {
  password: string;
  confirmPassword: string;
}

export interface RequestPasswordResetParams {
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}
