import type { RecipeListResponseDto } from "@/types";

interface FetchRecipesListParams {
  page: number;
  page_size: number;
  sort?: string;
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
