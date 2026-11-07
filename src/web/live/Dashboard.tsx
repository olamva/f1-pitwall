import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { claim } from "../Swipe.tsx";
import { save, subscribe } from "../synced.ts";
import { EditBar } from "./EditBar.tsx";
import { Tile, TOP } from "./Tile.tsx";
import { edge, floor, pin, settle, useSlide } from "./useSlide.ts";
import {
  add,
  columnAt,
  drop,
  GAP,
  MAX_COLUMNS,
  place,
  remove,
  resize,
  ROW,
  same,
  SIZES,
  tidy,
  widen,
  type Column,
  type Size,
  type Target,
} from "./layout.ts";
import {
  DEFAULT_LAYOUT,
  height,
  isWidget,
  rowsFor,
  WIDGETS,
  type WidgetId,
} from "./widgets.ts";

const QUERIES = [
  "(width >= 80rem) and (pointer: fine)",
  "(width >= 48rem)",
].map(matchMedia);
const KEYS: Record<Size, string> = {
  phone: "layoutPhone",
  tablet: "layoutTablet",
  desktop: "layoutDesktop",
};
const PREVIEW: Record<Size, string | undefined> = {
  phone: "430px",
  tablet: "calc(1210px - 2rem)",
  desktop: undefined,
};
const ESTIMATE = 30;
const EDIT_MIN = 12;
const ZONE = 40;

const sizeNow = (): Size =>
  QUERIES[0]!.matches ? "desktop" : QUERIES[1]!.matches ? "tablet" : "phone";

const useSize = () =>
  useSyncExternalStore((change) => {
    QUERIES.forEach((q) => q.addEventListener("change", change));
    return () =>
      QUERIES.forEach((q) => q.removeEventListener("change", change));
  }, sizeNow);

const useLayout = (size: Size) => {
  const raw = useSyncExternalStore(subscribe, () =>
    localStorage.getItem(KEYS[size]),
  );
  const columns = useMemo<Column[]>(
    () =>
      tidy(
        (JSON.parse(raw ?? "null") ?? DEFAULT_LAYOUT[size]).map(
          (c: Column) => ({
            ...c,
            tiles: c.tiles.filter((t) => isWidget(t.id)),
          }),
        ),
      ),
    [raw, size],
  );
  return [columns, (next: Column[]) => save(KEYS[size], tidy(next))] as const;
};

const prevent = (e: TouchEvent) => e.preventDefault();

type Drag = {
  kind: "move" | "size";
  id: string;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  start: Column[];
  live: boolean;
  natural: number;
  tail: number;
};

interface DashboardProps {
  tiles: Record<WidgetId, () => ReactNode>;
  off: Partial<Record<WidgetId, boolean>>;
  editing: boolean;
  slot: HTMLElement | null;
  onEdit: () => void;
  onDone: () => void;
}

