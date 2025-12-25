import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/lib/catalog/types";
import { buildFilterUrl } from "@/lib/catalog/query";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  filters: CatalogFilters;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  filters,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    return buildFilterUrl(basePath, { ...filters, page });
  };

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 1; // Pages to show on each side of current
    const range: number[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    // Add first page
    if (currentPage - delta > 2) {
      range.unshift(-1); // Ellipsis indicator
    }
    range.unshift(1);

    // Add last page
    if (currentPage + delta < totalPages - 1) {
      range.push(-2); // Ellipsis indicator
    }
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Lehekülgede navigatsioon"
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        asChild={currentPage > 1}
        disabled={currentPage <= 1}
        className="h-9 w-9"
      >
        {currentPage > 1 ? (
          <Link href={getPageUrl(currentPage - 1)} aria-label="Eelmine lehekülg">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
      </Button>

      {/* Page numbers */}
      {visiblePages.map((page, index) => {
        if (page < 0) {
          // Ellipsis
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-muted"
            >
              …
            </span>
          );
        }

        const isCurrentPage = page === currentPage;

        return (
          <Button
            key={page}
            variant={isCurrentPage ? "default" : "outline"}
            size="icon"
            asChild={!isCurrentPage}
            className="h-9 w-9"
            aria-current={isCurrentPage ? "page" : undefined}
          >
            {isCurrentPage ? (
              <span>{page}</span>
            ) : (
              <Link href={getPageUrl(page)}>{page}</Link>
            )}
          </Button>
        );
      })}

      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        asChild={currentPage < totalPages}
        disabled={currentPage >= totalPages}
        className="h-9 w-9"
      >
        {currentPage < totalPages ? (
          <Link href={getPageUrl(currentPage + 1)} aria-label="Järgmine lehekülg">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}
