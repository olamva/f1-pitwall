import { createContext, useContext, type ReactNode } from "react";
import type { DriverProfile, Season } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Shell, Snippet } from "./CardParts.tsx";
import { BUST, Figure, Headshot, PORTRAIT } from "./Headshot.tsx";
import { HoverCard } from "./HoverCard.tsx";
import { ink } from "./ink.ts";
import { Slow } from "./Loading.tsx";
import { METALS } from "./Podium.tsx";
import { useHidden } from "./spoilers.ts";
import { clinched, driverTables, latest } from "./stats/derive.ts";
import { SHORT } from "./stats/DriverProfile.tsx";
import { TeamNumber } from "./stats/TeamNumber.tsx";

export const SeasonData = createContext<Season | null>(null);

interface CardProps {
  id: string;
  name: string;
  number: string | null;
  team: string;
  line?: string;
  figure: ReactNode;
  place?: number;
  crown?: string;
  tiles: [string, number | null][];
  form?: { label: string; place: number | null }[];
  table?: ReactNode;
}

const Card = ({
  id,
  name,
  number,
  team,
  line,
  figure,
  place,
  crown,
  tiles,
  form,
  table,
}: CardProps) => {
  const color = teamColor(team);
  return (
    <Shell
      color={color}
      team={team}
      title={name}
      subtitle={
        line && <p className="mt-0.5 text-[11px] text-white/75">{line}</p>
      }
      place={place}
      crown={crown}
      art={
        <>
          {number && (
            <TeamNumber
              id={id}
              number={number}
              color="white"
              className="absolute bottom-3 left-3 flex h-8 text-3xl"
            />
          )}
          {figure}
        </>
      }
    >
      <div className="grid grid-cols-3 px-3 py-2.5 text-center">
        {tiles.map(([label, value]) => (
          <div key={label}>
            <div
              className="font-f1 text-xl leading-tight font-black italic"
              style={{ color: ink(color) }}
            >
              {value ?? "—"}
            </div>
            <div className="text-[11px] text-zinc-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3 empty:hidden">
        {form && form.length > 0 && (
          <>
            <div className="mb-1 text-center text-[11px] text-zinc-400">
              Last {form.length} {form.length === 1 ? "race" : "races"}
            </div>
            <ol className="flex gap-1">
              {form.map(({ label, place }, i) => {
                const metal = place && METALS[place - 1];
                return (
                  <li
                    key={i}
                    className={`tabular flex-1 rounded py-0.5 text-center text-[11px] font-extrabold ${metal ? "text-black" : "bg-zinc-800"}`}
                    style={metal ? { background: metal } : undefined}
                  >
                    {label}
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {table}
      </div>
    </Shell>
  );
};

const SeasonCard = ({ id, season }: { id: string; season: Season }) => {
  const hidden = useHidden(String(season.year), season);
  const keep =
    (kind: string) =>
    ({ round }: { round: number }) =>
      !hidden.has(`${round}/${kind}`);
  const driver = season.drivers.find((d) => d.id === id)!;
  const races = season.races.filter(keep("race"));
  const shown = {
    ...season,
    races,
    sprints: season.sprints.filter(keep("sprint")),
  };
  const table = latest(driverTables(shown));
  const place = table.findIndex((s) => s.id === id);
  const champion = clinched(shown, "drivers");
  const info = new Map(season.drivers.map((d) => [d.id, d]));
  const results = races.flatMap((r) =>
    r.results.filter((x) => x.driver === id),
  );
  const positions = results.map((r) => r.position ?? 0);
  return (
    <Card
      id={id}
      name={driver.name}
      number={driver.number}
      team={driver.team}
      figure={
        <Figure
          id={id}
          pose="right"
          transform={BUST(0.6)}
          className="absolute right-4 bottom-0 h-24"
        />
      }
      place={place >= 0 ? place : undefined}
      crown={champion && !place ? `${season.year} Champion` : undefined}
      tiles={[
        ["Wins", positions.filter((p) => p === 1).length],
        ["Podiums", positions.filter((p) => p && p <= 3).length],
        [
          "Poles",
          season.qualifying
            .filter(keep("qualifying"))
            .filter((q) =>
              q.results.some((r) => r.driver === id && r.position === 1),
            ).length,
        ],
      ]}
      form={results.slice(-5).map((r) => ({
        label: r.position ? `P${r.position}` : (SHORT[r.status] ?? "DNF"),
        place: r.position,
      }))}
      table={
        place >= 0 && (
          <Snippet
            rows={table.map((s) => ({
              ...s,
              team: info.get(s.id)?.team ?? "",
              name: info.get(s.id)?.name ?? s.id,
            }))}
            self={id}
            champion={champion}
          />
        )
      }
    />
  );
};

const CareerCard = ({ id }: { id: string }) => {
  const { data, error } = useJson<DriverProfile>(
    `/api/drivers/${encodeURIComponent(id)}`,
  );
  if (!data)
    return (
      <p className="py-6 text-center text-xs text-zinc-400">
        {error ? "Driver data is not available." : <Slow />}
      </p>
    );
  const last = data.seasons[0];
  return (
    <Card
      id={id}
      name={data.name}
      number={data.number}
      team={last?.team ?? ""}
      line={[
        last?.teamName,
        data.firstSeason === data.lastSeason
          ? data.firstSeason
          : `${data.firstSeason}–${data.lastSeason}`,
      ]
        .filter(Boolean)
        .join(" · ")}
      figure={
        <Headshot
          src={data.portrait ?? PORTRAIT}
          className="absolute top-0 right-0 h-full mask-l-from-60%"
        />
      }
      tiles={[
        ["Wins", data.wins],
        ["Podiums", data.podiums],
        ["Poles", data.poles],
      ]}
    />
  );
};

const DriverCard = ({ id }: { id: string }) => {
  const season = useContext(SeasonData);
  return season?.drivers.some((d) => d.id === id) ? (
    <SeasonCard id={id} season={season} />
  ) : (
    <CareerCard id={id} />
  );
};

interface DriverHoverProps {
  id: string;
  className?: string;
  children: ReactNode;
}

export const DriverHover = ({ id, className, children }: DriverHoverProps) => (
  <HoverCard card={id && <DriverCard id={id} />} className={className}>
    {children}
  </HoverCard>
);
