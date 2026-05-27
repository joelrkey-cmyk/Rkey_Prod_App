import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  try {
    return twMerge(clsx(inputs));
  } catch (e) {
    return clsx(inputs);
  }
}
