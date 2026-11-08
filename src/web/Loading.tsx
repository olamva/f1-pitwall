import { createContext, useContext, useEffect, useState } from "react";
import type { Track } from "../shared/timing.ts";
import { useTracks } from "./Circuit.tsx";
import { projector } from "./live/TrackMap.tsx";

interface LoadingProps {
  label?: string;
  error?: string | null;
}

export const LoadingRound = createContext<{ year: string; round: number }>({
  year: String(new Date().getFullYear()),
  round: 0,
});

type Lap = { d: string; box: readonly number[] };

const SKETCH: Lap = {
  d: "M20 50L70 50C80 50 84 44 80 38L72 28C69 24 72 20 76 20L82 20C88 20 90 14 86 10L30 10C22 10 18 14 20 20L26 30C28 34 24 38 18 38C12 38 10 44 14 48C16 50 18 50 20 50Z",
  box: [8, 6, 84, 48],
};

const lap = (track: Track): Lap => {
  const { project, box } = projector(track, 0);
  const points = track.x.map((x, i) =>
    project(x, track.y[i]!).map(Math.round).join(" "),
  );
  return { d: `M${points.join("L")}Z`, box };
};

const HotLap = ({ d, box }: Lap) => (
  <svg
    aria-hidden
    viewBox={box.join(" ")}
    className="h-14 w-24"
    fill="none"
    strokeWidth={3 * Math.max(box[2]! / 96, box[3]! / 56)}
    strokeLinejoin="round"
  >
    <path d={d} className="stroke-zinc-700" />
    <path
      d={d}
      pathLength={100}
      strokeDasharray="18 82"
      strokeLinecap="round"
      className="animate-hot-lap stroke-[#e10600]"
    />
  </svg>
);

const Slow = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  if (tick < 20) return null;
  const dots = ((tick - 20) % 3) + 1;
  return (
    <>
      Loading
      <span aria-hidden>
        {".".repeat(dots)}
        <span className="invisible">{".".repeat(3 - dots)}</span>
      </span>
    </>
  );
};

export const Loading = ({ label, error }: LoadingProps) => {
  const { year, round } = useContext(LoadingRound);
  const own = useTracks(year)[round];
  const pool = Object.values(useTracks(String(new Date().getFullYear())));
  const [shown] = useState(() => {
    const track = own ?? pool[Math.floor(Math.random() * pool.length)];
    return track ? lap(track) : SKETCH;
  });
  return (
    <div
      role="status"
      className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-zinc-400"
    >
      {error ? (
        <p className="text-center wrap-anywhere text-red-400">{error}</p>
      ) : (
        <>
          <HotLap {...shown} />
          <p className="min-h-5">{label ?? <Slow />}</p>
        </>
      )}
    </div>
  );
};
