import { useLayoutEffect, useRef, type RefObject } from "react";

const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const EDGE = 64;

export const floor = (
  cells: Map<string, HTMLElement>,
  contents: Map<string, HTMLElement>,
  id: string,
) =>
  Math.max(
    cells.get(id)!.getBoundingClientRect().bottom,
    ...[...contents].flatMap(([k, el]) =>
      k === id ? [] : [el.getBoundingClientRect().bottom],
    ),
  );

export const edge = (y: number, start: number, end: number) => {
  const top = Math.min(EDGE, start);
  const bottom = Math.max(innerHeight - EDGE, start);
  if (y < top) return -(top - y) / 3;
  if (y <= bottom) return 0;
  return Math.min((y - bottom) / 3, Math.max(0, end - innerHeight));
};

export const pin = (card: HTMLElement) =>
  Object.assign(card.style, {
    width: `${card.offsetWidth}px`,
    height: `${card.offsetHeight}px`,
  });

export const settle = (card: HTMLElement) => {
  const { translate, width, height } = card.style;
  ["translate", "width", "height"].forEach((p) => card.style.removeProperty(p));
  if (!translate) return;
  card.parentElement?.animate([{ zIndex: 30 }, { zIndex: 30 }], 250);
  card.animate(
    [
      { translate, width, height, scale: 1.03 },
      {
        translate: "0 0",
        width: `${card.offsetWidth}px`,
        height: `${card.offsetHeight}px`,
        scale: 1,
      },
    ],
    { duration: 250, easing: EASE },
  );
};

export const useSlide = (
  editing: boolean,
  layout: unknown,
  cells: RefObject<Map<string, HTMLDivElement>>,
  held: () => string | undefined,
) => {
  const spots = useRef(new Map<string, [number, number]>());
  const shown = useRef(layout);
  useLayoutEffect(() => {
    if (!editing) return spots.current.clear();
    const moved = shown.current !== layout;
    shown.current = layout;
    cells.current.forEach((el, id) => {
      const spot: [number, number] = [el.offsetLeft, el.offsetTop];
      const was = spots.current.get(id);
      spots.current.set(id, spot);
      if (!was || !moved || id === held()) return;
      const [dx, dy] = [was[0] - spot[0], was[1] - spot[1]];
      if (dx || dy)
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
          duration: 220,
          easing: EASE,
        });
    });
  });
};
