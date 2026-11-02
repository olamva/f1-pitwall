import { Fragment } from "react";
import { Figure } from "../Headshot.tsx";
import { ink } from "../ink.ts";
import type { Duel, Who } from "./derive.ts";

interface TeammatesProps {
  duels: Duel[];
  who: Map<string, Who>;
  hasSprints: boolean;
  hasSprintQualifying: boolean;
}

interface SplitProps {
  label: string;
  pair: [number, number];
  color: string;
}

const Split = ({ label, pair, color }: SplitProps) => {
  const total = pair[0] + pair[1];
  if (total === 0)
    return (
      <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-sm">
        <span />
        <div className="text-center text-xs text-zinc-500" title={label}>
          N/A
        </div>
        <span />
      </div>
    );
  return (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-sm">
      <span className="tabular text-right font-semibold">{pair[0]}</span>
      <div className="flex h-3 gap-0.5" title={label}>
        <div
          className="rounded-l"
          style={{
            width: `${(pair[0] / total) * 100}%`,
            background: ink(color),
          }}
        />
        <div
          className="rounded-r bg-zinc-600"
          style={{ width: `${(pair[1] / total) * 100}%` }}
        />
      </div>
      <span className="tabular font-semibold">{pair[1]}</span>
    </div>
  );
};

export const Teammates = ({
  duels,
  who,
  hasSprints,
  hasSprintQualifying,
}: TeammatesProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {duels.map((d) => {
      const [a, b] = [who.get(d.a), who.get(d.b)];
      const color = a?.color ?? "#888";
      const faster = d.gap === null ? null : d.gap < 0 ? a : b;
      return (
        <section key={d.team} className="bg-surface space-y-2 rounded-xl p-3">
          <header
            className="-mx-3 -mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2 rounded-t-xl px-3 pt-3 text-sm font-semibold"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 30%, transparent), transparent)`,
            }}
          >
            {(
              [
                [d.a, a, "left", d.racePoints[0] < d.racePoints[1]],
                [d.b, b, "right", d.racePoints[1] < d.racePoints[0]],
              ] as const
            ).map(([id, w, pose, behind], i) => (
              <Fragment key={id}>
                {i > 0 && (
                  <span className="font-f1 self-center text-zinc-500">vs</span>
                )}
                <span
                  className={`flex min-w-0 flex-col gap-1 ${i ? "items-start" : "items-end text-right"}`}
                >
                  <Figure
                    id={id}
                    pose={pose}
                    transform="c_crop,g_north,h_0.55/c_scale,h_500"
                    loading="lazy"
                    className={`h-44 ${i ? "origin-bottom-left" : "origin-bottom-right"} ${behind ? "scale-92 opacity-70" : ""}`}
                  />
                  {w?.name ?? id}
                </span>
              </Fragment>
            ))}
          </header>
          <div className="text-xs text-zinc-500">Qualifying</div>
          <Split label="Qualifying" pair={d.quali} color={color} />
          <div className="text-xs text-zinc-500">Race</div>
          <Split label="Race" pair={d.race} color={color} />
          <div className="text-xs text-zinc-500">Race points</div>
          <Split label="Race points" pair={d.racePoints} color={color} />
          {hasSprints && (
            <>
              <div className="border-t border-zinc-700 pt-2 text-xs font-semibold text-zinc-400">
                Sprint
              </div>
              {hasSprintQualifying && (
                <>
                  <div className="text-xs text-zinc-500">Sprint qualifying</div>
                  <Split
                    label="Sprint qualifying"
                    pair={d.sprintQuali}
                    color={color}
                  />
                </>
              )}
              <div className="text-xs text-zinc-500">Sprint race</div>
              <Split label="Sprint" pair={d.sprint} color={color} />
              <div className="text-xs text-zinc-500">Sprint points</div>
              <Split
                label="Sprint points"
                pair={d.sprintPoints}
                color={color}
              />
            </>
          )}
          {faster && d.gap !== null && (
            <p className="text-xs text-zinc-400">
              Median qualifying gap: {faster.code} faster by{" "}
              {Math.abs(d.gap).toFixed(3)} s
            </p>
          )}
        </section>
      );
    })}
  </div>
);
