import { useState, useId } from "react";
import { navigate } from "astro:transitions/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/common/CharacterCounter";
import { InlineErrors } from "@/components/common/InlineErrors";
import { useUpdateRecipe } from "@/lib/hooks/useUpdateRecipe";
import { zRecipeDraft } from "@/lib/validation/recipe.schema";
import type { RecipeEditViewModel, RecipeBase } from "@/types";

const TITLE_MAX_LENGTH = 50;
const CONTENT_MAX_LENGTH = 10000;

interface RecipeEditFormProps {
  recipeId: string;
  initialValue: RecipeBase;
}

export default function RecipeEditForm({ recipeId, initialValue }: RecipeEditFormProps) {
  const titleId = useId();
  const contentId = useId();
  const titleErrorId = useId();
  const contentErrorId = useId();
  const titleCounterId = useId();
  const contentCounterId = useId();

  const { updateRecipe, loading: isUpdating } = useUpdateRecipe(recipeId);

  const [formState, setFormState] = useState<RecipeEditViewModel>({
    title: initialValue.title,
    content: initialValue.content,
    errors: {},
    touched: {
      title: false,
      content: false,
    },
    isValid: true, // Initially valid since we're loading existing data
    isSubmitting: false,
  });

  // Update form state with validation
  const updateFormState = (updates: Partial<RecipeEditViewModel>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.isValid || formState.title.trim() === "" || formState.content.trim() === "") {
      return;
    }

    updateFormState({ isSubmitting: true });

    try {
      // Build payload with only changed fields
      const payload: { title?: string; content?: string } = {};

      const trimmedTitle = formState.title.trim();
      const trimmedContent = formState.content.trim();

      // Include only fields that have changed
      if (trimmedTitle !== initialValue.title) {
        payload.title = trimmedTitle;
      }

      if (trimmedContent !== initialValue.content) {
        payload.content = trimmedContent;
      }

      // Check if at least one field changed
      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        updateFormState({ isSubmitting: false });
        return;
      }

      await updateRecipe(payload);

      toast.success("Recipe updated successfully", {
        duration: 3000,
      });

      // Navigate back to recipe detail view
      navigate(`/recipes/${recipeId}`);
    } catch {
      updateFormState({
        isSubmitting: false,
        errors: {
          title: ["Failed to update recipe. Please try again."],
        },
      });
      toast.error("Failed to update recipe");
    }
  };

  const handleCancel = () => {
    navigate(`/recipes/${recipeId}`);
  };

  const isFormValid = formState.isValid && formState.title.trim() !== "" && formState.content.trim() !== "";

  return (
    <div className="max-w-2xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
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
              disabled={formState.isSubmitting || isUpdating}
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
              disabled={formState.isSubmitting || isUpdating}
            />
            <div className="absolute right-0 bottom-0">
              <CharacterCounter id={contentCounterId} current={formState.content.length} max={CONTENT_MAX_LENGTH} />
            </div>
            <InlineErrors id={contentErrorId} messages={formState.errors.content} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={!isFormValid || formState.isSubmitting || isUpdating}>
            {formState.isSubmitting || isUpdating ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={formState.isSubmitting || isUpdating}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
