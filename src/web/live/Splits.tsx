import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { claim } from "../Swipe.tsx";
import { GAP, same, widen, type Column } from "./layout.ts";
import { TOP } from "./Tile.tsx";

interface SplitsProps {
  columns: Column[];
  onDraft: (columns: Column[] | null) => void;
  onSave: (columns: Column[]) => void;
}

export const Splits = ({ columns, onDraft, onSave }: SplitsProps) => {
  const [first, setFirst] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ top: 0, bottom: 0 });
  const [held, setHeld] = useState<{ col: number; y: number } | null>(null);

  useEffect(() => {
    const grid = first?.parentElement;
    if (!grid) return;
    const read = () => {
      const { top, bottom } = grid.getBoundingClientRect();
      setBox({ top, bottom });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(grid);
    addEventListener("scroll", read, { passive: true });
    addEventListener("resize", read);
    return () => {
      observer.disconnect();
      removeEventListener("scroll", read);
      removeEventListener("resize", read);
    };
  }, [first]);

  useEffect(() => {
    const bar =
      held &&
      first?.parentElement?.querySelectorAll("[role=separator]")[held.col];
    if (!bar) return;
    const moved = (e: PointerEvent) => {
      const r = bar.getBoundingClientRect();
      if (e.buttons) return;
      if (
        e.clientX < r.left ||
        e.clientX >= r.right ||
        e.clientY < r.top ||
        e.clientY >= r.bottom
      )
        setHeld(null);
    };
    addEventListener("pointermove", moved);
    return () => removeEventListener("pointermove", moved);
  }, [held, first]);

  const begin = (col: number, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const bar = event.currentTarget;
    let last = columns;
    bar.setPointerCapture(event.pointerId);
    const moved = (e: PointerEvent) => {
      claim(e);
      const box = bar.parentElement!.parentElement!.getBoundingClientRect();
      const next = widen(
        columns,
        box.width,
        col,
        e.clientX - box.left - GAP / 2,
      );
      if (same(next, last)) return;
      last = next;
      onDraft(next);
    };
    const ended = (e: PointerEvent) => {
      bar.removeEventListener("pointermove", moved);
      bar.removeEventListener("pointerup", ended);
      bar.removeEventListener("pointercancel", ended);
      if (e.type === "pointerup" && last !== columns) onSave(last);
      onDraft(null);
    };
    bar.addEventListener("pointermove", moved);
    bar.addEventListener("pointerup", ended);
    bar.addEventListener("pointercancel", ended);
  };

  return columns.slice(1).map((_, i) => (
    <div
      key={`split-${i}`}
      ref={i ? undefined : setFirst}
      className="relative"
      style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        data-hover={held?.col === i || undefined}
        title="Drag to resize the columns"
        onPointerDown={(e) => begin(i, e)}
        onPointerEnter={(e) => {
          const { top } =
            e.currentTarget.firstElementChild!.getBoundingClientRect();
          if (e.pointerType === "mouse")
            setHeld((h) => (h?.col === i ? h : { col: i, y: top }));
        }}
        className="group absolute inset-y-0 left-full cursor-col-resize touch-none"
        style={{ width: GAP }}
      >
        <span
          className={`light:bg-zinc-500 fixed h-12 w-1.5 rounded-full bg-zinc-400 transition-opacity group-active:opacity-100 pointer-coarse:opacity-100 ${held?.col === i ? "" : "opacity-0"}`}
          style={{
            marginLeft: GAP / 2 - 3,
            top:
              held?.col === i
                ? held.y
                : `calc((max(${box.top}px, ${TOP}) + min(${box.bottom}px, 100dvh)) / 2 - 1.5rem)`,
          }}
        />
      </div>
    </div>
  ));
};
