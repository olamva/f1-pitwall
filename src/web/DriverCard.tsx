import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { DriverProfile, Season } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Headshot } from "./Headshot.tsx";
import { HoverCard } from "./HoverCard.tsx";
import { METALS } from "./Podium.tsx";
import { useHidden } from "./spoilers.ts";
import { driverTables, latest } from "./stats/derive.ts";
import { SHORT } from "./stats/DriverProfile.tsx";
import { TeamNumber } from "./stats/TeamNumber.tsx";
import { TeamLogo } from "./TeamLogo.tsx";

export const SeasonData = createContext<Season | null>(null);

const SUFFIX: Record<string, string> = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th",
};
const ordinal = new Intl.PluralRules("en", { type: "ordinal" });
const nth = (n: number) => `${n}${SUFFIX[ordinal.select(n)]}`;

interface CardProps {
  id: string;
  name: string;
  number: string | null;
  team: string;
  src: string | null | undefined;
  line: (string | false | undefined)[];
  tiles: [string, number | null][];
  form?: { label: string; place: number | null }[];
}

const Card = ({
  id,
  name,
  number,
  team,
  src,
  line,
  tiles,
  form,
}: CardProps) => {
  const color = teamColor(team);
  return (
    <div
      className="light:bg-none relative -m-3 overflow-hidden rounded-xl bg-linear-135 from-(--team)/25 to-transparent to-60% p-3"
      style={{ "--team": color } as CSSProperties}
    >
      <div className="relative -mt-3 -mr-3 pt-3 pr-3">
        {src && (
          <Headshot
            src={src}
            className="absolute top-0 right-0 h-full mask-l-from-60%"
          />
        )}
        <div className="relative">
          {number && (
            <TeamNumber
              id={id}
              number={number}
              color={color}
              className="flex h-8 mask-left! text-3xl"
            />
          )}
          <p className="font-f1 mt-1 text-lg leading-tight font-bold">{name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400">
            <TeamLogo team={team} className="h-3.5 w-5 shrink-0" />
            {line.filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-zinc-800 p-1.5 text-center">
            <b className="font-f1 tabular block text-base">{value ?? "—"}</b>
            <small className="text-[10px] text-zinc-400">{label}</small>
          </div>
        ))}
      </div>
      {form && form.length > 0 && (
        <>
          <p className="mt-2.5 text-[11px] text-zinc-400">
            Last {form.length} {form.length === 1 ? "race" : "races"}
          </p>
          <ol className="mt-2 flex gap-1">
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
    </div>
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
  const table = latest(
    driverTables({
      ...season,
      races,
      sprints: season.sprints.filter(keep("sprint")),
    }),
  );
  const place = table.findIndex((s) => s.id === id);
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
      src={driver.headshot}
      line={[
        season.teams.find((t) => t.id === driver.team)?.name,
        place >= 0 && nth(place + 1),
        place >= 0 && `${table[place]!.points} pts`,
      ]}
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
        {error ? "Driver data is not available." : "Loading driver…"}
      </p>
    );
  const last = data.seasons[0];
  return (
    <Card
      id={id}
      name={data.name}
      number={data.number}
      team={last?.team ?? ""}
      src={data.portrait}
      line={[
        last?.teamName,
        data.firstSeason === data.lastSeason
          ? `${data.firstSeason}`
          : `${data.firstSeason}–${data.lastSeason}`,
      ]}
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
