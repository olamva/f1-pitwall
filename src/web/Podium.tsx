import type { CSSProperties } from "react";
import { EyeOff, Trophy } from "lucide-react";
import type { RaceArchive } from "../shared/season.ts";
import { DriverHover } from "./DriverCard.tsx";
import { BUST, FALLBACK, Figure, Headshot, useArt } from "./Headshot.tsx";
import { ink } from "./ink.ts";
import { TeamLogo } from "./TeamLogo.tsx";

export type Race = RaceArchive["races"][number];

export interface PodiumEntry {
  id: string;
  name: string;
  color: string;
  value: string;
  team?: string;
}

interface PodiumProps {
  entries: PodiumEntry[];
  onSelect?: (id: string) => void;
}

export const METALS = ["#d4af37", "#d4d4d8", "#d97706"];
const HEIGHTS = ["h-28", "h-20", "h-16"];
const ORDER = ["order-2", "order-1", "order-3"];
const DELAYS = [400, 200, 0];
const POSES = ["front", "left", "right"] as const;

export const Podium = ({ entries, onSelect }: PodiumProps) => (
  <div className="mx-auto mb-4 max-w-2xl pt-2">
    <div className="grid grid-cols-3 items-end gap-2 text-center">
      {entries.slice(0, 3).map((e, i) => {
        const Step = onSelect ? "button" : "div";
        return (
          <Step
            key={e.id}
            {...(onSelect && {
              type: "button" as const,
              onClick: () => onSelect(e.id),
            })}
            className={`podium-step group block w-full min-w-0 ${ORDER[i]} ${onSelect ? "cursor-pointer" : ""}`}
            style={
              {
                "--metal": METALS[i],
                "--team": e.color,
                "--delay": `${DELAYS[i]}ms`,
              } as CSSProperties
            }
          >
            <span className="podium-name mb-2 flex min-h-12 flex-col items-center justify-end">
              {i === 0 && (
                <Trophy
                  aria-hidden
                  className="text-gold mb-1 size-5 drop-shadow-[0_0_6px_rgb(212_175_55_/_0.6)]"
                />
              )}
              <DriverHover id={onSelect ? e.id : ""} className="max-w-full">
                <span
                  className={`max-w-full text-xs font-semibold wrap-break-word sm:text-sm ${onSelect ? "group-hover:text-red-400" : ""}`}
                >
                  {e.name}
                </span>
              </DriverHover>
              {e.team && <TeamLogo team={e.team} className="mt-1 h-5 w-10" />}
            </span>
            <Figure
              id={e.id}
              pose={POSES[i]!}
              transform={BUST(0.6)}
              className="podium-name podium-figure mx-auto block h-32 sm:h-44"
            />
            <span
              className={`podium-block relative flex flex-col items-center justify-center rounded-t-lg ${HEIGHTS[i]}`}
            >
              <span className="podium-metal font-f1 text-3xl leading-none font-black">
                {i + 1}
              </span>
              <span className="tabular mt-1 text-xs font-semibold">
                {e.value}
              </span>
            </span>
          </Step>
        );
      })}
    </div>
    <div className="h-px bg-linear-to-r from-transparent via-zinc-600 to-transparent" />
  </div>
);

interface FaceProps extends Pick<PodiumEntry, "id" | "color"> {
  size?: string;
  faded?: boolean;
}

export const Face = ({ id, color, size = "size-10", faded }: FaceProps) => {
  const src = useArt(id)?.headshot ?? FALLBACK;
  return (
    <span
      className={`${size} shrink-0 overflow-hidden rounded-lg ${faded ? "grayscale-35" : ""}`}
      style={{
        background: `light-dark(var(--color-zinc-800), color-mix(in srgb, ${color} 20%, transparent))`,
      }}
    >
      <Headshot src={src} className="size-full object-cover object-top" />
    </span>
  );
};

interface PodiumListProps {
  entries: PodiumEntry[];
  faded?: boolean;
}

export const PodiumList = ({ entries, faded }: PodiumListProps) => (
  <ol className="mt-1">
    {entries.slice(0, 3).map((e, i) => (
      <li
        key={`${e.id}:${i}`}
        className="flex items-center gap-2.5 border-t border-zinc-800 py-1.5 first:border-0"
      >
        <span
          className="font-f1 w-3.5 shrink-0 font-black"
          style={{ color: ink(METALS[i]) }}
        >
          {i + 1}
        </span>
        <Face id={e.id} color={e.color} faded={faded} />
        <span className="min-w-0">
          <span className="block text-[13px] leading-tight font-bold">
            {e.name}
          </span>
          {e.team && (
            <TeamLogo
              team={e.team}
              className="mt-0.5 block h-3.5 w-6 object-left"
            />
          )}
        </span>
        <span className="tabular ml-auto shrink-0 text-xs text-zinc-400">
          {e.value}
        </span>
      </li>
    ))}
  </ol>
);

interface FinishProps {
  race: Race;
  hidden: Set<string>;
}

type Result = Race["results"][number];

export const start = ({ grid }: Result) =>
  grid ? `from P${grid}` : "from pit lane";

const Gain = ({ grid, position }: Result) => {
  const gain = grid - position;
  return grid && gain ? (
    <span className={gain > 0 ? "text-emerald-400" : "text-red-500"}>
      {gain > 0 ? "▲" : "▼"}
      {Math.abs(gain)}
    </span>
  ) : null;
};

export const Finish = ({ race, hidden }: FinishProps) => {
  const sprint = !race.results.length;
  const [winner, ...rest] = (sprint ? race.sprint : race.results).slice(0, 3);
  if (hidden.has(`${race.round}/${sprint ? "sprint" : "race"}`))
    return (
      <span className="flex h-6 items-center gap-1.5 text-xs text-zinc-400">
        <EyeOff aria-hidden="true" className="size-4 text-red-500" />
        Results hidden
      </span>
    );
  return (
    winner && (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <TeamLogo team={winner.team} className="h-6 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="font-f1 truncate text-base leading-tight font-bold">
                {winner.name}
              </p>
              <span className="shrink-0 text-xs">
                <Gain {...winner} />
              </span>
            </div>
            {sprint && <p className="text-xs text-zinc-400">Sprint winner</p>}
          </div>
        </div>
        <p className="flex gap-3 text-xs text-zinc-300">
          {rest.map((result, index) => (
            <span key={result.driver} className="flex gap-1">
              <span
                className="font-f1 font-black"
                style={{ color: ink(METALS[index + 1]) }}
              >
                {index + 2}
              </span>
              {result.code || result.name}
              <Gain {...result} />
            </span>
          ))}
        </p>
      </div>
    )
  );
};
