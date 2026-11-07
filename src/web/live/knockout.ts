import { lapSeconds, type LapRow } from "../../shared/timing.ts";
import { lapTime } from "../charts/summary.ts";
import { qualifyingPart, type Row, type SessionBests } from "./view.ts";

type Obj = Record<string, any>;

export const knockout = (state: Obj): number | null =>
  (qualifyingPart(state) &&
    Number(state.TimingData.NoEntries?.[state.TimingData.SessionPart])) ||
  null;

const partBest = (line: Obj | undefined, part: number) =>
  lapSeconds(line?.BestLapTimes?.[part - 1]?.Value ?? "");

export const cutGaps = (tower: Row[], state: Obj): Row[] => {
  const cut = knockout(state);
  const part = state.TimingData?.SessionPart;
  const lines: Obj = state.TimingData?.Lines ?? {};
  const limit = cut && partBest(lines[tower[cut - 1]?.number ?? ""], part);
  if (!cut || !limit) return tower;
  return tower.map((r, i) => {
    const time = partBest(lines[r.number], part);
    const skip = i === cut - 1 || r.status === "KO" || time === null;
    const gap = skip ? "" : (time - limit).toFixed(3);
    return { ...r, gap: gap && !gap.startsWith("-") ? `+${gap}` : gap };
  });
};

const PUSH = 1.05;

const sum = (xs: (number | null)[]) =>
  xs.reduce<number | null>(
    (a, b) => (a === null || b === null ? null : a + b),
    0,
  );

export const reference = (
  number: string,
  pbs: Record<string, LapRow>,
  bests: SessionBests,
) => {
  const lap = lapSeconds(bests.lap?.value ?? "") ?? Infinity;
  return [number, bests.lap?.number ?? ""]
    .map((n) => ({ number: n, lap: pbs[n] }))
    .find((r) => r.lap && lapSeconds(r.lap.time)! <= lap * PUSH);
};

const fromSectors = (r: Row, ref: (number | null)[]) => {
  const done = r.sectors.map((s) => lapSeconds(s.value));
  const at = done.indexOf(null);
  const sofar = sum(done.slice(0, at));
  const pace = sum(ref.slice(0, at));
  const rest = sum(ref.slice(at));
  return at > 0 &&
    ref.length > 2 &&
    sofar &&
    pace &&
    rest &&
    sofar <= pace * PUSH
    ? sofar + rest
    : null;
};

export const projectLaps = (
  rows: Row[],
  pbs: Record<string, LapRow>,
  bests: SessionBests,
  live?: { number: string | undefined; seconds: number | null },
): Row[] => {
  const lap = lapSeconds(bests.lap?.value ?? "") ?? Infinity;
  return rows.map((r) => {
    const ref = reference(r.number, pbs, bests)?.lap;
    const pace = lapSeconds(ref?.time ?? "") ?? 0;
    const pushed = (lapSeconds(r.lastLap) ?? Infinity) <= pace * PUSH;
    const seconds =
      (r.number === live?.number && !pushed && live.seconds) ||
      fromSectors(r, (ref?.sectors ?? []).map(lapSeconds));
    if (r.status || !seconds) return r;
    const mark =
      seconds < lap
        ? "overall"
        : seconds < (lapSeconds(r.bestLap) ?? Infinity)
          ? "personal"
          : "normal";
    return { ...r, projected: { value: lapTime(seconds), mark } };
  });
};
