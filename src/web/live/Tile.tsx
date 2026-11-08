import { Minus } from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { GAP, ROW, type Spot } from "./layout.ts";
import { WIDGETS, type WidgetId } from "./widgets.ts";

export const TOP = "var(--tile-top, var(--top-bar))";
const DOUBLE_TAP = 350;
let tap = { id: "", at: 0 };

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
  onAuto: () => void;
  onSplit: ((e: PointerEvent<HTMLElement>) => void) | null;
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
  onAuto,
  onSplit,
}: TileProps) => (
  <div
    ref={cell}
    onPointerDown={(e) => !editing && onPress("move", e)}
    data-held={held}
    className={`min-w-0 has-[.map-fullscreen]:z-50 data-[held=true]:z-30 ${spot ? "relative" : "absolute inset-x-0 top-0"}`}
    style={{
      ...place(col, spot, lift, fixed),
      transform: push ? `translateY(${push}px)` : undefined,
      marginBottom: push && push < 0 ? push : undefined,
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
        </div>
      )}
    </div>
    <Split onSplit={onSplit} />
    <Handle
      id={id}
      shown={editing && !moving && !!spot}
      onPress={onPress}
      onAuto={onAuto}
    />
  </div>
);

const Split = ({ onSplit }: Pick<TileProps, "onSplit">) =>
  onSplit && (
    <div
      role="separator"
      aria-orientation="horizontal"
      title="Drag to resize the widgets"
      onPointerDown={onSplit}
      className="group absolute inset-x-0 bottom-0 z-20 flex cursor-row-resize touch-none items-center justify-center"
      style={{ height: GAP }}
    >
      <span className="light:bg-zinc-500 h-1.5 w-12 rounded-full bg-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 pointer-coarse:opacity-100" />
    </div>
  );

interface HandleProps {
  id: WidgetId;
  shown: boolean;
  onPress: TileProps["onPress"];
  onAuto: () => void;
}

const Handle = ({ id, shown, onPress, onAuto }: HandleProps) =>
  shown &&
  WIDGETS[id].height !== "content" && (
    <span
      role="presentation"
      title="Drag to resize. Double-tap to use automatic height."
      onPointerDown={(e) => onPress("size", e)}
      onPointerUp={(e) => {
        if (tap.id === id && e.timeStamp - tap.at < DOUBLE_TAP) onAuto();
        tap = { id, at: e.timeStamp };
      }}
      className="absolute right-0 bottom-0 z-20 size-20 cursor-nwse-resize touch-none"
    >
      <span className="light:border-zinc-400 absolute right-1 bottom-5 size-7 rounded-br-[0.75rem] border-r-[5px] border-b-[5px] border-zinc-500 drop-shadow" />
    </span>
  );
