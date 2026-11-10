import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Round } from "../shared/season.ts";
import type { Track } from "../shared/timing.ts";
import { useTracks } from "./Circuit.tsx";
import { SeasonData } from "./DriverCard.tsx";
import { projector } from "./live/TrackMap.tsx";

interface LoadingProps {
  error?: string | null;
  word?: string;
}

export const LoadingRound = createContext<{ year: string; round: number }>({
  year: String(new Date().getFullYear()),
  round: 0,
});

type Lap = { d: string; box: readonly number[] };

const DAY = 86_400_000;

const raceWeek = (rounds: Round[]) => {
  const monday =
    new Date().setHours(0, 0, 0, 0) - ((new Date().getDay() + 6) % 7) * DAY;
  return rounds.find((r) => {
    const race = Date.parse(r.sessions.race ?? "");
    return race >= monday && race < monday + 7 * DAY;
  })?.round;
};

const pick = (pool: Record<number, Track>, rounds: Round[], seed: number) => {
  const all = Object.values(pool);
  return pool[raceWeek(rounds) ?? -1] ?? all[Math.floor(seed * all.length)];
};

const lap = (track: Track): Lap => {
  const { project, box } = projector(track, 0);
  const points = track.x.map((x, i) =>
    project(x, track.y[i]!).map(Math.round).join(" "),
  );
  return { d: `M${points.join("L")}Z`, box };
};

const HotLap = ({ lap }: { lap: Lap | undefined }) => (
  <svg
    aria-hidden
    viewBox={lap?.box.join(" ")}
    className="h-21 w-36 md:h-28 md:w-48"
    fill="none"
    strokeWidth={lap && 3 * Math.max(lap.box[2]! / 96, lap.box[3]! / 56)}
    strokeLinejoin="round"
  >
    {lap && (
      <>
        <path d={lap.d} className="stroke-zinc-700" />
        <path
          d={lap.d}
          pathLength={100}
          strokeDasharray="18 82"
          strokeLinecap="round"
          className="animate-hot-lap stroke-[#e10600]"
        />
      </>
    )}
  </svg>
);

export const Slow = ({ word = "Loading" }: { word?: string }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  if (tick < 20) return null;
  const dots = ((tick - 20) % 3) + 1;
  return (
    <>
      {word}
      <span aria-hidden>
        {".".repeat(dots)}
        <span className="invisible">{".".repeat(3 - dots)}</span>
      </span>
    </>
  );
};

export const Loading = ({ error, word }: LoadingProps) => {
  const { year, round } = useContext(LoadingRound);
  const season = useContext(SeasonData);
  const own = useTracks(year);
  const pool = useTracks(String(season?.year ?? year));
  const [seed] = useState(Math.random);
  const track =
    own && (own[round] ?? (pool && season && pick(pool, season.rounds, seed)));
  const shown = useMemo(() => track && lap(track), [track]);
  return (
    <div
      role="status"
      ref={(e) =>
        e?.style.setProperty(
          "--fill",
          `${innerHeight - e.getBoundingClientRect().top - 16}px`,
        )
      }
      className="flex min-h-[max(12rem,calc(var(--fill)-5rem))] flex-col items-center justify-center gap-3 text-sm text-zinc-400 sm:min-h-[max(12rem,var(--fill))]"
    >
      {error ? (
        <p className="text-center wrap-anywhere text-red-400">{error}</p>
      ) : (
        <>
          <HotLap lap={shown} />
          <p className="min-h-5">
            <Slow word={word} />
          </p>
        </>
      )}
    </div>
  );
};
