"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogFilters, PriceBucket, PriceUnit } from "@/lib/catalog/types";
import { buildFilterUrl, updateFilter, hasActiveFilters } from "@/lib/catalog/query";
import { AVAILABLE_TAGS } from "@/lib/catalog/data";
import { X } from "lucide-react";

interface FiltersPanelProps {
  filters: CatalogFilters;
  showLocationFilter?: boolean;
  onClose?: () => void;
}

export function FiltersPanel({ filters, showLocationFilter = false, onClose }: FiltersPanelProps) {
  const router = useRouter();
  const pathname = usePathname();

  const applyFilter = useCallback(
    <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
      const newFilters = updateFilter(filters, key, value);
      const url = buildFilterUrl(pathname, newFilters);
      router.push(url, { scroll: false });
    },
    [filters, pathname, router]
  );

  const clearAllFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const toggleTag = useCallback(
    (tag: string) => {
      const currentTags = filters.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      applyFilter("tags", newTags.length > 0 ? newTags : undefined);
    },
    [filters.tags, applyFilter]
  );

  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="space-y-6">
      {/* Header with close button (mobile) */}
      {onClose && (
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-lg font-semibold">Filtrid</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Sulge</span>
          </Button>
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="w-full justify-start text-muted hover:text-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Tühista filtrid
        </Button>
      )}

      {/* Price bucket */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Hind</Label>
        <Select
          value={filters.priceBucket || ""}
          onValueChange={(value) =>
            applyFilter("priceBucket", (value as PriceBucket) || undefined)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Kõik hinnad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Kõik hinnad</SelectItem>
            <SelectItem value="0-15">0–15€</SelectItem>
            <SelectItem value="15-30">15–30€</SelectItem>
            <SelectItem value="30+">30€+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price unit */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Ühik</Label>
        <Select
          value={filters.priceUnit || ""}
          onValueChange={(value) =>
            applyFilter("priceUnit", (value as PriceUnit) || undefined)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Kõik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Kõik</SelectItem>
            <SelectItem value="hour">Tunnitasu</SelectItem>
            <SelectItem value="day">Päevatasu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Availability */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Saadavus</Label>
        <Select
          value={filters.availability || "all"}
          onValueChange={(value) =>
            applyFilter(
              "availability",
              value === "all" ? undefined : (value as "available" | "limited")
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Kõik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kõik</SelectItem>
            <SelectItem value="available">Saadaval</SelectItem>
            <SelectItem value="limited">Piiratud</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Sildid</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.slice(0, 12).map((tag) => {
            const isSelected = filters.tags?.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card hover:border-accent/50 hover:bg-background"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location filter (conditional) */}
      {showLocationFilter && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Asukoht</Label>
            <Select
              value={filters.locationId || ""}
              onValueChange={(value) =>
                applyFilter("locationId", value || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Kõik asukohad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Kõik asukohad</SelectItem>
                <SelectItem value="locker-1">Tallinn Ülemiste</SelectItem>
                <SelectItem value="locker-2">Tallinn Kesklinn</SelectItem>
                <SelectItem value="locker-3">Tartu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Apply button (mobile) */}
      {onClose && (
        <Button className="w-full" onClick={onClose}>
          Näita tulemusi
        </Button>
      )}
    </div>
  );
}
