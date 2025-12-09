import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import PreferenceTagInput from "./PreferenceTagInput";
import { Button } from "@/components/ui/button";
import { updatePreferences } from "@/lib/api/users";
import { useAuth } from "@/contexts/AuthContext";
import type { DietPref } from "@/types";

// Validation schema
const preferencesSchema = z.object({
  preferences: z
    .array(z.enum(["vegetarian", "vegan", "gluten_free", "diabetes", "nut_allergy", "low_fodmap"]))
    .max(6, "You can select up to 6 preferences"),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

// Diet preference options with labels and icons
const DIET_PREFERENCES: { value: DietPref; label: string; icon: string }[] = [
  { value: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { value: "vegan", label: "Vegan", icon: "🌱" },
  { value: "gluten_free", label: "Gluten Free", icon: "🌾" },
  { value: "diabetes", label: "Diabetes", icon: "🩺" },
  { value: "nut_allergy", label: "Nut Allergy", icon: "🥜" },
  { value: "low_fodmap", label: "Low FODMAP", icon: "🍽️" },
];

export default function PreferencesCard() {
  const { user, updatePreferences: updateAuthPreferences } = useAuth();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferences: user?.preferences || [],
    },
  });

  const selectedPreferences = watch("preferences");

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      await updatePreferences({ preferences: data.preferences });

      // Update auth context with new preferences
      updateAuthPreferences(data.preferences);

      toast.success("Preferences saved successfully", {
        description: "Your dietary preferences have been updated.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Error saving preferences:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save preferences. Please try again.";
      setError("root", { message: errorMessage });
      toast.error("Failed to save preferences", {
        description: errorMessage,
      });
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Dietary Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select up to 6 dietary preferences to personalize your recipe recommendations
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error banner */}
        {(errors.root || errors.preferences) && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
            role="alert"
            aria-live="polite"
          >
            {errors.root?.message || errors.preferences?.message}
          </div>
        )}

        {/* Preference toggles grid */}
        <Controller
          control={control}
          name="preferences"
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIET_PREFERENCES.map((pref) => {
                const isChecked = field.value.includes(pref.value);
                const isDisabled = isSubmitting || (!isChecked && field.value.length >= 6);

                return (
                  <PreferenceTagInput
                    key={pref.value}
                    value={pref.value}
                    label={pref.label}
                    icon={pref.icon}
                    checked={isChecked}
                    onChange={(checked) => {
                      if (checked) {
                        field.onChange([...field.value, pref.value]);
                      } else {
                        field.onChange(field.value.filter((v) => v !== pref.value));
                      }
                    }}
                    disabled={isDisabled}
                  />
                );
              })}
            </div>
          )}
        />

        <p className="text-xs text-muted-foreground">{selectedPreferences.length} of 6 preferences selected</p>

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </section>
  );
}
