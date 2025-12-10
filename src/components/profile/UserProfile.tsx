import PreferencesCard from "./PreferencesCard";
import DangerZonePanel from "./DangerZonePanel";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function UserProfile() {
  const { preferences, email, loading, error, updatePreferences } = useUserProfile();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your dietary preferences and account settings</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="text-muted-foreground">Loading your profile...</div>
        </div>
      ) : (
        <>
          <PreferencesCard preferences={preferences} onPreferencesUpdate={updatePreferences} />
          <DangerZonePanel userEmail={email} />
        </>
      )}
    </div>
  );
}
