import type { UpdatePreferencesCommand, UserProfileDto } from "@/types";

/**
 * Update user's dietary preferences
 */
export async function updatePreferences(command: UpdatePreferencesCommand): Promise<UserProfileDto> {
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

  return response.json();
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
