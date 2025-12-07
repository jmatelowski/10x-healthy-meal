import type { RecipeListResponseDto, RecipeDto } from "@/types";

interface FetchRecipesListParams {
  page: number;
  page_size: number;
  sort?: string;
}

function handleApiError(response: Response, defaultMessage: string): never {
  let errorMessage = defaultMessage;

  if (response.status === 400) {
    errorMessage = "Invalid recipe ID";
  } else if (response.status === 404) {
    errorMessage = "Recipe not found";
  } else if (response.status >= 500) {
    errorMessage = "Server error. Please try again later";
  }

  throw new Error(errorMessage);
}

export async function fetchRecipesList({
  page,
  page_size,
  sort,
}: FetchRecipesListParams): Promise<RecipeListResponseDto> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
  });
  if (sort) {
    params.append("sort", sort);
  }
  const res = await fetch(`/api/recipes?${params.toString()}`);
  if (!res.ok) throw new Error("Błąd pobierania przepisów");
  return res.json();
}

export async function fetchRecipe(id: string): Promise<RecipeDto> {
  const response = await fetch(`/api/recipes/${id}`);

  if (!response.ok) {
    handleApiError(response, "Failed to fetch recipe");
  }

  return response.json();
}

export async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    handleApiError(response, "Failed to delete recipe");
  }
}
