import { useSyncExternalStore } from "react";
import { SIZES } from "./layout.ts";

const QUERIES = [
  "(width >= 48rem)",
  "(width >= 80rem) and (pointer: fine)",
  "(width >= 120rem) and (pointer: fine)",
].map(matchMedia);

const sizeNow = () => SIZES[QUERIES.findLastIndex((q) => q.matches) + 1]!;

export const useSize = () =>
  useSyncExternalStore((change) => {
    QUERIES.forEach((q) => q.addEventListener("change", change));
    return () =>
      QUERIES.forEach((q) => q.removeEventListener("change", change));
  }, sizeNow);
