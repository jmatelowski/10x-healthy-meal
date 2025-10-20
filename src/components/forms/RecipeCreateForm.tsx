import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/common/CharacterCounter";
import { InlineErrors } from "@/components/common/InlineErrors";
import { AiReviewModal } from "@/components/modals/AiReviewModal";
import { zRecipeDraft } from "@/lib/validation/recipe.schema";
import type { RecipeDraftViewModel, AiReviewState } from "@/types";

const TITLE_MAX_LENGTH = 50;
const CONTENT_MAX_LENGTH = 10000;

export default function RecipeCreateForm() {
  const titleId = useId();
  const contentId = useId();
  const titleErrorId = useId();
  const contentErrorId = useId();
  const titleCounterId = useId();
  const contentCounterId = useId();

  const [formState, setFormState] = useState<RecipeDraftViewModel>({
    title: "",
    content: "",
    errors: {},
    touched: {
      title: false,
      content: false,
    },
    isValid: false,
    isSubmitting: false,
  });

  const [aiReviewState, setAiReviewState] = useState<AiReviewState>({
    open: false,
    generationId: null,
    proposal: null,
    errorMessage: undefined,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<RecipeDraftViewModel>) => {
    setFormState((prev) => {
      const newState = { ...prev, ...updates };

      // Perform validation on the new state
      const result = zRecipeDraft.safeParse({
        title: newState.title,
        content: newState.content,
      });

      if (result.success) {
        return {
          ...newState,
          isValid: true,
          errors: {},
        };
      }

      const errors: { title?: string[]; content?: string[] } = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as "title" | "content";
        // Show required errors only if field is touched
        if (!newState.touched[field]) {
          return;
        }

        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      });

      return {
        ...newState,
        isValid: false,
        errors,
      };
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState({
      title: e.target.value,
      touched: {
        ...formState.touched,
        title: true,
      },
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormState({
      content: e.target.value,
      touched: {
        ...formState.touched,
        content: true,
      },
    });
  };

  const handleSave = async () => {
    if (!formState.isValid || formState.title.trim() === "" || formState.content.trim() === "") {
      return;
    }

    updateFormState({ isSubmitting: true });

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formState.title.trim(),
          content: formState.content.trim(),
        }),
      });

      if (response.ok) {
        // Navigate to recipes list on success
        window.location.href = "/recipes";
      } else {
        const errorData = await response.json().catch(() => ({ errors: [] }));
        updateFormState({
          isSubmitting: false,
          errors: {
            ...errorData.errors,
            title: ["Failed to save recipe. Please try again."],
          },
        });
      }
    } catch (error) {
      updateFormState({
        isSubmitting: false,
        errors: {
          content: [error as string],
          title: ["Network error. Please check your connection and try again."],
        },
      });
    }
  };

  const handleAdjustWithAI = async () => {
    if (!formState.isValid || formState.title.trim() === "" || formState.content.trim() === "") {
      return;
    }

    updateFormState({ isSubmitting: true });

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formState.title.trim(),
          content: formState.content.trim(),
        }),
      });

      if (response.status === 202) {
        const data = await response.json();
        setAiReviewState({
          open: true,
          generationId: data.id,
          proposal: data.recipe_proposal,
          errorMessage: undefined,
        });
        updateFormState({ isSubmitting: false });
      } else {
        const errorData = await response.json().catch(() => ({ errors: [] }));
        updateFormState({
          isSubmitting: false,
          errors: {
            ...errorData.errors,
            title: ["Failed to generate AI proposal. Please try again."],
          },
        });
      }
    } catch (error) {
      updateFormState({
        isSubmitting: false,
        errors: {
          content: [error as string],
          title: ["Network error. Please check your connection and try again."],
        },
      });
    }
  };

  const handleAiAccepted = () => {
    // Close modal and navigate to recipes list
    setAiReviewState({
      open: false,
      generationId: null,
      proposal: null,
      errorMessage: undefined,
    });
    window.location.href = "/recipes";
  };

  const handleAiModalClose = () => {
    setAiReviewState({
      open: false,
      generationId: null,
      proposal: null,
      errorMessage: undefined,
    });
  };

  const isFormValid = formState.isValid && formState.title.trim() !== "" && formState.content.trim() !== "";

  return (
    <div className="max-w-2xl">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Title Field */}
        <div className="space-y-2">
          <label
            htmlFor={titleId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Recipe Title
          </label>
          <div className="relative">
            <input
              id={titleId}
              type="text"
              value={formState.title}
              onChange={handleTitleChange}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter recipe title..."
              aria-invalid={!!formState.errors.title}
              aria-describedby={`${titleErrorId} ${titleCounterId}`}
              disabled={formState.isSubmitting}
            />
            <div className="absolute right-0 bottom-0">
              <CharacterCounter id={titleCounterId} current={formState.title.length} max={TITLE_MAX_LENGTH} />
            </div>
            <InlineErrors id={titleErrorId} messages={formState.errors.title} />
          </div>
        </div>

        {/* Content Field */}
        <div className="space-y-2">
          <label
            htmlFor={contentId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Recipe Content
          </label>
          <div className="relative">
            <textarea
              id={contentId}
              value={formState.content}
              onChange={handleContentChange}
              rows={12}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter recipe instructions, ingredients, and details..."
              aria-invalid={!!formState.errors.content}
              aria-describedby={`${contentErrorId} ${contentCounterId}`}
              disabled={formState.isSubmitting}
            />
            <div className="absolute right-0 bottom-0">
              <CharacterCounter id={contentCounterId} current={formState.content.length} max={CONTENT_MAX_LENGTH} />
            </div>
            <InlineErrors id={contentErrorId} messages={formState.errors.content} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={handleAdjustWithAI}
            disabled={!isFormValid || formState.isSubmitting}
            className="flex-1"
          >
            {formState.isSubmitting ? "Processing..." : "Adjust with AI"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={!isFormValid || formState.isSubmitting}
          >
            Save Recipe
          </Button>
        </div>
      </form>

      {/* AI Review Modal */}
      <AiReviewModal
        open={aiReviewState.open}
        generationId={aiReviewState.generationId}
        proposal={aiReviewState.proposal}
        onClose={handleAiModalClose}
        onAccepted={handleAiAccepted}
      />
    </div>
  );
}
