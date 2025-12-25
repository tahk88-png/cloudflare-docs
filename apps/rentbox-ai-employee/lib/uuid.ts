import { z } from "zod";

export const UUID = z.string().uuid();

export function isUuid(value: string): boolean {
  return UUID.safeParse(value).success;
}

