import { useEffect, useState, useCallback } from "react";
import { getUserProfile } from "@/lib/api/users";
import type { DietPref } from "@/types";

interface UseUserProfileReturn {
  preferences: DietPref[];
  email: string;
  loading: boolean;
  error: string | undefined;
  updatePreferences: (updatedPreferences: DietPref[]) => void;
}

/**
 * Custom hook for managing user profile data
 * Fetches profile on mount and provides method to update preferences locally
 */
export function useUserProfile(): UseUserProfileReturn {
  const [preferences, setPreferences] = useState<DietPref[]>([]);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const profile = await getUserProfile();
      setPreferences(profile.preferences);
      setEmail(profile.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updatePreferences = (updatedPreferences: DietPref[]) => {
    setPreferences(updatedPreferences);
  };

  return {
    preferences,
    email,
    loading,
    error,
    updatePreferences,
  };
}
