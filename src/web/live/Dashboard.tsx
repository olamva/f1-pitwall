import { FoldVertical, GripVertical, MoveDiagonal2, X } from "lucide-react";
import { EditBar } from "./EditBar.tsx";
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
import { save, subscribe } from "../synced.ts";
import {
  add,
  columns,
  GAP,
  move,
  pack,
  ROW,
  rowsOf,
  same,
  type Item,
  type Layout,
  type Size,
} from "./layout.ts";
import { DEFAULT_LAYOUT, isWidget, WIDGETS, type WidgetId } from "./widgets.ts";

const QUERIES = ["(width >= 80rem)", "(width >= 48rem)"].map(matchMedia);

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
    localStorage.getItem("layout"),
  );
  const saved = useMemo<Layout | null>(() => JSON.parse(raw ?? "null"), [raw]);
  const items = (saved ?? DEFAULT_LAYOUT)[size].filter((i) => isWidget(i.id));
  const set = (next: Item[]) =>
    save("layout", { ...(saved ?? DEFAULT_LAYOUT), [size]: next });
  return [items, set] as const;
};

const ESTIMATE = 30;
const EDIT_MIN = 12;
const MIN_ROWS = 6;
const EDGE = 64;

type Drag = {
  kind: "move" | "size";
  id: string;
  dx: number;
  dy: number;
  x: number;
  y: number;
  start: Item[];
  live: boolean;
};

interface DashboardProps {
  ref: Ref<HTMLDivElement>;
  tiles: Record<WidgetId, () => ReactNode>;
  off: Partial<Record<WidgetId, boolean>>;
  editing: boolean;
  onDone: () => void;
}

