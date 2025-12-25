import { CatalogFilters, PriceBucket, PriceUnit, SortOption } from "./types";

// Parse query params from URL search params
export function parseFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): CatalogFilters {
  const get = (key: string): string | undefined => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const getArray = (key: string): string[] => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").filter(Boolean);
    return [];
  };

  return {
    query: get("q") || undefined,
    sort: (get("sort") as SortOption) || undefined,
    priceBucket: (get("price") as PriceBucket) || undefined,
    priceUnit: (get("unit") as PriceUnit) || undefined,
    tags: getArray("tags").length > 0 ? getArray("tags") : undefined,
    availability:
      (get("availability") as "all" | "available" | "limited") || undefined,
    locationId: get("location") || undefined,
    page: get("page") ? parseInt(get("page")!, 10) : undefined,
  };
}

// Serialize filters to URL search params
export function serializeFilters(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.sort && filters.sort !== "popular") params.set("sort", filters.sort);
  if (filters.priceBucket) params.set("price", filters.priceBucket);
  if (filters.priceUnit) params.set("unit", filters.priceUnit);
  if (filters.tags && filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }
  if (filters.availability && filters.availability !== "all") {
    params.set("availability", filters.availability);
  }
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.page && filters.page > 1) params.set("page", filters.page.toString());

  return params;
}

// Build URL with filters
export function buildFilterUrl(
  basePath: string,
  filters: CatalogFilters
): string {
  const params = serializeFilters(filters);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

// Update a single filter while preserving others
export function updateFilter<K extends keyof CatalogFilters>(
  currentFilters: CatalogFilters,
  key: K,
  value: CatalogFilters[K]
): CatalogFilters {
  return {
    ...currentFilters,
    [key]: value,
    // Reset page when filters change (except when changing page itself)
    ...(key !== "page" ? { page: 1 } : {}),
  };
}

// Remove a filter
export function removeFilter(
  currentFilters: CatalogFilters,
  key: keyof CatalogFilters
): CatalogFilters {
  const { [key]: _, ...rest } = currentFilters;
  return { ...rest, page: 1 };
}

// Check if any filters are active (excluding default values)
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.query ||
      filters.priceBucket ||
      filters.priceUnit ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.availability && filters.availability !== "all") ||
      filters.locationId
  );
}

// Get human-readable filter summary
export function getFilterSummary(filters: CatalogFilters): string[] {
  const summary: string[] = [];

  if (filters.query) summary.push(`Otsing: "${filters.query}"`);
  if (filters.priceBucket) {
    const labels: Record<string, string> = {
      "0-15": "0–15€",
      "15-30": "15–30€",
      "30+": "30€+",
    };
    summary.push(`Hind: ${labels[filters.priceBucket]}`);
  }
  if (filters.priceUnit) {
    summary.push(`Ühik: ${filters.priceUnit === "hour" ? "tund" : "päev"}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    summary.push(`Sildid: ${filters.tags.join(", ")}`);
  }
  if (filters.availability === "available") {
    summary.push("Saadaval");
  } else if (filters.availability === "limited") {
    summary.push("Piiratud");
  }

  return summary;
}
