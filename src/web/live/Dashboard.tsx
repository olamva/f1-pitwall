import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { claim } from "../Swipe.tsx";
import { save, subscribe } from "../synced.ts";
import { EditBar } from "./EditBar.tsx";
import { Tile } from "./Tile.tsx";
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
import { DEFAULT_LAYOUT, isWidget, WIDGETS, type WidgetId } from "./widgets.ts";

const QUERIES = ["(width >= 80rem)", "(width >= 48rem)"].map(matchMedia);
const KEYS: Record<Size, string> = {
  phone: "layoutPhone",
  tablet: "layoutTablet",
  desktop: "layoutDesktop",
};
const PREVIEW: Record<Size, string | undefined> = {
  phone: "430px",
  tablet: "1024px",
  desktop: undefined,
};
const ESTIMATE = 30;
const EDIT_MIN = 12;
const MIN_ROWS = 6;
const EDGE = 64;
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
};

interface DashboardProps {
  ref: Ref<HTMLDivElement>;
  tiles: Record<WidgetId, () => ReactNode>;
  off: Partial<Record<WidgetId, boolean>>;
  editing: boolean;
  slot: HTMLElement | null;
  onEdit: () => void;
  onDone: () => void;
}

export const Dashboard = ({
  ref,
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
  const spots = useRef(new Map<string, [number, number]>());
  const frozen = useRef(new Set<string>());
  const columns = draft ?? saved;
  const fixed = new Map(
    columns.flatMap((c) => c.tiles.map((t) => [t.id, t.h])),
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
  const sticky = new Set(
    editing || columns.length < 2
      ? []
      : columns.flatMap((c, i) =>
          ends[i]! * ROW - GAP <= avail + 1 ? [i] : [],
        ),
  );
  const stretch = new Set(
    [...sticky].flatMap((i) => {
      const last = columns[i]!.tiles.findLast((t) => placed.has(t.id));
      return last && last.h === null ? [last.id] : [];
    }),
  );
  frozen.current = stretch;
  const ids = columns.flatMap((c) => c.tiles.map((t) => t.id)).join();
  const latest = useRef({ rows, size, fixed });
  latest.current = { rows, size, fixed };

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

  useLayoutEffect(() => {
    if (!editing) return spots.current.clear();
    cells.current.forEach((el, id) => {
      const spot: [number, number] = [el.offsetLeft, el.offsetTop];
      const was = spots.current.get(id);
      spots.current.set(id, spot);
      if (!was || id === drag.current?.id) return;
      const [dx, dy] = [was[0] - spot[0], was[1] - spot[1]];
      if (dx || dy)
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
          duration: 220,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
    });
  });

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
    const h = latest.current.rows(d.id) * ROW;
    return {
      col: columnAt(d.start, box.width, d.x - box.left),
      y: (d.y - d.dy - box.top + h / 2) / ROW,
    };
  };

  const frame = () => {
    const d = drag.current;
    if (!d?.live) return;
    const scroll =
      d.y < EDGE
        ? -(EDGE - d.y) / 3
        : d.y > innerHeight - EDGE
          ? (d.y - innerHeight + EDGE) / 3
          : 0;
    if (scroll) scrollBy(0, scroll);
    const box = grid.current!.getBoundingClientRect();
    const { rows } = latest.current;
    let next: Column[];
    if (d.kind === "move") next = drop(d.start, rows, d.id, target(d, box));
    else {
      const spot = place(d.start, rows).spots.get(d.id)!;
      const content = d.y + d.dy - box.top - spot.top * ROW;
      const h =
        Math.abs(content - d.natural) < GAP
          ? null
          : Math.max(MIN_ROWS, Math.round(content / ROW));
      next = resize(
        widen(d.start, box.width, spot.col, d.x + d.dx - box.left),
        d.id,
        h,
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
    cards.current.get(d.id)?.style.removeProperty("translate");
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
          : card.bottom - GAP - event.clientY,
      sx: event.clientX,
      sy: event.clientY,
      x: event.clientX,
      y: event.clientY,
      start: saved,
      live: false,
      natural: px[id] ?? 0,
    };
    drag.current = d;
    const go = () => {
      if (d.live || drag.current !== d) return;
      d.live = true;
      if (!editing) onEdit();
      document.addEventListener("touchmove", prevent, { passive: false });
      setActive({ ...d });
      requestAnimationFrame(frame);
    };
    const hold =
      kind === "size"
        ? 0
        : mouse
          ? 0
          : window.setTimeout(go, editing ? 150 : 500);
    const moved = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.live) return claim(e);
      const far = Math.hypot(d.x - d.sx, d.y - d.sy);
      if (hold && far > 8) ended(e);
      else if (!hold && far > 4) go();
    };
    const ended = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      clearTimeout(hold);
      finish(e.type === "pointerup");
      off();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      finish(false);
      off();
    };
    const off = () => {
      removeEventListener("pointermove", moved, true);
      removeEventListener("pointerup", ended);
      removeEventListener("pointercancel", ended);
      removeEventListener("keydown", key);
    };
    addEventListener("pointermove", moved, true);
    addEventListener("pointerup", ended);
    addEventListener("pointercancel", ended);
    addEventListener("keydown", key);
  };

  const present = new Set(saved.flatMap((c) => c.tiles.map((t) => t.id)));
  const missing = (Object.keys(WIDGETS) as WidgetId[]).filter(
    (id) => !present.has(id),
  );
  const total = Math.max(1, ...ends);

  return (
    <>
      {editing &&
        slot &&
        createPortal(
          <EditBar
            sizes={sizes}
            size={size}
            onSize={setView}
            missing={missing}
            preview={(id) => (off[id] ? null : tiles[id]())}
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
        style={{ maxWidth: editing ? PREVIEW[size] : undefined }}
      >
        <div
          ref={(el) => {
            grid.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          onClick={(e) => editing && e.target === e.currentTarget && onDone()}
          className="relative grid scroll-mt-[calc(env(safe-area-inset-top)+1rem)] [-webkit-touch-callout:none] pointer-coarse:select-none"
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
            className="pointer-events-none invisible absolute h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-0"
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
                stuck={!!spot && sticky.has(spot.col)}
                tall={
                  spot && stretch.has(id)
                    ? Math.max(0, avail - spot.top * ROW)
                    : null
                }
                fixed={fixed.get(id) != null}
                editing={editing}
                moving={active?.id === id && active.kind === "move"}
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
