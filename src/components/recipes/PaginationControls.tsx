import React from "react";
import type { PaginationMetaDto } from "@/types";

interface PaginationControlsProps {
  pagination: PaginationMetaDto;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({ pagination, onPageChange }) => {
  const { page, page_size, total } = pagination;
  const maxPage = Math.max(1, Math.ceil(total / page_size));

  if (maxPage <= 1) return null;

  return (
    <nav role="navigation" aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
      <button
        className="btn px-3 py-1"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        aria-disabled={page === 1}
      >
        Previous
      </button>
      <span className="text-sm px-2">
        Page {page} of {maxPage}
      </span>
      <button
        className="btn px-3 py-1"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= maxPage}
        aria-label="Next page"
        aria-disabled={page >= maxPage}
      >
        Next
      </button>
    </nav>
  );
};
