import type { Mark } from "./view.ts";

export const MARK: Record<Mark, string> = {
  overall: "text-purple",
  personal: "text-emerald-400",
  normal: "text-yellow-300",
  none: "text-zinc-600",
};

export const BAR: Record<Mark, string> = {
  overall: "bg-purple",
  personal: "bg-sector-personal",
  normal: "bg-sector-normal",
  none: "bg-zinc-700",
};

export const CHIP: Record<Mark, string> = {
  overall: "bg-purple text-white",
  personal: "bg-sector-personal text-black",
  normal: "bg-zinc-800 text-sector-normal-text ring-1 ring-zinc-700 ring-inset",
  none: "bg-zinc-800 text-zinc-50 ring-1 ring-zinc-700 ring-inset",
};
