import { EyeOff } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import type { Season } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { Shell, Snippet, solid } from "./CardParts.tsx";
import { BUST, Figure } from "./Headshot.tsx";
import { HoverCard } from "./HoverCard.tsx";
import { ink } from "./ink.ts";
import { useHidden } from "./spoilers.ts";
import { clinched, qualifyingHeadToHead } from "./stats/derive.ts";

export const TeamSeason = createContext<Season | null>(null);

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface TeamCardProps {
  season: Season;
  team: string;
}

const TeamCard = ({ season, team }: TeamCardProps) => {
  const hidden = useHidden(String(season.year), season).size > 0;
  const color = teamColor(team);
  const place = season.constructorStandings.findIndex((t) => t.id === team);
  const name = (id: string) =>
    season.teams.find((t) => t.id === id)?.name ?? id;
  const points = (id: string) =>
    season.driverStandings.find((d) => d.id === id)?.points ?? 0;
  const finishes = (id: string, top: number) =>
    season.races.filter((r) =>
      r.results.some((x) => x.driver === id && x.position && x.position <= top),
    ).length;
  const pair = season.drivers
    .filter((d) => d.team === team && !d.reserve)
    .sort((a, b) => points(b.id) - points(a.id))
    .slice(0, 2);
  const [a, b] = pair;
  const quali =
    a && b ? qualifyingHeadToHead(season.qualifying, a.id, b.id) : [0, 0];
  const champion = !hidden && clinched(season, "constructors");
  return (
    <Shell
      color={color}
      team={team}
      title={name(team)}
      place={hidden ? undefined : place}
      crown={champion && !place ? `${season.year} Champions` : undefined}
      art={
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-2">
          {pair.map((d, i) => (
            <Figure
              key={d.id}
              id={d.id}
              pose={i ? "right" : "left"}
              transform={BUST(0.6)}
              className="mx-auto h-24"
            />
          ))}
        </div>
      }
    >
      {hidden ? (
        <p className="flex items-center justify-center gap-1.5 py-6 text-xs text-zinc-400">
          <EyeOff aria-hidden="true" className="size-4 text-red-500" />
          Results hidden
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 px-3 pt-2.5 text-center">
            {pair.map((d) => (
              <div key={d.id}>
                <b className="text-sm">{d.name.split(" ").at(-1)}</b>
                <div
                  className="font-f1 text-xl leading-tight font-black italic"
                  style={{ color: ink(color) }}
                >
                  {points(d.id)}{" "}
                  <span className="font-sans text-[11px] font-semibold text-zinc-400 not-italic">
                    pts
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {count(finishes(d.id, 1), "win")} ·{" "}
                  {count(finishes(d.id, 3), "podium")}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3">
            {a && b && quali[0] + quali[1] > 0 && (
              <>
                <div className="mb-1 text-center text-[11px] text-zinc-400">
                  Qualifying head-to-head
                </div>
                <div className="flex h-4.5 overflow-hidden rounded-[5px] text-[11px] font-extrabold">
                  <span
                    className="flex items-center px-1.5 text-white"
                    style={{ flex: quali[0], background: solid(color) }}
                  >
                    {a.code} {quali[0]}
                  </span>
                  <span
                    className="flex items-center justify-end bg-zinc-600 px-1.5"
                    style={{ flex: quali[1] }}
                  >
                    {quali[1]} {b.code}
                  </span>
                </div>
              </>
            )}
            <Snippet
              rows={season.constructorStandings.map((t) => ({
                ...t,
                team: t.id,
                name: name(t.id),
              }))}
              self={team}
              champion={champion}
            />
          </div>
        </>
      )}
    </Shell>
  );
};

interface TeamHoverProps {
  id: string;
  className?: string;
  children: ReactNode;
}

export const TeamHover = ({ id, className, children }: TeamHoverProps) => {
  const season = useContext(TeamSeason);
  return season?.constructorStandings.some((t) => t.id === id) ? (
    <HoverCard
      className={className}
      card={<TeamCard season={season} team={id} />}
    >
      {children}
    </HoverCard>
  ) : (
    <div className={className}>{children}</div>
  );
};