export const Dashboard = ({
  tiles,
  off,
  editing,
  slot,
  onEdit,
  onDone,
}: DashboardProps) => {
  const real = useSize();
  const sizes = SIZES.slice(0, SIZES.indexOf(real) + 1);
  const [view, setView] = useState<Size | null>(null);
  const size = editing && view && sizes.includes(view) ? view : real;
  const [saved, setSaved] = useLayout(size);
  const [draft, setDraft] = useState<Column[] | null>(null);
  const [active, setActive] = useState<Drag | null>(null);
  const [px, setPx] = useState<Record<string, number>>({});
  const [avail, setAvail] = useState(Infinity);
  const [added, setAdded] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLDivElement>());
  const cards = useRef(new Map<string, HTMLDivElement>());
  const contents = useRef(new Map<string, HTMLDivElement>());
  const drag = useRef<Drag | null>(null);
  const draftRef = useRef<Column[] | null>(null);
  const frozen = useRef(new Set<string>());
  const columns = draft ?? saved;
  const fixed = new Map(
    columns.flatMap((c) =>
      c.tiles.map((t) => [t.id, height(t.id) === "content" ? null : t.h]),
    ),
  );
  const rows = (id: string) => {
    if (!editing && off[id as WidgetId]) return 0;
    const h = fixed.get(id);
    const r =
      h != null
        ? h + GAP / ROW
        : px[id] === undefined
          ? ESTIMATE
          : px[id]
            ? Math.ceil((px[id] + GAP) / ROW)
            : 0;
    return editing ? Math.max(EDIT_MIN, r) : r;
  };
  const { spots: placed, ends } = place(columns, rows);
  const over = ends.map((end) => Math.max(0, end * ROW - GAP - avail - 1));
  const sticky = new Set(columns.length < 2 ? [] : columns.keys());
  const stretch = new Set(
    [...sticky].flatMap((i) => {
      if (over[i]) return [];
      const last = columns[i]!.tiles.findLast((t) => placed.has(t.id));
      return last && last.h === null && height(last.id) === "fill"
        ? [last.id]
        : [];
    }),
  );
  frozen.current = stretch;
  const ids = columns.flatMap((c) => c.tiles.map((t) => t.id)).join();
  const latest = useRef({ rows, size, fixed, placed });
  latest.current = { rows, size, fixed, placed };

  useLayoutEffect(() => {
    const read = () => {
      setAvail(probe.current!.offsetHeight);
      setPx((old) => {
        let next = old;
        contents.current.forEach((el, id) => {
          if (frozen.current.has(id) || latest.current.fixed.get(id) != null)
            return;
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
  }, [ids, editing, size]);

  useSlide(editing, columns, cells, () => drag.current?.id);

  useEffect(() => {
    if (!added) return;
    cells.current
      .get(added)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setAdded(null);
  }, [added]);

  const follow = () => {
    const d = drag.current;
    const card = d && cards.current.get(d.id);
    const cell = d && cells.current.get(d.id);
    if (!d || !card || !cell || d.kind !== "move" || !d.live) return;
    const box = grid.current!.getBoundingClientRect();
    card.style.translate = `${d.x - d.dx - box.left - cell.offsetLeft}px ${d.y - d.dy - box.top - cell.offsetTop}px`;
  };

  useLayoutEffect(follow);

  const target = (d: Drag, box: DOMRect): Target => {
    const room =
      tidy(
        d.start.map((c) => ({
          ...c,
          tiles: c.tiles.filter((t) => t.id !== d.id),
        })),
      ).length < MAX_COLUMNS[latest.current.size];
    if (room && d.x < box.left + ZONE && d.x < d.sx - 24)
      return { edge: "left" };
    if (room && d.x > box.right - ZONE && d.x > d.sx + 24)
      return { edge: "right" };
    const { rows, placed } = latest.current;
    const col = columnAt(d.start, box.width, d.x - box.left);
    const lift =
      d.start[col]?.tiles.flatMap((t) => {
        const el = t.id !== d.id && cells.current.get(t.id);
        const spot = placed.get(t.id);
        return el && spot ? [el.offsetTop - spot.top * ROW] : [];
      })[0] ?? 0;
    const top = (d.y - d.dy - box.top - lift) / ROW;
    return { col, top, bottom: top + rows(d.id) - GAP / ROW };
  };

  const frame = () => {
    const d = drag.current;
    if (!d?.live) return;
    const end = floor(cells.current, contents.current, d.id) + d.tail;
    const scroll = d.kind === "move" ? edge(d.y, d.sy, end) : 0;
    if (scroll) scrollBy(0, scroll);
    const box = grid.current!.getBoundingClientRect();
    const { rows } = latest.current;
    let next: Column[];
    if (d.kind === "move") {
      const to = target(d, box);
      const base = draftRef.current ?? d.start;
      next = drop(
        "edge" in to || base.length !== d.start.length ? d.start : base,
        rows,
        d.id,
        to,
      );
    } else {
      const spot = place(d.start, rows).spots.get(d.id)!;
      const content = d.y + d.dy - box.top - cells.current.get(d.id)!.offsetTop;
      next = resize(
        widen(d.start, box.width, spot.col, d.x + d.dx - box.left),
        d.id,
        rowsFor(d.id, content, d.natural),
      );
    }
    if (!same(next, draftRef.current ?? d.start)) {
      draftRef.current = next;
      setDraft(next);
    }
    follow();
    requestAnimationFrame(frame);
  };

  const finish = (keep: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    document.removeEventListener("touchmove", prevent);
    const card = cards.current.get(d.id);
    if (card) settle(card);
    if (keep && d.live && draftRef.current) setSaved(draftRef.current);
    draftRef.current = null;
    setDraft(null);
    setActive(null);
  };

  const begin = (
    kind: Drag["kind"],
    id: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0 || drag.current) return;
    const mouse = event.pointerType === "mouse";
    if (mouse && !editing) return;
    if (kind === "size") event.preventDefault();
    if (editing) event.stopPropagation();
    const card = cards.current.get(id)!.getBoundingClientRect();
    const shown = contents.current.get(id)!;
    const d: Drag = {
      kind,
      id,
      dx:
        kind === "move"
          ? event.clientX - card.left
          : card.right - event.clientX,
      dy:
        kind === "move"
          ? event.clientY - card.top
          : cells.current.get(id)!.getBoundingClientRect().top +
            shown.offsetHeight -
            event.clientY,
      sx: event.clientX,
      sy: event.clientY,
      x: event.clientX,
      y: event.clientY,
      start: saved,
      live: false,
      natural:
        fixed.get(id) == null
          ? shown.offsetHeight
          : (px[id] ?? shown.firstElementChild?.scrollHeight ?? 0),
      tail:
        document.documentElement.scrollHeight -
        scrollY -
        floor(cells.current, contents.current, id),
    };
    drag.current = d;
    let held = false;
    const go = () => {
      if (d.live || drag.current !== d) return;
      d.live = true;
      const el = cards.current.get(id)!;
      if (held) {
        const box = el.getBoundingClientRect();
        [d.dx, d.dy] = [d.sx - box.left, d.sy - box.top];
      }
      if (kind === "move") pin(el);
      document.addEventListener("touchmove", prevent, { passive: false });
      setActive({ ...d });
      requestAnimationFrame(frame);
    };
    const wake = () => {
      if (drag.current !== d) return;
      held = true;
      [d.sx, d.sy] = [d.x, d.y];
      document.addEventListener("touchmove", prevent, { passive: false });
      onEdit();
    };
    const hold =
      kind === "size" || mouse
        ? 0
        : window.setTimeout(editing ? go : wake, editing ? 150 : 500);
    const moved = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.live || held) claim(e);
      if (d.live) return;
      const far = Math.hypot(d.x - d.sx, d.y - d.sy);
      if (hold && !held) {
        if (far > 8) ended(e);
      } else if (far > 4) go();
    };
    const ended = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      clearTimeout(hold);
      finish(e.type === "pointerup");
      off();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      finish(false);
      off();
    };
    const off = () => {
      removeEventListener("pointermove", moved, true);
      removeEventListener("pointerup", ended);
      removeEventListener("pointercancel", ended);
      removeEventListener("keydown", key, true);
    };
    addEventListener("pointermove", moved, true);
    addEventListener("pointerup", ended);
    addEventListener("pointercancel", ended);
    addEventListener("keydown", key, true);
  };

  const present = new Set(saved.flatMap((c) => c.tiles.map((t) => t.id)));
  const missing = (Object.keys(WIDGETS) as WidgetId[]).filter(
    (id) => !present.has(id),
  );
  const total = Math.max(1, ...ends);

  return (
    <>
      {slot &&
        createPortal(
          <EditBar
            editing={editing}
            onEdit={onEdit}
            sizes={sizes}
            size={size}
            onSize={setView}
            missing={missing}
            onAdd={(id) => {
              setSaved(add(saved, rows, id));
              setAdded(id);
            }}
            onReset={() => setSaved(DEFAULT_LAYOUT[size])}
            onDone={onDone}
          />,
          slot,
        )}
      <div
        className="mx-auto"
        data-preview={editing && size !== real ? size : undefined}
        style={{
          maxWidth: editing && size !== real ? PREVIEW[size] : undefined,
        }}
      >
        <div
          ref={grid}
          onClick={(e) => editing && e.target === e.currentTarget && onDone()}
          className={`relative grid [-webkit-touch-callout:none] pointer-coarse:select-none ${editing ? "[overflow-anchor:none]" : ""}`}
          style={{
            columnGap: GAP,
            gridTemplateColumns: columns
              .map((c) => `minmax(0, ${c.w}fr)`)
              .join(" "),
            gridTemplateRows: `repeat(${total}, ${ROW}px)`,
          }}
        >
          <div
            ref={probe}
            aria-hidden="true"
            className="pointer-events-none invisible absolute w-0"
            style={{
              height: `calc(100dvh - ${TOP} - env(safe-area-inset-bottom) - 1rem)`,
            }}
          />
          {!columns.length && (
            <p className="col-span-full row-span-12 py-8 text-center text-sm text-zinc-500">
              Tap + to add a widget.
            </p>
          )}
          {(Object.keys(WIDGETS) as WidgetId[]).flatMap((id, n) => {
            const spot = placed.get(id);
            const col = columns.findIndex((c) =>
              c.tiles.some((t) => t.id === id),
            );
            if (col < 0 || (!editing && off[id])) return [];
            return [
              <Tile
                key={id}
                id={id}
                index={n}
                col={col}
                spot={spot}
                lift={spot && sticky.has(spot.col) ? over[spot.col]! : null}
                tall={
                  spot && stretch.has(id)
                    ? Math.max(0, avail - spot.top * ROW)
                    : null
                }
                fixed={fixed.get(id) != null}
                edge={col === columns.length - 1}
                editing={editing}
                moving={active?.id === id && active.kind === "move"}
                held={active?.id === id}
                render={off[id] ? null : tiles[id]}
                cell={(el) => {
                  if (el) cells.current.set(id, el);
                  else cells.current.delete(id);
                }}
                card={(el) => void (el && cards.current.set(id, el))}
                content={(el) => {
                  if (el) contents.current.set(id, el);
                  else contents.current.delete(id);
                }}
                onPress={(kind, e) => begin(kind, id, e)}
                onRemove={() => setSaved(remove(saved, id))}
              />,
            ];
          })}
        </div>
      </div>
    </>
  );
};
