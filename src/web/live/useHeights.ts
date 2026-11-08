import { useLayoutEffect, useState, type RefObject } from "react";

export const useHeights = (
  contents: RefObject<Map<string, HTMLDivElement>>,
  probe: RefObject<HTMLDivElement | null>,
  skip: (id: string) => boolean,
  deps: unknown[],
) => {
  const [px, setPx] = useState<Record<string, number>>({});
  const [avail, setAvail] = useState(Infinity);
  useLayoutEffect(() => {
    const read = () => {
      setAvail(probe.current!.offsetHeight);
      setPx((old) => {
        let next = old;
        contents.current.forEach((el, id) => {
          if (skip(id)) return;
          const value = el.offsetHeight;
          if (Math.abs((old[id] ?? -99) - value) > 1)
            next = { ...next, [id]: value };
        });
        return next;
      });
    };
    read();
    const observer = new ResizeObserver(read);
    contents.current.forEach((el) => observer.observe(el));
    observer.observe(probe.current!);
    return () => observer.disconnect();
  }, deps);
  return { px, avail };
};
