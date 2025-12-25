"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CatalogFilters, SortOption } from "@/lib/catalog/types";
import { buildFilterUrl, updateFilter } from "@/lib/catalog/query";
import { FiltersPanel } from "./FiltersPanel";
import { Search, SlidersHorizontal } from "lucide-react";

interface SortBarProps {
  filters: CatalogFilters;
  totalResults: number;
  showMobileFilters?: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Populaarsed" },
  { value: "price-asc", label: "Hind: odavam enne" },
  { value: "price-desc", label: "Hind: kallim enne" },
  { value: "newest", label: "Uusimad" },
];

export function SortBar({ filters, totalResults, showMobileFilters = true }: SortBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSortChange = useCallback(
    (value: SortOption) => {
      const newFilters = updateFilter(filters, "sort", value);
      const url = buildFilterUrl(pathname, newFilters);
      router.push(url, { scroll: false });
    },
    [filters, pathname, router]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formData.get("q") as string;
      const newFilters = updateFilter(filters, "query", query || undefined);
      const url = buildFilterUrl(pathname, newFilters);
      router.push(url, { scroll: false });
    },
    [filters, pathname, router]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          type="search"
          placeholder="Otsi tööriistu..."
          defaultValue={filters.query || ""}
          className="pl-9"
        />
      </form>

      <div className="flex items-center gap-2">
        {/* Results count */}
        <span className="text-sm text-muted whitespace-nowrap">
          {totalResults} tööriista
        </span>

        {/* Mobile filters button */}
        {showMobileFilters && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtrid
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtrid</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersPanel filters={filters} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Sort dropdown */}
        <Select
          value={filters.sort || "popular"}
          onValueChange={(value) => handleSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sorteeri" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
