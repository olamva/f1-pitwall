import { useState } from "react";
import { ink } from "../ink.ts";
import { summary } from "./summary.ts";

export type Box = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

export const SLIDE = "duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";
const ROW = 24;

interface BoxPlotProps {
  boxes: Box[];
  format: (v: number) => string;
}

export const BoxPlot = ({ boxes, format }: BoxPlotProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const stats = boxes.map((b) => ({ ...b, ...summary(b.values) }));
  const lo = Math.min(...stats.map((s) => s.min));
  const hi = Math.max(...stats.map((s) => s.max));
  const pct = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  const span = (a: number, b: number) => `${((b - a) / (hi - lo || 1)) * 100}%`;
  return (
    <div className="relative" style={{ height: stats.length * ROW }}>
      {stats.map((s, i) => (
        <div
          key={s.id}
          onMouseEnter={() => setHover(s.id)}
          onMouseLeave={() => setHover(null)}
          className={`${SLIDE} absolute inset-x-0 flex items-center gap-2 rounded transition-[top] ${hover === s.id ? "bg-zinc-800" : ""}`}
          style={{ top: i * ROW, height: ROW }}
        >
          <span className="w-9 shrink-0 text-right text-xs text-zinc-300">
            {s.label}
          </span>
          <div className="relative h-full flex-1">
            <span
              className={`${SLIDE} absolute top-1/2 h-px bg-zinc-500 transition-[left,width]`}
              style={{ left: pct(s.min), width: span(s.min, s.max) }}
            />
            <span
              className={`${SLIDE} absolute top-1/2 h-3.5 min-w-0.5 -translate-y-1/2 rounded opacity-85 transition-[left,width]`}
              style={{
                left: pct(s.q1),
                width: span(s.q1, s.q3),
                background: ink(s.color),
              }}
            />
            <span
              className={`${SLIDE} absolute top-1/2 h-[18px] w-0.5 -translate-1/2 bg-zinc-50 transition-[left]`}
              style={{ left: pct(s.median) }}
            />
          </div>
          <span className="tabular w-16 shrink-0 text-[11px] whitespace-nowrap text-zinc-400 sm:w-28">
            {hover === s.id
              ? `${format(s.q1)}–${format(s.q3)}`
              : format(s.median)}
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
            <title>{`${b.label}: ${format(b.value)}`}</title>
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
