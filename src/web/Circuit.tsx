import { useEffect, useState } from "react";
import type { Track } from "../shared/timing.ts";
import { getJson } from "./api.ts";
import { projector } from "./live/TrackMap.tsx";

type Tracks = Record<number, Track>;
const requests = new Map<string, Promise<unknown>>();
const loaded: Record<string, Tracks> = {};

export const useTracks = (year: string): Tracks | undefined => {
  const [, render] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!requests.has(year))
      requests.set(
        year,
        getJson<Tracks>(`/api/tracks/${year}`).then(
          (t) => (loaded[year] = t),
          () => requests.delete(year),
        ),
      );
    requests.get(year)!.then(() => alive && render((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [year]);
  return loaded[year];
};

interface CircuitProps {
  track: Track | undefined;
  round: number | undefined;
}

const Shape = ({ track }: { track: Track }) => {
  const { project, box } = projector(track, 0);
  return (
    <svg
      viewBox={box.join(" ")}
      preserveAspectRatio="xMaxYMin meet"
      className="size-full opacity-10"
    >
      <polygon
        points={track.x
          .map((x, i) => project(x, track.y[i]!).map(Math.round).join(","))
          .join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={44}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Circuit = ({ track, round }: CircuitProps) => (
  <span
    aria-hidden
    className="pointer-events-none absolute top-3.5 right-4 flex h-[4.75rem] w-28 flex-col items-end gap-1.5 text-zinc-50"
  >
    {round && (
      <span className="font-f1 text-xl leading-none font-black text-zinc-700">
        {round}
      </span>
    )}
    {track && (
      <span className="min-h-0 w-full flex-1">
        <Shape track={track} />
      </span>
    )}
  </span>
);
