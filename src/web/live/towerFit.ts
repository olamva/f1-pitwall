import { useLayoutEffect, useState, type RefObject } from "react";

const RACE = ["int", "tyre", "last", "wide", "best", "pits", "status"];
const OTHER = ["lap", "sectors", "wide", "both", "tyre", "pits", "status"];

const fitFor = (level: number, race: boolean, qualifying: boolean) => {
  const on = new Set((race ? RACE : OTHER).slice(0, level));
  return {
    wide: on.has("wide"),
    int: on.has("int"),
    last: on.has("last") || on.has("both") || (!qualifying && on.has("lap")),
    best: on.has("best") || on.has("both") || (qualifying && on.has("lap")),
    sectors: on.has("sectors"),
    tyre: on.has("tyre"),
    pits: on.has("pits"),
    status: on.has("status"),
  };
};

export type Fit = ReturnType<typeof fitFor>;

export const useFit = (
  table: RefObject<HTMLTableElement | null>,
  race: boolean,
  qualifying: boolean,
) => {
  const [level, setLevel] = useState(RACE.length);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const box = table.current!.parentElement!;
    const observer = new ResizeObserver(() => setWidth(box.clientWidth));
    observer.observe(box);
    return () => observer.disconnect();
  }, [table]);
  useLayoutEffect(() => setLevel(RACE.length), [width, race, qualifying]);
  useLayoutEffect(() => {
    const node = table.current!;
    if (level && node.offsetWidth > node.parentElement!.clientWidth)
      setLevel(level - 1);
  });
  return fitFor(level, race, qualifying);
};
