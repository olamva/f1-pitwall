import type { Track } from "../shared/timing.ts";
import { useJson } from "./api.ts";
import { projector } from "./live/TrackMap.tsx";

export const useTracks = (year: string) =>
  useJson<Record<number, Track>>(`/api/tracks/${year}`).data ?? {};

interface CircuitProps {
  track: Track | undefined;
  round: number | undefined;
}

const Shape = ({ track }: { track: Track }) => {
  const { project, box } = projector(track, 0);
  return (
    <svg viewBox={box.join(" ")} className="size-full opacity-10">
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
    className="pointer-events-none absolute top-1 right-1 h-24 w-32 text-zinc-50"
  >
    {track && <Shape track={track} />}
    {round && (
      <span className="font-f1 absolute top-4 right-5 text-2xl leading-none font-black text-zinc-700">
        {round}
      </span>
    )}
  </span>
);
