export const ROW = 8;
export const GAP = 16;
export const NEW_WIDTH = 4;
const MIN_WIDTH = 2;
const EDGE = 64;
const ZONE = 40;
const TURN = 24;

export type Size = "phone" | "tablet" | "desktop" | "display";
export type Tile = { id: string; h: number | null };
export type Column = { w: number; tiles: Tile[] };
export type Spot = { col: number; top: number; height: number };
export type Target =
  { col: number; top: number; bottom: number } | { at: number };

export const SIZES: Size[] = ["phone", "tablet", "desktop", "display"];
export const MAX_COLUMNS: Record<Size, number> = {
  phone: 2,
  tablet: 3,
  desktop: 4,
  display: 6,
};

export const place = (columns: Column[], height: (id: string) => number) => {
  const spots = new Map<string, Spot>();
  const ends = columns.map((c, col) =>
    c.tiles.reduce((top, t) => {
      const h = height(t.id);
      if (!h) return top;
      spots.set(t.id, { col, top, height: h });
      return top + h;
    }, 0),
  );
  return { spots, ends };
};

export const stick = (
  columns: Column[],
  spots: Map<string, Spot>,
  ends: number[],
  avail: number,
  kind: (id: string) => string,
  px: (id: string) => number,
) => {
  const over = ends.map((end) => Math.max(0, end * ROW - GAP - avail - 1));
  const sticky = new Set(columns.length < 2 ? [] : columns.keys());
  const stretch = new Map<string, number>();
  const push = new Map<string, number>();
  sticky.forEach((i) => {
    const tiles = columns[i]!.tiles.filter((t) => spots.has(t.id));
    const at = tiles.findLastIndex(
      (t) => t.h === null && kind(t.id) === "fill",
    );
    const last = tiles[at];
    if (over[i] || !last) return;
    let bottom = avail;
    tiles
      .slice(at + 1)
      .reverse()
      .forEach((t) => {
        bottom -= px(t.id);
        push.set(t.id, bottom - spots.get(t.id)!.top * ROW);
        bottom -= GAP;
      });
    stretch.set(last.id, Math.max(0, bottom - spots.get(last.id)!.top * ROW));
  });
  return { over, sticky, stretch, push };
};

export const autoscroll = (
  y: number,
  start: number,
  end: number,
  view: number,
) => {
  const top = Math.min(EDGE, start);
  const bottom = Math.max(view - EDGE, start);
  if (y < top) return -(top - y) / 3;
  if (y <= bottom) return 0;
  return Math.min((y - bottom) / 3, Math.max(0, end - view));
};

export const bounds = (columns: Column[], width: number) => {
  const unit =
    (width - GAP * (columns.length - 1)) / columns.reduce((n, c) => n + c.w, 0);
  let left = 0;
  return columns.map((c) => {
    const span = { left, width: c.w * unit };
    left += span.width + GAP;
    return span;
  });
};

export const columnAt = (columns: Column[], width: number, x: number) => {
  const spans = bounds(columns, width);
  const i = spans.findIndex((s) => x < s.left + s.width + GAP / 2);
  return i < 0 ? columns.length - 1 : i;
};

export const gapAt = (columns: Column[], width: number, x: number) =>
  bounds(columns, width).findIndex(
    (s, i) => i > 0 && Math.abs(x - s.left + GAP / 2) < ZONE / 2,
  );

const without = (columns: Column[], id: string) =>
  columns.map((c) => ({ ...c, tiles: c.tiles.filter((t) => t.id !== id) }));

export const drop = (
  columns: Column[],
  height: (id: string) => number,
  id: string,
  target: Target,
) => {
  const tile = columns.flatMap((c) => c.tiles).find((t) => t.id === id)!;
  const rest = without(columns, id);
  if ("at" in target)
    return rest.toSpliced(target.at, 0, { w: NEW_WIDTH, tiles: [tile] });
  const others = rest[target.col]!.tiles;
  const home = columns[target.col]!.tiles.findIndex((t) => t.id === id);
  const { spots } = place(home < 0 ? rest : columns, height);
  const middle = (i: number) => {
    const s = spots.get(others[i]!.id);
    return s ? s.top + s.height / 2 : NaN;
  };
  let at =
    home < 0 ? others.filter((_, i) => middle(i) < target.top).length : home;
  if (home >= 0) {
    while (at > 0 && target.top < middle(at - 1)) at--;
    while (at >= home && at < others.length && target.bottom > middle(at)) at++;
  }
  return rest.map((c, i) =>
    i === target.col
      ? { ...c, tiles: [...others.slice(0, at), tile, ...others.slice(at)] }
      : c,
  );
};

export const tidy = (columns: Column[]) =>
  columns.filter((c) => c.tiles.length);

export const remove = (columns: Column[], id: string) =>
  tidy(without(columns, id));

export const aim = (
  d: {
    id: string;
    start: Column[];
    x: number;
    y: number;
    sx: number;
    dy: number;
    gap: number;
  },
  box: { left: number; right: number; top: number; width: number },
  max: number,
  rows: number,
  lift: (col: number) => number,
): Target => {
  const room = remove(d.start, d.id).length < max;
  if (room && d.x < box.left + ZONE && d.x < d.sx - TURN) return { at: 0 };
  if (room && d.x > box.right - ZONE && d.x > d.sx + TURN)
    return { at: d.start.length };
  if (room && d.gap > 0) return { at: d.gap };
  const col = columnAt(d.start, box.width, d.x - box.left);
  const top = (d.y - d.dy - box.top - lift(col)) / ROW;
  return { col, top, bottom: top + rows - GAP / ROW };
};

export const add = (
  columns: Column[],
  height: (id: string) => number,
  id: string,
) => {
  if (!columns.length) return [{ w: 12, tiles: [{ id, h: null }] }];
  const { ends } = place(columns, height);
  const col = ends.indexOf(Math.min(...ends));
  return columns.map((c, i) =>
    i === col ? { ...c, tiles: [...c.tiles, { id, h: null }] } : c,
  );
};

export const widen = (
  columns: Column[],
  width: number,
  col: number,
  right: number,
) => {
  const next = columns[col + 1];
  if (!next) return columns;
  const spans = bounds(columns, width);
  const unit = spans[col]!.width / columns[col]!.w;
  const pair = columns[col]!.w + next.w;
  const w = Math.max(
    MIN_WIDTH,
    Math.min(pair - MIN_WIDTH, Math.round((right - spans[col]!.left) / unit)),
  );
  return columns.map((c, i) =>
    i === col ? { ...c, w } : i === col + 1 ? { ...c, w: pair - w } : c,
  );
};

export const resize = (columns: Column[], id: string, h: number | null) =>
  columns.map((c) => ({
    ...c,
    tiles: c.tiles.map((t) => (t.id === id ? { ...t, h } : t)),
  }));

export const same = (a: Column[], b: Column[]) =>
  JSON.stringify(a) === JSON.stringify(b);
