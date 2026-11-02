import { useLayoutEffect, useRef } from "react";
import type { Championship, Standing } from "../../shared/clinch.ts";
import { BODY, Figure } from "../Headshot.tsx";
import { ink } from "../ink.ts";
import type { Who } from "./derive.ts";

interface LineupProps {
  champ: Championship;
  table: Standing[];
  field: string[];
  out?: string[];
  who: Map<string, Who>;
  gain: number;
}

const useSlide = () => {
  const ref = useRef<HTMLOListElement>(null);
  const seen = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const li of ref.current?.children ?? []) {
      const { id = "" } = (li as HTMLElement).dataset;
      const x = (li as HTMLElement).offsetLeft;
      const was = seen.current.get(id);
      if (!still && was !== undefined && was !== x)
        li.animate([{ translate: `${was - x}px 0` }, { translate: "0 0" }], {
          duration: 600,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
      seen.current.set(id, x);
    }
  });
  return ref;
};

export const Lineup = ({
  champ,
  table,
  field: ids,
  out = [],
  who,
  gain,
}: LineupProps) => {
  const field = table.filter((s) => ids.includes(s.id)).slice(0, 6);
  const lead = field[0]?.points ?? 0;
  const ref = useSlide();
  if (champ !== "drivers" || field.length < 2) return null;
  return (
    <div className="mb-3">
      <p className="font-f1 mb-2 text-center text-sm font-bold tracking-wider">
        {field.map((s, i) => (
          <span key={s.id}>
            {i > 0 && <span className="px-1.5 text-zinc-500">vs</span>}
            <span
              className={out.includes(s.id) ? "text-zinc-600 line-through" : ""}
              style={
                out.includes(s.id) ? {} : { color: ink(who.get(s.id)?.color) }
              }
            >
              {who.get(s.id)?.code ?? s.id}
            </span>
          </span>
        ))}
      </p>
      <ol ref={ref} className="flex justify-center">
        {field.map((s, i) => {
          const gap = lead - s.points;
          const depth = Math.min(gap / gain, 1);
          const gone = out.includes(s.id);
          return (
            <li
              key={s.id}
              data-id={s.id}
              className="relative flex w-9 shrink-0 flex-col items-center sm:w-12"
              style={{ zIndex: field.length - i }}
            >
              <div className="relative h-72 w-full sm:h-96">
                <div
                  className="absolute inset-y-0 left-1/2 flex w-32 -translate-x-1/2 justify-center transition-[filter] duration-700"
                  style={{
                    filter: gone
                      ? "brightness(0) invert(0.3)"
                      : `brightness(${1 - 0.45 * depth})`,
                    background: `radial-gradient(closest-side at 50% 35%, ${who.get(s.id)?.color ?? "#888"}80, transparent)`,
                  }}
                >
                  <Figure
                    id={s.id}
                    pose="front"
                    transform={BODY}
                    className="h-full max-w-none mask-b-from-75%"
                  />
                </div>
              </div>
              <span
                className={`tabular font-f1 text-xs font-bold sm:text-base ${gone ? "text-zinc-600" : ""}`}
              >
                {s.points}
              </span>
              <span className="tabular text-[10px] text-zinc-400 sm:text-xs">
                {gap ? `−${gap}` : "Leader"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
