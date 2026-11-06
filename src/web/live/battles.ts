import type { LapRow, Period } from "../../shared/timing.ts";
import { gapSeconds, type Row } from "./view.ts";

const RANGE = 1;
const CLEAN_LAPS = 3;
const MIN_RATE = 0.1;
const HORIZON = 10;
const WINDOW = 5;
const MAX_CARS = 4;

export const NEXT = "next";

export type Pair = { ahead: Row; chaser: Row; interval: number };
export type Forecast = Pair & { rate: number; laps: number };
export type View =
  { group: Pair[]; pair: Pair } | { group: null; pair: Forecast };

const pairs = (rows: Row[], blank = false): Pair[] =>
  rows.slice(1).flatMap((chaser, i) => {
    const ahead = rows[i]!;
    const interval = gapSeconds(chaser.interval) ?? (blank ? 0 : null);
    return interval !== null &&
      (interval > 0 || blank) &&
      !ahead.status &&
      !chaser.status
      ? [{ ahead, chaser, interval }]
      : [];
  });

export const within = (group: Pair[], pass: Pair | null) =>
  group.find(
    (p) =>
      p.ahead.number === pass?.ahead.number &&
      p.chaser.number === pass.chaser.number,
  );

export const battles = (rows: Row[], pass: Pair | null = null): Pair[][] =>
  pairs(rows, true)
    .filter((p) => within([p], pass) || (p.interval > 0 && p.interval < RANGE))
    .reduce<Pair[][]>((groups, p) => {
      const last = groups.at(-1);
      if (last?.at(-1)!.chaser === p.ahead) last.push(p);
      else groups.push([p]);
      return groups;
    }, []);

export const label = (group: Pair[]) => `P${group[0]!.ahead.position}`;

export const contenders = (group: Pair[], focus: Pair) => {
  const start = Math.max(
    0,
    Math.min(group.indexOf(focus) - 1, group.length - MAX_CARS + 1),
  );
  const shown = group.slice(start, start + MAX_CARS - 1);
  return { pairs: shown, more: group.length - shown.length };
};

const lapsBy = (rows: LapRow[] | undefined, from: number, until: number) =>
  new Map(
    (rows ?? [])
      .filter((r) => r.t > from && r.t <= until && !r.pit)
      .map((r) => [r.lap, gapSeconds(r.gap)]),
  );

export const forecast = (
  rows: Row[],
  laps: Record<string, LapRow[]>,
  periods: Period[] | null,
  until: number,
  left: number,
): Forecast | null => {
  const ends = (periods ?? [])
    .filter((p) => p.from <= until)
    .map((p) => p.to ?? Infinity);
  const from = Math.max(-Infinity, ...ends);
  if (from > until) return null;
  return (
    pairs(rows)
      .filter((p) => p.interval >= RANGE)
      .flatMap((p) => {
        const a = lapsBy(laps[p.ahead.number], from, until);
        const c = lapsBy(laps[p.chaser.number], from, until);
        const at = (lap: number) => {
          const x = a.get(lap);
          const y = c.get(lap);
          return x == null || y == null ? null : y - x;
        };
        const latest = laps[p.chaser.number]?.findLast((r) => r.t <= until);
        const deltas = [...c.keys()]
          .filter((lap) => lap > (latest?.lap ?? 0) - WINDOW)
          .flatMap((lap) => {
            const now = at(lap);
            const before = at(lap - 1);
            return now === null || before === null ? [] : [now - before];
          })
          .slice(-CLEAN_LAPS);
        const rate = -deltas.reduce((s, d) => s + d, 0) / CLEAN_LAPS;
        const n = Math.max(1, Math.ceil((p.interval - RANGE) / rate));
        return deltas.length === CLEAN_LAPS &&
          rate >= MIN_RATE &&
          n <= Math.min(HORIZON, left)
          ? [{ ...p, rate, laps: n }]
          : [];
      })
      .sort((x, y) => x.laps - y.laps)[0] ?? null
  );
};

export const closest = (group: Pair[]) =>
  group.reduce((a, b) => (b.interval < a.interval ? b : a));

const has = (p: Pair, n: string | null | undefined) =>
  p.ahead.number === n || p.chaser.number === n;

export const ongoing = (
  groups: Pair[][],
  next: Forecast | null,
  tapped: string,
) =>
  tapped === NEXT ? !!next : groups.some((g) => g.some((p) => has(p, tapped)));

export const passes = (before: Row[], after: Row[]): Pair[] => {
  const was = new Map(
    pairs(before)
      .filter((p) => p.interval < RANGE)
      .map((p) => [p.chaser.number, p.ahead.number]),
  );
  return pairs(after, true).filter(
    (p) => was.get(p.ahead.number) === p.chaser.number,
  );
};

export const choose = (
  groups: Pair[][],
  next: Forecast | null,
  selected: string | undefined,
  tapped: string | null,
  favourite: string | undefined,
  pass: Pair | null = null,
): View | null => {
  const around = (n: string | undefined) => {
    const group = groups.find((g) => g.some((p) => has(p, n)));
    return group && { group, pair: closest(group.filter((p) => has(p, n))) };
  };
  const whole = (group: Pair[] | undefined) =>
    group && { group, pair: closest(group) };
  const coming = next && { group: null, pair: next };
  const passing = groups.flatMap((group) => {
    const pair = within(group, pass);
    return pair ? [{ group, pair }] : [];
  })[0];
  return (
    around(selected) ??
    (tapped === NEXT
      ? coming
      : whole(groups.find((g) => g.some((p) => has(p, tapped))))) ??
    around(favourite) ??
    passing ??
    whole(groups[0]) ??
    coming
  );
};
