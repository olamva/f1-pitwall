import type { LapRow } from "../../shared/timing.ts";
import type { Row } from "./view.ts";

type Obj = Record<string, any>;

export const TRAPS = ["ST", "I1", "I2", "FL"] as const;
export type Trap = (typeof TRAPS)[number];

export const trapSpeeds = (state: Obj, rows: Row[], trap: Trap) =>
  rows
    .map((row) => ({
      row,
      speed:
        Number(
          state.TimingStats?.Lines?.[row.number]?.BestSpeeds?.[trap]?.Value,
        ) || 0,
    }))
    .filter((s) => s.speed > 0)
    .sort((a, b) => b.speed - a.speed);

export type Stop = {
  number: string;
  lap: number;
  t: number;
  from: string;
  to: string;
  lost: number | null;
};

export const pitStops = (laps: Record<string, LapRow[]>, until: number) =>
  Object.entries(laps)
    .flatMap(([number, list]) =>
      list.flatMap((r, i): Stop[] => {
        const out = list[i + 1];
        if (r.pit !== "in" || r.t > until) return [];
        const after = out && out.t <= until ? out : null;
        return [
          {
            number,
            lap: r.lap,
            t: r.t,
            from: r.compound,
            to: after?.compound ?? "",
            lost: after ? Number(after.position) - Number(r.position) : null,
          },
        ];
      }),
    )
    .sort((a, b) => b.t - a.t);

export const movers = (rows: Row[]) => {
  const moved = rows.filter((r) => r.gained !== null && r.status !== "OUT");
  const by = (sign: number) =>
    moved
      .filter((r) => Math.sign(r.gained!) === sign)
      .sort((a, b) => sign * (b.gained! - a.gained!))
      .slice(0, 3);
  return { up: by(1), down: by(-1) };
};
