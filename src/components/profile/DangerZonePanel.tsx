import { useState } from "react";
import { navigate } from "astro:transitions/client";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/api/users";
import { useAuth } from "@/contexts/AuthContext";

export default function DangerZonePanel() {
  const { user, clearUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(undefined);

      await deleteAccount();

      // Clear auth context
      clearUser();

      toast.success("Account deleted successfully", {
        description: "Your account and all data have been permanently deleted.",
      });

      // Redirect to login
      navigate("/auth/login?message=account-deleted");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setDeleteError(errorMessage);
      toast.error("Failed to delete account", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="bg-white border-2 border-red-200 rounded-lg p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Irreversible actions that will permanently affect your account
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-red-50 rounded-lg border border-red-100">
          <div>
            <h3 className="font-medium text-red-900">Delete Account</h3>
            <p className="text-sm text-red-700 mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="sm:shrink-0">
            Delete Account
          </Button>
        </div>
      </section>

      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteError(undefined);
        }}
        onConfirm={handleConfirmDelete}
        deleting={isDeleting}
        error={deleteError}
        title="Delete Account"
        description={`Are you sure you want to delete your account (${user?.email})? This action cannot be undone. All your data will be permanently deleted, including all saved recipes, dietary preferences, generation history, and account information.`}
        confirmText="Yes, Delete My Account"
      />
    </>
  );
}
