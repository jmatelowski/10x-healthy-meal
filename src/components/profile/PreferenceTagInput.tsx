import type { DietPref } from "@/types";

interface PreferenceTagInputProps {
  value: DietPref;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function PreferenceTagInput({
  value,
  label,
  icon,
  checked,
  onChange,
  disabled = false,
}: PreferenceTagInputProps) {
  return (
    <label
      className={`
        flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        ${
          checked
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        focus-within:ring-2 focus-within:ring-offset-2
        ${checked ? "focus-within:ring-primary" : "focus-within:ring-gray-300"}
      `}
    >
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={({ target }) => onChange(target.checked)}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
        aria-checked={checked}
      />
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </label>
  );
}
