import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

export function getPriceUnitLabel(unit: "hour" | "day"): string {
  return unit === "hour" ? "tund" : "päev";
}
