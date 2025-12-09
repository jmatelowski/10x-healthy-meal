import PreferencesCard from "./PreferencesCard";
import DangerZonePanel from "./DangerZonePanel";

export default function UserProfile() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your dietary preferences and account settings</p>
      </div>

      <PreferencesCard />

      <DangerZonePanel />
    </div>
  );
}
