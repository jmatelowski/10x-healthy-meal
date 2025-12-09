import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RecipeEditPage from "./RecipeEditPage";
import * as useRecipeHook from "@/lib/hooks/useRecipe";

// Mock the useRecipe hook
vi.mock("@/lib/hooks/useRecipe");

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecipeEditPage: Loading State", () => {
  it("shows loading spinner while fetching recipe", () => {
    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      fetchRecipe: vi.fn(),
    });

    render(<RecipeEditPage id="test-id" />);

    expect(screen.getByText("Loading recipe...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument(); // LoadingSpinner has role="status"
  });
});

describe("RecipeEditPage: Error States", () => {
  it("shows not found message when recipe is not found", () => {
    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: undefined,
      loading: false,
      error: "Recipe not found",
      fetchRecipe: vi.fn(),
    });

    render(<RecipeEditPage id="test-id" />);

    expect(screen.getByText(/recipe not found/i)).toBeInTheDocument();
  });

  it("shows error message for general errors", () => {
    const mockFetchRecipe = vi.fn();
    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: undefined,
      loading: false,
      error: "Network error. Please check your connection and try again",
      fetchRecipe: mockFetchRecipe,
    });

    render(<RecipeEditPage id="test-id" />);

    expect(screen.getByText("Network error. Please check your connection and try again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows error when recipe data is not available", () => {
    const mockFetchRecipe = vi.fn();
    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      fetchRecipe: mockFetchRecipe,
    });

    render(<RecipeEditPage id="test-id" />);

    expect(screen.getByText("Recipe data not available")).toBeInTheDocument();
  });
});

describe("RecipeEditPage: Success State", () => {
  it("renders edit form with recipe data when loaded successfully", async () => {
    const mockRecipe = {
      id: "test-recipe-id",
      title: "Test Recipe",
      content: "Test content for the recipe",
      source: "manual" as const,
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: mockRecipe,
      loading: false,
      error: undefined,
      fetchRecipe: vi.fn(),
    });

    render(<RecipeEditPage id="test-recipe-id" />);

    // Check that the page heading is present
    expect(screen.getByRole("heading", { name: /edit recipe/i })).toBeInTheDocument();

    // Check that form fields are populated with recipe data
    await waitFor(() => {
      const titleInput = screen.getByRole("textbox", { name: /recipe title/i });
      const contentInput = screen.getByRole("textbox", { name: /recipe content/i });

      expect(titleInput).toHaveValue("Test Recipe");
      expect(contentInput).toHaveValue("Test content for the recipe");
    });

    // Check that action buttons are present
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls fetchRecipe on mount", () => {
    const mockFetchRecipe = vi.fn();
    vi.mocked(useRecipeHook.useRecipe).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      fetchRecipe: mockFetchRecipe,
    });

    render(<RecipeEditPage id="test-id" />);

    expect(mockFetchRecipe).toHaveBeenCalledTimes(1);
  });
});
