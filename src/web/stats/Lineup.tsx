import type { Championship, Standing } from "../../shared/clinch.ts";
import { Figure } from "../Headshot.tsx";
import { ink } from "../ink.ts";
import type { Who } from "./derive.ts";

interface LineupProps {
  champ: Championship;
  table: Standing[];
  alive: string[];
  who: Map<string, Who>;
  gain: number;
}

export const Lineup = ({ champ, table, alive, who, gain }: LineupProps) => {
  const field = table.filter((s) => alive.includes(s.id)).slice(0, 6);
  const lead = field[0]?.points ?? 0;
  if (champ !== "drivers" || field.length < 2) return null;
  return (
    <div className="mb-3">
      <p className="font-f1 mb-2 text-center text-sm font-bold tracking-wider">
        {field.map((s, i) => (
          <span key={s.id}>
            {i > 0 && <span className="px-1.5 text-zinc-500">vs</span>}
            <span style={{ color: ink(who.get(s.id)?.color) }}>
              {who.get(s.id)?.code ?? s.id}
            </span>
          </span>
        ))}
      </p>
      <ol className="flex justify-center">
        {field.map((s, i) => {
          const gap = lead - s.points;
          const depth = Math.min(gap / gain, 1);
          const color = who.get(s.id)?.color ?? "#888";
          return (
            <li
              key={s.id}
              className="relative flex max-w-40 min-w-0 flex-1 flex-col items-center"
              style={{ zIndex: field.length - i }}
            >
              <div
                className="relative aspect-[3/5] w-[115%] origin-bottom transition-[scale,filter] duration-500"
                style={{
                  scale: 1 - 0.3 * depth,
                  filter: `brightness(${1 - 0.35 * depth})`,
                  background: `radial-gradient(closest-side at 50% 40%, ${color}66, transparent)`,
                }}
              >
                <Figure
                  id={s.id}
                  pose="front"
                  transform="c_lfill,h_600"
                  className="absolute inset-0 size-full mask-b-from-70% object-cover object-top"
                />
              </div>
              <span className="tabular font-f1 text-lg font-bold">
                {s.points}
              </span>
              <span className="tabular text-xs text-zinc-400">
                {gap ? `−${gap}` : "Leader"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