export const Dashboard = ({
  ref,
  tiles,
  off,
  editing,
  onDone,
}: DashboardProps) => {
  const size = useSize();
  const cols = columns(size);
  const [saved, setSaved] = useLayout(size);
  const [draft, setDraft] = useState<Item[] | null>(null);
  const [active, setActive] = useState<Drag | null>(null);
  const [rows, setRows] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLDivElement>());
  const cards = useRef(new Map<string, HTMLDivElement>());
  const contents = useRef(new Map<string, HTMLDivElement>());
  const drag = useRef<Drag | null>(null);
  const draftRef = useRef<Item[] | null>(null);
  const spots = useRef(new Map<string, [number, number]>());
  const items = (draft ?? saved).filter(
    (i) => editing || !off[i.id as WidgetId],
  );
  const fixed = new Map(items.map((i) => [i.id, i.h]));
  const height = (id: string) => {
    const h = fixed.get(id) ?? rows[id] ?? ESTIMATE;
    return editing ? Math.max(EDIT_MIN, h) : h;
  };
  const shown = items.filter(
    (i) => editing || i.h !== null || rows[i.id] !== 0,
  );
  const places = pack(shown, height);
  const ids = items.map((i) => i.id).join();

  useLayoutEffect(() => {
    const read = () =>
      setRows((old) => {
        let next = old;
        contents.current.forEach((el, id) => {
          const px = el.offsetHeight;
          const value = px ? rowsOf(px) : 0;
          if (old[id] !== value) next = { ...next, [id]: value };
        });
        return next;
      });
    read();
    const observer = new ResizeObserver(read);
    contents.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, editing]);

  useLayoutEffect(() => {
    if (!editing) return spots.current.clear();
    const box = grid.current!.getBoundingClientRect();
    cells.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const spot: [number, number] = [r.left - box.left, r.top - box.top];
      const was = spots.current.get(id);
      spots.current.set(id, spot);
      if (!was || id === drag.current?.id) return;
      const [dx, dy] = [was[0] - spot[0], was[1] - spot[1]];
      if (dx || dy)
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
          duration: 180,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
    });
  });

  useEffect(() => {
    if (!added) return;
    cells.current
      .get(added)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setAdded(null);
  }, [added]);

  const follow = () => {
    const d = drag.current;
    const card = d && cards.current.get(d.id);
    if (!d || !card || d.kind !== "move" || !d.live) return;
    const cell = cells.current.get(d.id)!.getBoundingClientRect();
    card.style.translate = `${d.x - d.dx - cell.left}px ${d.y - d.dy - cell.top}px`;
  };

  useLayoutEffect(follow);

  const commit = (next: Item[]) => {
    draftRef.current = next;
    setDraft(next);
  };

  const frame = () => {
    const d = drag.current;
    if (!d) return;
    const scroll =
      d.y < EDGE
        ? -(EDGE - d.y) / 3
        : d.y > innerHeight - EDGE
          ? (d.y - innerHeight + EDGE) / 3
          : 0;
    if (scroll) scrollBy(0, scroll);
    const box = grid.current!.getBoundingClientRect();
    const step = (box.width + GAP) / cols;
    const current = draftRef.current ?? d.start;
    let next: Item[];
    if (d.kind === "move")
      next = move(
        d.start,
        height,
        d.id,
        Math.round((d.x - d.dx - box.left) / step),
        Math.round((d.y - d.dy - box.top) / ROW),
        cols,
      );
    else {
      const cell = cells.current.get(d.id)!.getBoundingClientRect();
      next = current.map((i) =>
        i.id === d.id
          ? {
              ...i,
              w: Math.max(
                Math.min(3, cols),
                Math.min(
                  cols - i.x,
                  Math.round((d.x - cell.left + GAP) / step),
                ),
              ),
              h: Math.max(MIN_ROWS, Math.round((d.y - cell.top + GAP) / ROW)),
            }
          : i,
      );
    }
    if (!same(next, current)) commit(next);
    follow();
    requestAnimationFrame(frame);
  };

  const finish = (keep: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cards.current.get(d.id)?.style.removeProperty("translate");
    if (keep && d.live && draftRef.current) setSaved(draftRef.current);
    draftRef.current = null;
    setDraft(null);
    setActive(null);
  };

  const start = (
    kind: Drag["kind"],
    id: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.stopPropagation();
    const card = cards.current.get(id)!.getBoundingClientRect();
    const d: Drag = {
      kind,
      id,
      dx: event.clientX - card.left,
      dy: event.clientY - card.top,
      x: event.clientX,
      y: event.clientY,
      start: items,
      live: false,
    };
    drag.current = d;
    const moved = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.live || Math.hypot(d.x - event.clientX, d.y - event.clientY) < 6)
        return;
      d.live = true;
      setActive({ ...d });
      requestAnimationFrame(frame);
    };
    const ended = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      finish(e.type === "pointerup");
      off();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      finish(false);
      off();
    };
    const off = () => {
      removeEventListener("pointermove", moved);
      removeEventListener("pointerup", ended);
      removeEventListener("pointercancel", ended);
      removeEventListener("keydown", key);
    };
    addEventListener("pointermove", moved);
    addEventListener("pointerup", ended);
    addEventListener("pointercancel", ended);
    addEventListener("keydown", key);
  };

  const missing = (Object.keys(WIDGETS) as WidgetId[]).filter(
    (id) => !saved.some((i) => i.id === id),
  );
  const fit = (id: string) =>
    setSaved(saved.map((i) => (i.id === id ? { ...i, h: null } : i)));

  return (
    <div className="space-y-3">
      {editing && (
        <EditBar
          phone={size === "phone"}
          missing={missing}
          onAdd={(id) => {
            const item = {
              id,
              x: 0,
              w: Math.min(cols, WIDGETS[id].w),
              h: null,
            };
            setSaved(add(saved, height, item, cols));
            setAdded(id);
          }}
          onReset={() => setSaved(DEFAULT_LAYOUT[size])}
          onDone={onDone}
        />
      )}
      <div
        ref={(el) => {
          grid.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        className="relative grid scroll-mt-[calc(env(safe-area-inset-top)+1rem)] gap-x-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: ROW,
        }}
      >
        {items.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-zinc-500">
            Add a widget to fill the screen.
          </p>
        )}
        {(Object.keys(WIDGETS) as WidgetId[]).flatMap((id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return [];
          const place = places.find((p) => p.id === id);
          const render = off[id] ? null : tiles[id];
          const moving = active?.id === id && active.kind === "move";
          const fill = item.h !== null;
          return [
            <div
              key={id}
              ref={(el) => {
                if (el) cells.current.set(id, el);
                else cells.current.delete(id);
              }}
              className={`relative min-w-0 ${place ? "" : "invisible absolute inset-x-0 top-0"}`}
              style={{
                gridColumn: `${(place ?? item).x + 1} / span ${(place ?? item).w}`,
                gridRow: place && `${place.y + 1} / span ${place.h}`,
                paddingBottom: GAP,
              }}
            >
              {moving && (
                <div className="absolute inset-x-0 top-0 bottom-4 rounded-xl border-2 border-dashed border-zinc-500 bg-zinc-500/10" />
              )}
              <div
                ref={(el) => void (el && cards.current.set(id, el))}
                className={`relative h-full ${moving ? "z-30 rounded-xl shadow-2xl" : ""}`}
              >
                <div
                  ref={(el) => {
                    if (el) contents.current.set(id, el);
                    else contents.current.delete(id);
                  }}
                  data-fill={fill || undefined}
                  inert={editing}
                  className={fill ? "h-full" : undefined}
                >
                  {render ? (
                    render()
                  ) : (
                    <section className="bg-surface h-full rounded-xl p-3">
                      <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
                        {WIDGETS[id].title}
                      </h2>
                    </section>
                  )}
                </div>
                {editing && (
                  <div
                    onPointerDown={(e) =>
                      e.pointerType === "mouse" && start("move", id, e)
                    }
                    className={`light:bg-white/55 absolute inset-0 z-10 flex flex-col overflow-hidden rounded-xl bg-black/45 outline-2 -outline-offset-2 outline-zinc-500 select-none ${moving ? "cursor-grabbing" : "cursor-grab"}`}
                  >
                    <div className="bg-surface flex items-center gap-1 border-b border-zinc-700 p-1">
                      <button
                        type="button"
                        aria-label={`Move ${WIDGETS[id].title}`}
                        title="Drag to move"
                        onPointerDown={(e) => start("move", id, e)}
                        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-zinc-200 hover:bg-zinc-800"
                      >
                        <GripVertical aria-hidden="true" className="size-5" />
                      </button>
                      <span className="font-f1 min-w-0 grow truncate text-sm font-bold tracking-wider text-zinc-50 uppercase">
                        {WIDGETS[id].title}
                      </span>
                      {fill && (
                        <button
                          type="button"
                          aria-label={`Fit ${WIDGETS[id].title} to its content`}
                          title="Fit the height to the content"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => fit(id)}
                          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-zinc-200 hover:bg-zinc-800"
                        >
                          <FoldVertical aria-hidden="true" className="size-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${WIDGETS[id].title}`}
                        title="Remove"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          setSaved(saved.filter((i) => i.id !== id))
                        }
                        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-zinc-200 hover:bg-zinc-800"
                      >
                        <X aria-hidden="true" className="size-5" />
                      </button>
                    </div>
                    {!render && WIDGETS[id].only && (
                      <p className="px-3 text-sm text-zinc-300">
                        {WIDGETS[id].only}
                      </p>
                    )}
                    <button
                      type="button"
                      aria-label={`Resize ${WIDGETS[id].title}`}
                      title="Drag to resize"
                      onPointerDown={(e) => start("size", id, e)}
                      className="absolute right-0 bottom-0 grid size-11 cursor-nwse-resize touch-none place-items-center rounded-lg text-zinc-200 hover:bg-zinc-800"
                    >
                      <MoveDiagonal2 aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>,
          ];
        })}
      </div>
    </div>
  );
};
