import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHash(str: string) {
  return Math.abs([...(str || '')].reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0));
}

export const FALLBACK_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop', // Salad
  'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?q=80&w=1200&auto=format&fit=crop', // Pancakes
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&auto=format&fit=crop', // Pizza
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1200&auto=format&fit=crop', // Toast
  'https://images.unsplash.com/photo-1484723046838-412e88984f2f?q=80&w=1200&auto=format&fit=crop', // French Toast
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=1200&auto=format&fit=crop', // Cake
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1200&auto=format&fit=crop', // Fish/Salmon
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop', // Steak
  'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=1200&auto=format&fit=crop', // Pasta
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop', // Buddha Bowl
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=1200&auto=format&fit=crop', // Breakfast
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop', // BBQ
  'https://images.unsplash.com/photo-1540189567005-5b30d295994b?q=80&w=1200&auto=format&fit=crop', // Gourmet Salad
  'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=1200&auto=format&fit=crop', // Pasta Red
];

export function getDeterministicFoodImage(seed: string) {
  const index = getHash(seed) % FALLBACK_FOOD_IMAGES.length;
  return FALLBACK_FOOD_IMAGES[index];
}
