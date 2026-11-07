import { useMemo, useRef } from "react";
import type { LapRow, LapTrace, Outline } from "../../shared/timing.ts";
import { useJson } from "../api.ts";
import { course, locate, STEP, trace, type Course } from "../compare.ts";
import { useProjectedLap } from "../projectedLap.ts";
import { projectLaps, reference } from "./knockout.ts";
import type { PositionTrail } from "./useFeed.ts";
import type { Row, SessionBests } from "./view.ts";

const PUSH = 1.05;
const SLACK_S = 1;
const RECENT_MS = 5_000;
const TIMING_LAG_MS = 760;

type Clock = { driver: string; start: number | null; at: number; d: number };

const along = (c: Course, x: number, y: number) =>
  (locate(c, x, y) - c.finish + c.length) % c.length;

const lapClock = (
  c: Course,
  driver: string,
  trail: PositionTrail,
  last: Clock | null,
): Clock | null =>
  trail.reduce<Clock | null>((prev, [t, cars]) => {
    const p = cars[driver];
    if (!p || !(p[0] || p[1])) return prev;
    const mine = prev?.driver === driver ? prev : null;
    if (mine && t <= mine.at) return prev;
    const d = along(c, p[0], p[1]);
    const rest = mine ? c.length - mine.d : 0;
    const crossed =
      mine && mine.d - d > c.length / 2
        ? mine.at + ((t - mine.at) * rest) / (rest + d)
        : null;
    return { driver, start: crossed ?? mine?.start ?? null, at: t, d };
  }, last);

const liveSeconds = (clock: Clock | null, ref: number[] | null, lapEnd = 0) => {
  const seen = clock?.start && clock.start > lapEnd - RECENT_MS;
  const start = seen ? clock.start! : lapEnd && lapEnd - TIMING_LAG_MS;
  if (!clock || !start || !ref) return null;
  const done = ref[Math.round(clock.d / STEP)];
  const elapsed = (clock.at - start) / 1000;
  return done !== undefined && elapsed <= done * PUSH + SLACK_S
    ? elapsed + ref.at(-1)! - done
    : null;
};

interface Projection {
  rows: Row[];
  pbs: Record<string, LapRow>;
  bests: SessionBests;
  driver: string | undefined;
  qualifying: boolean;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  trail: PositionTrail | undefined;
  traceUrl: (driver: string, lap: number) => string;
}

export const useProjected = ({
  rows,
  pbs,
  bests,
  driver,
  qualifying,
  laps,
  outline,
  trail,
  traceUrl,
}: Projection): Row[] => {
  const on = useProjectedLap() && qualifying;
  const watched = on ? driver : undefined;
  const pb = reference(driver ?? "", pbs, bests);
  const c = useMemo(() => outline && course(outline), [outline]);
  const url = watched && c && pb?.lap ? traceUrl(pb.number, pb.lap.lap) : null;
  const lap = useJson<LapTrace>(url).data;
  const ref = useMemo(
    () => (c && lap ? (trace(c, lap)?.time ?? null) : null),
    [c, lap],
  );
  const clock = useRef<Clock | null>(null);
  clock.current =
    c && watched ? lapClock(c, watched, trail ?? [], clock.current) : null;
  const seconds = liveSeconds(
    clock.current,
    ref,
    laps[driver ?? ""]?.at(-1)?.t,
  );
  return on ? projectLaps(rows, pbs, bests, { number: driver, seconds }) : rows;
};
