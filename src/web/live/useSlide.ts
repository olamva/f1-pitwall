import { useLayoutEffect, useRef, type RefObject } from "react";

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
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
    });
  });
};
