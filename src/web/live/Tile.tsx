import { Minus } from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { GAP, ROW, type Spot } from "./layout.ts";
import { WIDGETS, type WidgetId } from "./widgets.ts";

export const TOP = "var(--tile-top, var(--top-bar))";

type Bind = (el: HTMLDivElement | null) => void;

const place = (
  col: number,
  spot: Spot | undefined,
  lift: number | null,
  fixed: boolean,
): CSSProperties =>
  spot
    ? {
        gridColumn: spot.col + 1,
        gridRow: `${spot.top + 1} / ${lift === null ? `span ${spot.height}` : -1}`,
        paddingBottom: GAP,
        ...(lift !== null && {
          position: "sticky",
          top: `calc(${TOP} + ${spot.top * ROW - lift}px)`,
          alignSelf: "start",
          height: fixed ? spot.height * ROW : undefined,
        }),
      }
    : { gridColumn: col + 1 };

interface TileProps {
  id: WidgetId;
  index: number;
  col: number;
  spot: Spot | undefined;
  lift: number | null;
  tall: number | null;
  push: number | undefined;
  fixed: boolean;
  editing: boolean;
  moving: boolean;
  held: boolean;
  render: (() => ReactNode) | null;
  cell: Bind;
  card: Bind;
  content: Bind;
  onPress: (kind: "move" | "size", e: PointerEvent<HTMLElement>) => void;
  onRemove: () => void;
}

export const Tile = ({
  id,
  index,
  col,
  spot,
  lift,
  tall,
  push,
  fixed,
  editing,
  moving,
  held,
  render,
  cell,
  card,
  content,
  onPress,
  onRemove,
}: TileProps) => (
  <div
    ref={cell}
    onPointerDown={(e) => !editing && onPress("move", e)}
    data-held={held}
    className={`min-w-0 has-[.map-fullscreen]:z-50 data-[held=true]:z-30 ${spot ? "relative" : "absolute inset-x-0 top-0"}`}
    style={{
      ...place(col, spot, lift, fixed),
      transform: push ? `translateY(${push}px)` : undefined,
    }}
  >
    {moving && (
      <div className="absolute inset-x-0 top-0 bottom-4 rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-500/10" />
    )}
    <div
      ref={card}
      className={`relative ${spot && (fixed || editing) ? "h-full" : ""} ${moving ? "z-30 scale-[1.03] rounded-xl shadow-2xl transition-[scale]" : editing && !held ? "jiggle" : ""}`}
      style={
        editing
          ? {
              animationDelay: `${-index * 0.09}s, ${-index * 0.13}s`,
              animationDuration: `${0.14 + ((index % 3) - 1) * 0.025}s, ${0.18 - ((index % 3) - 1) * 0.025}s`,
            }
          : undefined
      }
    >
      <div
        ref={content}
        data-fill={fixed || tall !== null || undefined}
        inert={editing}
        className={fixed ? "h-full" : undefined}
        style={tall === null ? undefined : { height: tall }}
      >
        {render ? (
          render()
        ) : (
          <section className="bg-surface flex h-full flex-col justify-center rounded-xl p-4 text-center">
            <h2 className="font-f1 text-sm font-bold tracking-wider uppercase">
              {WIDGETS[id].title}
            </h2>
            <p className="text-sm text-zinc-400">{WIDGETS[id].only}</p>
          </section>
        )}
      </div>
      {editing && (
        <div
          onPointerDown={(e) => onPress("move", e)}
          className={`absolute inset-0 z-10 rounded-xl ${moving ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <button
            type="button"
            aria-label={`Remove ${WIDGETS[id].title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="light:bg-zinc-400 absolute -top-2.5 -left-2.5 grid size-7 cursor-pointer place-items-center rounded-full bg-zinc-500 text-white shadow-md after:absolute after:-inset-2.5"
          >
            <Minus aria-hidden="true" className="size-4" strokeWidth={3} />
          </button>
          {WIDGETS[id].height !== "content" && (
            <span
              role="presentation"
              title="Drag to resize. Double-tap to use automatic height."
              onPointerDown={(e) => onPress("size", e)}
              className="absolute right-0 bottom-0 size-12 cursor-nwse-resize touch-none"
            >
              <span className="light:border-zinc-400 absolute right-1 bottom-1 size-7 rounded-br-[0.75rem] border-r-[5px] border-b-[5px] border-zinc-500 drop-shadow" />
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);
