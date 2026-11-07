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

export const projectLaps = (
  rows: Row[],
  pbs: Record<string, LapRow>,
  bests: SessionBests,
): Row[] => {
  const lap = lapSeconds(bests.lap?.value ?? "") ?? Infinity;
  const fallback = pbs[bests.lap?.number ?? ""];
  return rows.map((r) => {
    const done = r.sectors.map((s) => lapSeconds(s.value));
    const at = done.indexOf(null);
    const ref =
      [pbs[r.number], fallback]
        .find((l) => l && lapSeconds(l.time)! <= lap * PUSH)
        ?.sectors.map(lapSeconds) ?? [];
    const sofar = sum(done.slice(0, at));
    const pace = sum(ref.slice(0, at));
    const rest = sum(ref.slice(at));
    if (r.status || at < 1 || ref.length < 3 || !sofar || !pace || !rest)
      return r;
    if (sofar > pace * PUSH) return r;
    const seconds = sofar + rest;
    const mark =
      seconds < lap
        ? "overall"
        : seconds < (lapSeconds(r.bestLap) ?? Infinity)
          ? "personal"
          : "normal";
    return { ...r, projected: { value: lapTime(seconds), mark } };
  });
};
