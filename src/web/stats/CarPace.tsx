import { useRef } from "react";
import type { Box } from "../charts/Bars.tsx";
import {
  Count,
  frames,
  ramp,
  smooth,
  useEntrance,
  useFlip,
  type Shift,
} from "../charts/motion.tsx";
import { summary } from "../charts/summary.ts";
import { Car } from "../Headshot.tsx";
import { TeamHover } from "../TeamCard.tsx";
import { TeamLogo } from "../TeamLogo.tsx";

interface CarPaceProps {
  teams: Box[];
  format: (v: number) => string;
}

const ROW = 36;
const HEAD = 20;
const GUTTER = "6.25rem";
const CAR = "8rem";
const STEPS = [0.1, 0.2, 0.5, 1, 2];
const DRIVE = 1250;
const GRID = 55;

const speed = (t: number) => 16 * t * t * (1 - t) * (1 - t);
const thrust = (t: number) => 60 * t * (t - 1) * (2 * t - 1);
const pitch = (x: number, t: number) =>
  Math.max(-3, Math.min(3, x * thrust(t) * 0.004));

const race = (el: HTMLElement, from: Shift | null) => {
  if (!from) return;
  const timing = {
    duration: DRIVE,
    delay: Number(el.dataset.rank) * GRID,
    fill: "backwards" as const,
  };
  el.style.zIndex = from.y > 0 ? "2" : "";
  el.animate(
    frames(40, (t) => ({
      transform: `translate(${from.x * (1 - smooth(t))}px, ${from.y * (1 - ramp(t, 0.15, 0.85))}px) rotate(${pitch(from.x, t)}deg)`,
    })),
    timing,
  );
  const reach = Math.min(1, -from.x / 90);
  if (reach > 0)
    for (const streak of el.querySelectorAll<HTMLElement>(
      ":scope > [data-streak]",
    ))
      streak.animate(
        frames(20, (t) => ({
          opacity: speed(t) * reach,
          transform: `scaleX(${0.2 + 0.8 * speed(t) * reach})`,
        })),
        timing,
      );
};

const launch = (el: HTMLElement) => {
  if (!el.dataset.flip?.startsWith("car")) return;
  race(el, { x: Math.min(0, el.offsetWidth - el.offsetLeft), y: 0 });
  el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1 }], {
    duration: DRIVE,
    delay: Number(el.dataset.rank) * GRID,
    fill: "backwards",
  });
};

export const CarPace = ({ teams, format }: CarPaceProps) => {
  const root = useRef<HTMLDivElement>(null);
  useFlip(root, race);
  useEntrance(root, launch);
  const medians = teams.map((t) => summary(t.values).median);
  const best = Math.min(...medians);
  const span = Math.max(...medians) - best || 1;
  const step = STEPS.find((s) => span / s <= 4) ?? 5;
  const ticks = Array.from(
    { length: Math.floor(span / step + 1e-9) + 1 },
    (_, i) => i * step,
  );
  const x = (gap: number) =>
    `calc(${CAR} + (100% - ${CAR} - 0.375rem) * ${1 - gap / span})`;
  const gap = (v: number) => (v < 5e-4 ? format(best) : `+${v.toFixed(3)}`);
  return (
    <div
      ref={root}
      className="relative"
      style={{ height: HEAD + teams.length * ROW }}
    >
      <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
        {ticks.map((gap) => (
          <div
            key={gap}
            className="absolute inset-y-0 transition-[left,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none starting:opacity-0"
            style={{ left: x(gap) }}
          >
            <span
              className={`tabular absolute top-0 text-[10px] whitespace-nowrap ${gap ? "-translate-x-1/2 text-zinc-500" : "-translate-x-full font-semibold text-zinc-300"}`}
            >
              {gap ? `+${gap.toFixed(step < 1 ? 1 : 0)}s` : "Fastest"}
            </span>
            <span
              className={`absolute bottom-0 ${gap ? "w-px bg-zinc-800" : "w-1.5 bg-[repeating-conic-gradient(var(--color-zinc-50)_0_25%,var(--color-zinc-900)_0_50%)] bg-size-[6px_6px]"}`}
              style={{ top: HEAD - 4 }}
            />
          </div>
        ))}
      </div>
      {teams.map((t, i) => (
        <div
          key={t.id}
          data-flip={`row:${t.id}`}
          data-rank={i}
          className="absolute inset-x-0"
          style={{ top: HEAD + i * ROW, height: ROW }}
        >
          <div
            className="absolute inset-y-0 left-0 flex items-center gap-2"
            style={{ width: GUTTER }}
          >
            <TeamHover id={t.id} className="shrink-0">
              <TeamLogo team={t.id} className="block size-5" />
            </TeamHover>
            <Count
              value={medians[i]! - best}
              format={gap}
              duration={DRIVE}
              delay={i * GRID}
              className="tabular text-[11px] text-zinc-400"
            />
          </div>
          <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
            <div
              data-flip={`car:${t.id}`}
              data-rank={i}
              className="absolute top-1/2 w-32 origin-[30%_80%] -translate-x-full -translate-y-1/2"
              style={{ left: x(medians[i]! - best) }}
            >
              <span
                data-streak
                className="absolute top-[38%] right-[88%] h-px w-20 origin-right bg-linear-to-l from-zinc-400 to-transparent opacity-0"
              />
              <span
                data-streak
                className="absolute top-[62%] right-[94%] h-0.5 w-28 origin-right rounded-full bg-linear-to-l from-zinc-500 to-transparent opacity-0"
              />
              <span
                data-streak
                className="absolute top-[80%] right-[90%] h-px w-14 origin-right bg-linear-to-l from-zinc-400 to-transparent opacity-0"
              />
              <TeamHover id={t.id} className="relative">
                <Car
                  id={t.id}
                  pose="right"
                  alt={t.label}
                  className="group-data-[pending=true]:animate-rumble w-32 max-w-none drop-shadow-[0_4px_6px_rgb(0_0_0_/_0.35)]"
                />
              </TeamHover>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
