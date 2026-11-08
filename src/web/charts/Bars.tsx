import { useRef, useState, type CSSProperties } from "react";
import { DriverHover } from "../DriverCard.tsx";
import { ink } from "../ink.ts";
import {
  Count,
  frames,
  ramp,
  useEntrance,
  useFlip,
  type Shift,
} from "./motion.tsx";
import { summary } from "./summary.ts";

export type Box = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

const ROW = 24;
const STAGGER = 14;
const MORPH =
  "duration-[650ms] ease-[cubic-bezier(0.34,1.32,0.64,1)] motion-reduce:transition-none";

const reshuffle = (el: HTMLElement, from: Shift | null) => {
  if (!from?.y) return;
  const up = from.y > 0;
  Object.assign(el.style, {
    zIndex: up ? "2" : "1",
    background: up ? "var(--color-surface)" : "",
  });
  el.animate(
    frames(30, (t) => {
      const swap = ramp(t, 0.3, 1);
      const lift = Math.sin(Math.PI * swap);
      return {
        transform: `translateY(${from.y * (1 - swap)}px) scale(${up ? 1 + 0.05 * lift : 1 - 0.02 * lift})`,
        opacity: up ? 1 : 1 - 0.45 * lift,
        boxShadow: `0 ${6 * lift}px ${14 * lift}px rgb(0 0 0 / ${up ? 0.35 * lift : 0})`,
      };
    }),
    {
      duration: 1150,
      delay: Number(el.dataset.rank) * STAGGER,
      fill: "backwards",
    },
  ).finished.then(
    () => Object.assign(el.style, { zIndex: "", background: "" }),
    () => {},
  );
};

const enter = (el: HTMLElement) =>
  el.animate(
    [
      { opacity: 0, transform: "translateX(-12px)" },
      { opacity: 1, transform: "none" },
    ],
    {
      duration: 420,
      delay: Number(el.dataset.rank) * 22,
      easing: "cubic-bezier(0.22,1,0.36,1)",
      fill: "backwards",
    },
  );

const moved = (order: string[], previous: string[]) =>
  new Map(
    order.map((id, i) => [
      id,
      previous.includes(id) ? previous.indexOf(id) - i : 0,
    ]),
  );

const Move = ({ by }: { by: number }) =>
  by ? (
    <span
      className={`animate-place inline-block font-bold ${by > 0 ? "text-emerald-400" : "text-red-400"}`}
    >
      {by > 0 ? "▲" : "▼"}
      {Math.abs(by)}
    </span>
  ) : null;

interface BoxPlotProps {
  boxes: Box[];
  format: (v: number) => string;
}

export const BoxPlot = ({ boxes, format }: BoxPlotProps) => {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const stats = boxes.map((b) => ({ ...b, ...summary(b.values) }));
  const order = stats.map((s) => s.id);
  const [seen, setSeen] = useState({ order, moves: new Map<string, number>() });
  if (seen.order.join() !== order.join())
    setSeen({ order, moves: moved(order, seen.order) });
  useFlip(root, reshuffle);
  useEntrance(root, enter);
  const lo = Math.min(...stats.map((s) => s.min));
  const hi = Math.max(...stats.map((s) => s.max));
  const pct = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  const span = (a: number, b: number) => `${((b - a) / (hi - lo || 1)) * 100}%`;
  return (
    <div ref={root} className="relative" style={{ height: stats.length * ROW }}>
      {stats.map((s, i) => (
        <div
          key={s.id}
          data-flip={s.id}
          data-rank={i}
          onMouseEnter={() => setHover(s.id)}
          onMouseLeave={() => setHover(null)}
          className={`absolute inset-x-0 flex items-center gap-2 rounded ${hover === s.id ? "bg-zinc-800" : ""}`}
          style={
            {
              top: i * ROW,
              height: ROW,
              "--delay": `${i * STAGGER}ms`,
            } as CSSProperties
          }
        >
          <span className="tabular w-4 shrink-0 text-[9px] leading-none">
            <Move key={seen.order.join()} by={seen.moves.get(s.id) ?? 0} />
          </span>
          <DriverHover
            id={s.id}
            className="-ml-1 w-8 shrink-0 text-right text-xs text-zinc-300"
          >
            {s.label}
          </DriverHover>
          <div className="relative h-full flex-1 *:delay-(--delay)">
            <span
              className={`${MORPH} absolute top-1/2 h-px bg-zinc-500 transition-[left,width]`}
              style={{ left: pct(s.min), width: span(s.min, s.max) }}
            />
            <span
              className={`${MORPH} absolute top-1/2 h-3.5 min-w-0.5 -translate-y-1/2 rounded opacity-85 transition-[left,width]`}
              style={{
                left: pct(s.q1),
                width: span(s.q1, s.q3),
                background: ink(s.color),
              }}
            />
            <span
              className={`${MORPH} absolute top-1/2 h-[18px] w-0.5 -translate-1/2 bg-zinc-50 transition-[left]`}
              style={{ left: pct(s.median) }}
            />
          </div>
          <span className="tabular w-16 shrink-0 text-[11px] whitespace-nowrap text-zinc-400 sm:w-28">
            {hover === s.id ? (
              `${format(s.q1)}–${format(s.q3)}`
            ) : (
              <Count value={s.median} format={format} delay={i * STAGGER} />
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export type Bar = { id: string; label: string; color: string; value: number };

interface DivergingBarsProps {
  bars: Bar[];
  format: (v: number) => string;
}

export const DivergingBars = ({ bars, format }: DivergingBarsProps) => {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const W = 800;
  const L = 60;
  const mid = L + (W - L) / 2;
  const half = (W - L) / 2 - 50;
  const row = 24;
  return (
    <svg viewBox={`0 0 ${W} ${bars.length * row + 4}`} className="w-full">
      <line
        x1={mid}
        x2={mid}
        y1={0}
        y2={bars.length * row}
        className="stroke-zinc-700"
      />
      {bars.map((b, i) => {
        const y = i * row + 12;
        const w = (Math.abs(b.value) / max) * half;
        const x = b.value >= 0 ? mid : mid - w;
        return (
          <g key={b.id}>
            <text
              x={L - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-zinc-300 text-[12px]"
            >
              {b.label}
            </text>
            <rect
              x={x}
              y={y - 8}
              width={Math.max(w, 1)}
              height={16}
              rx={4}
              fill={ink(b.color)}
            />
            <text
              x={b.value >= 0 ? mid + w + 6 : mid - w - 6}
              y={y + 4}
              textAnchor={b.value >= 0 ? "start" : "end"}
              className="tabular fill-zinc-400 text-[11px]"
            >
              {format(b.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
