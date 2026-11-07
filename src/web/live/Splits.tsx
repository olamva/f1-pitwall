import type { PointerEvent as ReactPointerEvent } from "react";
import { claim } from "../Swipe.tsx";
import { GAP, same, widen, type Column } from "./layout.ts";

interface SplitsProps {
  columns: Column[];
  onDraft: (columns: Column[] | null) => void;
  onSave: (columns: Column[]) => void;
}

export const Splits = ({ columns, onDraft, onSave }: SplitsProps) => {
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
      className="relative"
      style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize the columns"
        onPointerDown={(e) => begin(i, e)}
        className="group absolute inset-y-0 left-full flex cursor-col-resize touch-none justify-center"
        style={{ width: GAP }}
      >
        <span className="light:bg-zinc-500 sticky top-[calc(50dvh-1.5rem)] h-12 w-1.5 self-start rounded-full bg-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 pointer-coarse:opacity-100" />
      </div>
    </div>
  ));
};
