export const COLS = 12;
export const ROW = 8;
export const GAP = 16;

export type Size = "phone" | "tablet" | "desktop";
export type Item = { id: string; x: number; w: number; h: number | null };
export type Layout = Record<Size, Item[]>;
export type Place = { id: string; x: number; y: number; w: number; h: number };

export const columns = (size: Size) => (size === "phone" ? 1 : COLS);

export const rowsOf = (px: number) => Math.ceil((px + GAP) / ROW);

export const pack = (items: Item[], height: (id: string) => number) => {
  const taken: [from: number, to: number][][] = Array.from(
    { length: COLS },
    () => [],
  );
  return items.map(({ id, x, w }): Place => {
    const h = height(id);
    const span = taken.slice(x, x + w);
    const fits = (y: number) =>
      span.every((col) => col.every(([a, b]) => y + h <= a || y >= b));
    const y = [0, ...span.flat().map(([, b]) => b)]
      .sort((a, b) => a - b)
      .find(fits)!;
    span.forEach((col) => col.push([y, y + h]));
    return { id, x, y, w, h };
  });
};

export const move = (
  items: Item[],
  height: (id: string) => number,
  id: string,
  x: number,
  y: number,
  cols: number,
) => {
  const me = items.find((i) => i.id === id)!;
  const others = items.filter((i) => i !== me);
  const center = y + height(id) / 2;
  const above = new Set(
    pack(others, height)
      .filter((p) => p.y + p.h / 2 < center)
      .map((p) => p.id),
  );
  return [
    ...others.filter((i) => above.has(i.id)),
    { ...me, x: Math.max(0, Math.min(cols - me.w, x)) },
    ...others.filter((i) => !above.has(i.id)),
  ];
};

export const add = (
  items: Item[],
  height: (id: string) => number,
  item: Item,
  cols: number,
) =>
  Array.from({ length: cols - item.w + 1 }, (_, x) => [
    ...items,
    { ...item, x },
  ]).reduce((best, next) =>
    pack(next, height).at(-1)!.y < pack(best, height).at(-1)!.y ? next : best,
  );

export const same = (a: Item[], b: Item[]) =>
  JSON.stringify(a) === JSON.stringify(b);
