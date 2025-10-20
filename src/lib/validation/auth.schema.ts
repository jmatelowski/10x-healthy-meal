import { z } from "zod";

// Email validation - max 254 characters as per RFC 5321
export const zEmail = z.string().email("Invalid email address.").max(254, "Email address is too long.");

// Password validation - min 8 chars, max 72, at least 1 letter and 1 digit
export const zPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
  .regex(/\d/, "Password must contain at least one digit.");

// Login command schema
export const zLoginCommand = z.object({
  email: zEmail,
  password: zPassword,
});

// Register command schema
export const zRegisterCommand = z.object({
  email: zEmail,
  password: zPassword,
});

// Password reset request schema
export const zResetRequestCommand = z.object({
  email: zEmail,
});

// Password update schema
export const zPasswordUpdateCommand = z.object({
  password: zPassword,
});

// Inferred types for DTOs
export type LoginCommand = z.infer<typeof zLoginCommand>;
export type RegisterCommand = z.infer<typeof zRegisterCommand>;
export type ResetRequestCommand = z.infer<typeof zResetRequestCommand>;
export type PasswordUpdateCommand = z.infer<typeof zPasswordUpdateCommand>;
