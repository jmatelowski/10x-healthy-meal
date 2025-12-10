import type { UpdatePreferencesCommand, UserProfileDto } from "@/types";

/**
 * Get current user's profile including dietary preferences
 */
export async function getUserProfile(): Promise<UserProfileDto> {
  const response = await fetch("/api/users/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || "Failed to load profile. Please try again.";
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Update user's dietary preferences
 */
export async function updatePreferences(command: UpdatePreferencesCommand): Promise<UpdatePreferencesCommand> {
  const response = await fetch("/api/users/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || "Failed to update preferences. Please try again.";
    throw new Error(errorMessage);
  }

  return command;
}

/**
 * Delete user account permanently
 */
export async function deleteAccount(): Promise<void> {
  const response = await fetch("/api/users/me", {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || "Failed to delete account. Please try again.";
    throw new Error(errorMessage);
  }
}
