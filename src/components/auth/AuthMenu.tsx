import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AuthMenuProps {
  user?: {
    id: string;
    email?: string;
  } | null;
}

export default function AuthMenu({ user }: AuthMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your recipes and data."
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/auth/login?message=account-deleted";
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Network error. Please check your connection and try again.");
    }
  };

  // If user is not logged in, show login/register links
  if (!user) {
    return (
      <nav className="flex items-center gap-4">
        <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign In
        </a>
        <Button asChild size="sm">
          <a href="/auth/register">Sign Up</a>
        </Button>
      </nav>
    );
  }

  // If user is logged in, show user menu
  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
      >
        <span className="hidden sm:inline">{user.email}</span>
        <span className="sm:hidden">Account</span>
        <svg
          className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsMenuOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                Signed in as
                <br />
                <span className="font-medium text-foreground">{user.email}</span>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>

              <button
                onClick={handleDeleteAccount}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors border-t"
              >
                Delete Account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
