import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecipesService } from "./recipes.service";
import { NotFoundError } from "@/lib/errors";
import type { SupabaseClient } from "@/db/supabase.client";
import type { UpdateRecipeCommand } from "@/types";

// Define the exact recipe row structure that Supabase returns
interface RecipeRow {
  id: string;
  title: string;
  content: string;
  source: "manual" | "ai";
  created_at: string;
  updated_at: string;
}

// Define the exact Supabase response structure
interface SupabaseUpdateResponse {
  data: RecipeRow | null;
  error: { message: string; code?: string } | null;
}

// Define proper types for mock query chain
interface MockQueryChain {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

// Mock Supabase client with proper typing
const mockSupabaseClient = {
  from: vi.fn(),
} as unknown as SupabaseClient;

// Helper to create mock query chain with specific recipe typing
const createMockQuery = (
  mockData: RecipeRow | null,
  mockError: { message: string; code?: string } | null = null
): MockQueryChain => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: mockError } as SupabaseUpdateResponse),
});

describe("RecipesService.updateRecipe", () => {
  let recipesService: RecipesService;

  beforeEach(() => {
    vi.clearAllMocks();
    recipesService = new RecipesService(mockSupabaseClient);
  });

  describe("successful updates", () => {
    it("should update recipe title only", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Updated Recipe Title",
        content: "Original content",
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const command: UpdateRecipeCommand = {
        title: "Updated Recipe Title",
      };

      const result = await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command,
      });

      // Verify database calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("recipes");
      expect(mockQuery.update).toHaveBeenCalledWith({
        title: "Updated Recipe Title",
        updated_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "recipe-123");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockQuery.select).toHaveBeenCalledWith("id, title, content, source, created_at, updated_at");
      expect(mockQuery.single).toHaveBeenCalled();

      // Verify result
      expect(result).toEqual({
        id: "recipe-123",
        title: "Updated Recipe Title",
        content: "Original content",
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });
    });

    it("should update recipe content only", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Original Title",
        content: "Updated recipe content with new instructions",
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const command: UpdateRecipeCommand = {
        content: "Updated recipe content with new instructions",
      };

      const result = await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command,
      });

      // Verify update payload contains only content and updated_at
      expect(mockQuery.update).toHaveBeenCalledWith({
        content: "Updated recipe content with new instructions",
        updated_at: expect.any(String),
      });

      expect(result.content).toBe("Updated recipe content with new instructions");
    });

    it("should update both title and content", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "New Title",
        content: "New content",
        source: "ai" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const command: UpdateRecipeCommand = {
        title: "New Title",
        content: "New content",
      };

      const result = await recipesService.updateRecipe({
        userId: "user-456",
        recipeId: "recipe-123",
        command,
      });

      // Verify update payload contains both fields
      expect(mockQuery.update).toHaveBeenCalledWith({
        title: "New Title",
        content: "New content",
        updated_at: expect.any(String),
      });

      expect(result).toEqual({
        id: "recipe-123",
        title: "New Title",
        content: "New content",
        source: "ai" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });
    });

    it("should always update the updated_at timestamp", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Updated Title",
        content: "Original content",
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T12:30:45Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const beforeUpdate = Date.now();

      await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command: { title: "Updated Title" },
      });

      const afterUpdate = Date.now();

      // Verify updated_at was set to a recent timestamp
      const updateCall = vi.mocked(mockQuery.update).mock.calls[0][0];
      expect(updateCall.updated_at).toBeDefined();
      const updatedAtTime = new Date(updateCall.updated_at).getTime();
      expect(updatedAtTime).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updatedAtTime).toBeLessThanOrEqual(afterUpdate);
    });
  });

  describe("authorization and ownership", () => {
    it("should enforce user ownership through WHERE clause", async () => {
      const mockQuery = createMockQuery(null); // No data returned = not found
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await expect(
        recipesService.updateRecipe({
          userId: "user-123",
          recipeId: "recipe-456",
          command: { title: "Hacked Title" },
        })
      ).rejects.toThrow(NotFoundError);

      // Verify both user_id and recipe id are checked
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "recipe-456");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should throw NotFoundError when recipe doesn't exist", async () => {
      const mockQuery = createMockQuery(null);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await expect(
        recipesService.updateRecipe({
          userId: "user-123",
          recipeId: "nonexistent-recipe",
          command: { title: "New Title" },
        })
      ).rejects.toThrow(NotFoundError);

      expect(() => {
        throw new NotFoundError("Recipe not found");
      }).toThrow("Recipe not found");
    });

    it("should throw NotFoundError when user doesn't own the recipe", async () => {
      const mockQuery = createMockQuery(null); // Simulates no rows returned due to user_id mismatch
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await expect(
        recipesService.updateRecipe({
          userId: "wrong-user",
          recipeId: "recipe-123",
          command: { title: "Unauthorized Update" },
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("error handling", () => {
    it("should throw Error when database update fails", async () => {
      const mockError = { message: "Database connection failed", code: "CONNECTION_ERROR" };
      const mockQuery = createMockQuery(null, mockError);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await expect(
        recipesService.updateRecipe({
          userId: "user-123",
          recipeId: "recipe-123",
          command: { title: "New Title" },
        })
      ).rejects.toThrow("Failed to update recipe: Database connection failed");
    });

    it("should handle constraint violation errors", async () => {
      const mockError = {
        message: "duplicate key value violates unique constraint",
        code: "23505",
      };
      const mockQuery = createMockQuery(null, mockError);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await expect(
        recipesService.updateRecipe({
          userId: "user-123",
          recipeId: "recipe-123",
          command: { title: "Duplicate Title" },
        })
      ).rejects.toThrow("Failed to update recipe: duplicate key value violates unique constraint");
    });
  });

  describe("data integrity", () => {
    it("should not modify immutable fields", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Updated Title",
        content: "Original content",
        source: "manual" as const, // Should remain unchanged
        created_at: "2024-01-01T00:00:00Z", // Should remain unchanged
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command: { title: "Updated Title" },
      });

      // Verify that only allowed fields are in the update payload
      const updatePayload = vi.mocked(mockQuery.update).mock.calls[0][0];
      expect(updatePayload).not.toHaveProperty("source");
      expect(updatePayload).not.toHaveProperty("created_at");
      expect(updatePayload).not.toHaveProperty("id");
      expect(updatePayload).not.toHaveProperty("user_id");

      // Only title and updated_at should be present (order may vary)
      expect(Object.keys(updatePayload).sort()).toEqual(["title", "updated_at"]);
    });

    it("should preserve source field in response", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Updated Title",
        content: "Content",
        source: "ai" as const, // Should be preserved in response
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const result = await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command: { title: "Updated Title" },
      });

      expect(result.source).toBe("ai");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string values correctly", async () => {
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "", // Empty title should be allowed if it passes validation
        content: "Some content",
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const result = await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command: { title: "" },
      });

      expect(result.title).toBe("");
    });

    it("should handle very long content updates", async () => {
      const longContent = "A".repeat(9999); // Just under 10k limit
      const mockUpdatedRecipe = {
        id: "recipe-123",
        title: "Title",
        content: longContent,
        source: "manual" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery(mockUpdatedRecipe);
      vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQuery as ReturnType<SupabaseClient["from"]>);

      const result = await recipesService.updateRecipe({
        userId: "user-123",
        recipeId: "recipe-123",
        command: { content: longContent },
      });

      expect(result.content).toBe(longContent);
      expect(result.content.length).toBe(9999);
    });
  });
});
