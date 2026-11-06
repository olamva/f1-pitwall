import { SLIDE, type Box } from "../charts/Bars.tsx";
import { summary } from "../charts/summary.ts";
import { Car } from "../Headshot.tsx";
import { ink } from "../ink.ts";
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

export const CarPace = ({ teams, format }: CarPaceProps) => {
  const medians = teams.map((t) => summary(t.values).median);
  const best = Math.min(...medians);
  const span = Math.max(...medians) - best || 1;
  const step = STEPS.find((s) => span / s <= 4) ?? 5;
  const ticks = Array.from(
    { length: Math.floor(span / step + 1e-9) + 1 },
    (_, i) => i * step,
  );
  const x = (gap: number) =>
    `calc(${CAR} + (100% - ${CAR}) * ${1 - gap / span})`;
  return (
    <div className="relative" style={{ height: HEAD + teams.length * ROW }}>
      <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
        {ticks.map((gap) => (
          <div
            key={gap}
            className={`${SLIDE} absolute inset-y-0 transition-[left]`}
            style={{ left: x(gap) }}
          >
            <span
              className={`tabular absolute top-0 text-[10px] whitespace-nowrap ${gap ? "-translate-x-1/2 text-zinc-500" : "-translate-x-full font-semibold text-zinc-300"}`}
            >
              {gap ? `+${gap.toFixed(step < 1 ? 1 : 0)}s` : "Fastest"}
            </span>
            <span
              className={`absolute bottom-0 border-l ${gap ? "border-dashed border-zinc-700" : "border-zinc-400"}`}
              style={{ top: HEAD - 4 }}
            />
          </div>
        ))}
      </div>
      {teams.map((t, i) => (
        <div
          key={t.id}
          className={`${SLIDE} absolute inset-x-0 transition-[top]`}
          style={{ top: HEAD + i * ROW, height: ROW }}
        >
          <div
            className="absolute inset-y-0 left-0 flex items-center gap-2"
            style={{ width: GUTTER }}
          >
            <TeamLogo team={t.id} className="size-5 shrink-0" />
            <span className="tabular text-[11px] text-zinc-400">
              {medians[i] === best
                ? format(best)
                : `+${(medians[i]! - best).toFixed(3)}`}
            </span>
          </div>
          <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
            <span
              className={`${SLIDE} absolute top-1/2 right-0 h-0.5 -translate-y-1/2 opacity-70 transition-[left]`}
              style={{
                left: x(medians[i]! - best),
                background: ink(t.color),
              }}
            />
            <Car
              id={t.id}
              pose="right"
              title={t.label}
              className={`${SLIDE} absolute top-1/2 w-32 max-w-none -translate-x-full -translate-y-1/2 drop-shadow-[0_4px_6px_rgb(0_0_0_/_0.35)] transition-[left]`}
              style={{ left: x(medians[i]! - best) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
