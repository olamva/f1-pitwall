import { EyeOff } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import type { Season } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { BUST, Figure } from "./Headshot.tsx";
import { HoverCard } from "./HoverCard.tsx";
import { ink } from "./ink.ts";
import { useHidden } from "./spoilers.ts";
import { qualifyingHeadToHead } from "./stats/derive.ts";
import { logoSrc, TeamLogo } from "./TeamLogo.tsx";

export const TeamSeason = createContext<Season | null>(null);

const solid = (color: string, scale = 1) =>
  `oklch(from ${color} calc(min(l, 0.66) * ${scale}) c h)`;

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface TeamCardProps {
  season: Season;
  team: string;
}

const TeamCard = ({ season, team }: TeamCardProps) => {
  const hidden = useHidden(String(season.year), season).size > 0;
  const color = teamColor(team);
  const table = season.constructorStandings;
  const place = table.findIndex((t) => t.id === team);
  const start = Math.max(place - 2, 0);
  const mine = table[place]!.points;
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
  return (
    <div className="-m-3">
      <div
        className="relative h-35 overflow-hidden px-3 pt-3 text-white"
        style={{
          background: `linear-gradient(135deg, ${solid(color)}, ${solid(color, 0.65)})`,
        }}
      >
        <img
          src={logoSrc(team)}
          alt=""
          className="absolute top-1.5 left-1/2 h-35 w-60 -translate-x-1/2 object-contain opacity-15"
        />
        <div className="relative flex items-start justify-between">
          <span className="font-f1 text-xl leading-tight font-bold italic">
            {name(team)}
          </span>
          {!hidden && (
            <span className="font-f1 text-3xl leading-none font-black italic">
              P{place + 1}
            </span>
          )}
        </div>
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
      </div>
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
            <ol className="tabular mt-3 text-xs first:mt-0">
              {table.slice(start, place + 3).map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${t.id === team ? "bg-zinc-800 font-bold" : ""} ${Math.abs(start + i - place) > 1 ? "opacity-35" : ""}`}
                >
                  <span className="font-f1 w-4 text-right font-bold">
                    {start + i + 1}
                  </span>
                  <TeamLogo team={t.id} className="h-3.5 w-5 shrink-0" />
                  <span className="truncate">{name(t.id)}</span>
                  <span
                    className="ml-auto"
                    style={{ color: t.id === team ? ink(color) : undefined }}
                  >
                    {t.points}
                  </span>
                  <span className="w-9 text-right text-zinc-400">
                    {t.id !== team &&
                      `${t.points >= mine ? "+" : "−"}${Math.abs(t.points - mine)}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
};

interface TeamHoverProps {
  team: string;
  className?: string;
  children: ReactNode;
}

export const TeamHover = ({ team, className, children }: TeamHoverProps) => {
  const season = useContext(TeamSeason);
  return season?.constructorStandings.some((t) => t.id === team) ? (
    <HoverCard
      className={className}
      card={<TeamCard season={season} team={team} />}
    >
      {children}
    </HoverCard>
  ) : (
    <div className={className}>{children}</div>
  );
};
