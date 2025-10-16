import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "./ModalShell";
import { RecipePreview } from "@/components/common/RecipePreview";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { RecipeBase } from "@/types";

interface AiReviewModalProps {
  open: boolean;
  generationId: string | null;
  proposal: RecipeBase | null;
  onClose: () => void;
  onAccepted: (recipeId: string) => void;
}

export function AiReviewModal({ open, generationId, proposal, onClose, onAccepted }: AiReviewModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!generationId || !proposal) return;

    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${generationId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: proposal.title,
          content: proposal.content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onAccepted(data.recipe_id);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to accept proposal. Please try again.");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="AI Recipe Proposal" className="max-w-3xl">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Recipe Preview */}
        {proposal && <RecipePreview recipe={proposal} />}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t justify-end">
          <Button onClick={handleAccept} disabled={isAccepting || !generationId} className="min-w-24">
            {isAccepting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Accepting...
              </>
            ) : (
              "Accept Proposal"
            )}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isAccepting} className="min-w-24">
            Reject
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
