import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHash(str: string) {
  return Math.abs([...(str || '')].reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0));
}
