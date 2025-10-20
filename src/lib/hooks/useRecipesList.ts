import { useEffect, useState, useCallback } from "react";
import type { PaginationMetaDto, RecipeListItemDto } from "@/types";
import { fetchRecipesList } from "@/lib/api/recipes";

export interface RecipesListState {
  loading: boolean;
  error?: Error;
  data: RecipeListItemDto[];
  pagination: PaginationMetaDto | undefined;
}

export interface UseRecipesListParams {
  initialPage?: number;
  pageSize?: number;
  sort?: string;
}

export function useRecipesList({ initialPage = 1, pageSize = 20, sort }: UseRecipesListParams) {
  const [state, setState] = useState<RecipesListState>({
    loading: true,
    data: [],
    pagination: undefined,
  });
  const [page, setPage] = useState(initialPage);

  const fetchData = useCallback(async () => {
    setState({ loading: true, data: [], pagination: undefined, error: undefined });
    try {
      const { data, pagination } = await fetchRecipesList({ page, page_size: pageSize, sort });
      setState({
        loading: false,
        data,
        pagination,
        error: undefined,
      });
    } catch (error: unknown) {
      setState({
        loading: false,
        data: [],
        pagination: undefined,
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  }, [page, pageSize, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const gotoPage = (newPage: number) => setPage(newPage);

  return { state, gotoPage };
}
