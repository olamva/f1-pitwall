import { SLIDE, type Box } from "../charts/Bars.tsx";
import { summary } from "../charts/summary.ts";
import { Car } from "../Headshot.tsx";
import { TeamLogo } from "../TeamLogo.tsx";

interface CarPaceProps {
  teams: Box[];
  format: (v: number) => string;
}

const ROW = 36;

export const CarPace = ({ teams, format }: CarPaceProps) => {
  const medians = teams.map((t) => summary(t.values).median);
  const best = Math.min(...medians);
  const worst = Math.max(...medians);
  return (
    <div className="relative" style={{ height: teams.length * ROW }}>
      {teams.map((t, i) => (
        <div
          key={t.id}
          className={`${SLIDE} absolute inset-x-0 flex items-center gap-2 transition-[top]`}
          style={{ top: i * ROW, height: ROW }}
        >
          <TeamLogo team={t.id} className="size-5 shrink-0" />
          <span className="tabular w-16 shrink-0 text-[11px] text-zinc-400">
            {medians[i] === best
              ? format(best)
              : `+${(medians[i]! - best).toFixed(3)}`}
          </span>
          <div className="relative h-full flex-1">
            <Car
              id={t.id}
              pose="right"
              title={t.label}
              className={`${SLIDE} absolute top-1/2 w-32 max-w-none -translate-x-full -translate-y-1/2 drop-shadow-[0_4px_6px_rgb(0_0_0_/_0.35)] transition-[left]`}
              style={{
                left: `calc(8rem + (100% - 8rem) * ${1 - (medians[i]! - best) / (worst - best || 1)})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
