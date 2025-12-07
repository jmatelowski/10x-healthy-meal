import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error?: string;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  deleting,
  error,
  title = "Delete Item",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting} data-danger="true">
            {deleting ? "Deleting..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
