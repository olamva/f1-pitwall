import { useLayoutEffect, type RefObject } from "react";
import { GAP } from "./layout.ts";

type Els = Map<string, HTMLDivElement>;

export const useCentered = (
  below: Map<string, string>,
  grid: RefObject<HTMLDivElement | null>,
  cells: Els,
  contents: Els,
  push: Map<string, number>,
) =>
  useLayoutEffect(() => {
    const y = (el: HTMLElement): number =>
      el.offsetTop +
      (el.offsetParent === grid.current
        ? 0
        : y(el.offsetParent as HTMLElement));
    below.forEach((b, a) => {
      const cell = cells.get(a);
      const upper = contents.get(a);
      const lower = contents.get(b);
      const bar = cell?.querySelector<HTMLElement>(":scope > [role=separator]");
      if (!cell || !upper || !lower || !bar) return;
      const shift = (push.get(b) ?? 0) - (push.get(a) ?? 0);
      const mid = (y(upper) + upper.offsetHeight + y(lower) + shift) / 2;
      bar.style.translate = `0 ${mid - y(cell) - cell.offsetHeight + GAP / 2}px`;
    });
  });
