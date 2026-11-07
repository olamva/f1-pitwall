import { useLayoutEffect, useRef, type RefObject } from "react";

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

export const pin = (card: HTMLElement) =>
  Object.assign(card.style, {
    width: `${card.offsetWidth}px`,
    height: `${card.offsetHeight}px`,
  });

export const settle = (card: HTMLElement) => {
  const { translate, width, height } = card.style;
  ["translate", "width", "height"].forEach((p) => card.style.removeProperty(p));
  if (translate)
    card.animate(
      [
        { translate, width, height, scale: 1.03, zIndex: 30 },
        {
          translate: "0 0",
          width: `${card.offsetWidth}px`,
          height: `${card.offsetHeight}px`,
          scale: 1,
          zIndex: 30,
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
