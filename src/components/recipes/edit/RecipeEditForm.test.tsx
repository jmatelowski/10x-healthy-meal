import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeEditForm from "./RecipeEditForm";
import * as useUpdateRecipeHook from "@/lib/hooks/useUpdateRecipe";
import { toast } from "sonner";
import { navigate } from "astro:transitions/client";

// Mock the useUpdateRecipe hook
vi.mock("@/lib/hooks/useUpdateRecipe");

// Mock navigate from Astro
vi.mock("astro:transitions/client", () => ({
  navigate: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockInitialValue = {
  title: "Original Title",
  content: "Original content",
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementation
  vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
    updateRecipe: vi.fn(),
    loading: false,
    error: undefined,
    data: undefined,
  });
});

describe("RecipeEditForm: Initial Render", () => {
  it("renders form with pre-filled values from initialValue", () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });

    expect(titleInput).toHaveValue("Original Title");
    expect(contentInput).toHaveValue("Original content");
  });

  it("renders save and cancel buttons", () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("displays character counters for title and content", () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    // Check character counters show correct initial counts
    expect(screen.getByText(/14\s*\/\s*50/)).toBeInTheDocument(); // "Original Title" = 14 chars
    expect(screen.getByText(/16\s*\/\s*10000/)).toBeInTheDocument(); // "Original content" = 16 chars
  });
});

describe("RecipeEditForm: Field Validation", () => {
  it("shows required error for empty title after clearing", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });

    await userEvent.clear(titleInput);
    await userEvent.tab();

    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("shows required error for empty content after clearing", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });

    await userEvent.clear(contentInput);
    await userEvent.tab();

    expect(screen.getByText("Content is required")).toBeInTheDocument();
  });

  it("shows length error if title exceeds 50 characters", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "a".repeat(51));
    await userEvent.tab();

    expect(screen.getByText("Title must be ≤ 50 characters")).toBeInTheDocument();
  });

  it("shows length error if content exceeds 10,000 characters", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });

    await userEvent.clear(contentInput);
    await userEvent.click(contentInput);
    await userEvent.paste("b".repeat(10001));
    await userEvent.tab();

    expect(screen.getByText("Content must be ≤ 10 000 characters")).toBeInTheDocument();
  });

  it("disables save button when form is invalid", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.clear(titleInput);
    await userEvent.tab();

    expect(saveButton).toBeDisabled();
  });
});

describe("RecipeEditForm: Form Submission", () => {
  it("shows info toast when no changes are made", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith("No changes to save");
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it("submits only changed title field", async () => {
    const mockUpdateRecipe = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
      updateRecipe: mockUpdateRecipe,
      loading: false,
      error: undefined,
      data: undefined,
    });

    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Title");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith({
        title: "Updated Title",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Recipe updated successfully", { duration: 3000 });
    expect(navigate).toHaveBeenCalledWith("/recipes/test-id");
  });

  it("submits only changed content field", async () => {
    const mockUpdateRecipe = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
      updateRecipe: mockUpdateRecipe,
      loading: false,
      error: undefined,
      data: undefined,
    });

    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, "Updated content here");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith({
        content: "Updated content here",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Recipe updated successfully", { duration: 3000 });
    expect(navigate).toHaveBeenCalledWith("/recipes/test-id");
  });

  it("submits both fields when both are changed", async () => {
    const mockUpdateRecipe = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
      updateRecipe: mockUpdateRecipe,
      loading: false,
      error: undefined,
      data: undefined,
    });

    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New Title");
    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, "New content");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith({
        title: "New Title",
        content: "New content",
      });
    });
  });

  it("shows error toast on submission failure", async () => {
    const mockUpdateRecipe = vi.fn().mockRejectedValue(new Error("Update failed"));
    vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
      updateRecipe: mockUpdateRecipe,
      loading: false,
      error: undefined,
      data: undefined,
    });

    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Modified Title");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update recipe");
      expect(mockUpdateRecipe).toHaveBeenCalledWith({ title: "Modified Title" });
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it("disables inputs and buttons during submission", async () => {
    const mockUpdateRecipe = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves
        })
    );
    vi.mocked(useUpdateRecipeHook.useUpdateRecipe).mockReturnValue({
      updateRecipe: mockUpdateRecipe,
      loading: true, // Set loading to true to simulate submission state
      error: undefined,
      data: undefined,
    });

    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });
    const saveButton = screen.getByRole("button", { name: /saving\.\.\./i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(titleInput).toBeDisabled();
    expect(contentInput).toBeDisabled();
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});

describe("RecipeEditForm: Cancel Action", () => {
  it("navigates back to recipe detail when cancel is clicked", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={mockInitialValue} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    expect(navigate).toHaveBeenCalledWith("/recipes/test-id");
  });
});

describe("RecipeEditForm: Character Counter Updates", () => {
  it("updates title character counter as user types", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={{ title: "", content: "test" }} />);

    const titleInput = screen.getByRole("textbox", { name: /recipe title/i });

    await userEvent.type(titleInput, "Hello");

    expect(screen.getByText(/5\s*\/\s*50/)).toBeInTheDocument();
  });

  it("updates content character counter as user types", async () => {
    render(<RecipeEditForm recipeId="test-id" initialValue={{ title: "test", content: "" }} />);

    const contentInput = screen.getByRole("textbox", { name: /recipe content/i });

    await userEvent.type(contentInput, "Test content");

    expect(screen.getByText(/12\s*\/\s*10000/)).toBeInTheDocument();
  });
});
