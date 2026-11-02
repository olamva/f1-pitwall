import { Star } from "lucide-react";
import { useRef, useState } from "react";
import type { Championship } from "../shared/clinch.ts";
import type {
  DriverInfo,
  Season,
  SeasonStandings,
  StandingRow,
} from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { useConfetti } from "./confetti.ts";
import { useFavourite } from "./favourite.ts";
import { Headshot } from "./Headshot.tsx";
import { Loading } from "./Loading.tsx";
import { openDriver, pathPart, pathSegment } from "./path.ts";
import { clinched } from "./stats/derive.ts";
import { TeamNumber } from "./stats/TeamNumber.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";
import { TeamLogo } from "./TeamLogo.tsx";
import { YEARS, YearSelect } from "./YearSelect.tsx";

const CHAMPS = ["drivers", "constructors"] as const;

interface PortraitProps {
  driver: DriverInfo;
  color: string;
  big: boolean;
}

const Portrait = ({ driver, color, big }: PortraitProps) => (
  <>
    {driver.headshot && (
      <Headshot
        src={driver.headshot}
        loading="lazy"
        className={`absolute bottom-0 h-full object-contain object-bottom transition group-hover:scale-105 ${big ? "right-4 max-h-64 origin-bottom-right max-sm:h-3/4 sm:right-24" : "right-8 max-h-36 origin-bottom"}`}
      />
    )}
    <TeamNumber
      id={driver.id}
      number={driver.number}
      color={color}
      className={`absolute top-3 right-3 flex transition ${big ? "h-10 text-4xl sm:top-6 sm:right-6 sm:h-16 sm:text-6xl" : "h-7 text-3xl"}`}
    />
  </>
);

interface CardsProps {
  rows: StandingRow[];
  season: Season;
  teams: Map<string, string>;
  favourite?: string;
  onSelect?: (id: string) => void;
}

const Cards = ({ rows, season, teams, favourite, onSelect }: CardsProps) => {
  const info = new Map(season.drivers.map((d) => [d.id, d]));
  const Card = onSelect ? "button" : "div";
  const order = rows
    .map((row, place) => ({ row, place }))
    .sort(
      (a, b) => Number(b.row.id === favourite) - Number(a.row.id === favourite),
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {order.map(({ row, place }) => {
        const big = row.id === favourite;
        const color = teamColor(row.team);
        const driver = info.get(row.id);
        const team = row.id === row.team;
        return (
          <Card
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            className={`bg-surface group relative overflow-hidden rounded-xl text-left transition ${onSelect ? "cursor-pointer hover:-translate-y-0.5" : ""} ${big ? "col-span-full p-6 sm:p-8" : `p-4 ring-1 ring-zinc-800 ${onSelect ? "hover:ring-zinc-600" : ""}`}`}
            style={{
              backgroundImage: big
                ? `linear-gradient(135deg, ${color}99, ${color}26 55%, transparent 85%)`
                : `linear-gradient(135deg, ${color}40, transparent 65%)`,
              ...(big && {
                boxShadow: `0 0 0 2px ${color}, 0 12px 48px -12px ${color}`,
              }),
            }}
          >
            {team ? (
              <TeamLogo
                team={row.team}
                className={`absolute top-1/2 -translate-y-1/2 transition group-hover:scale-105 ${big ? "right-6 h-24 w-36 sm:right-12 sm:h-36 sm:w-56" : "right-5 h-14 w-24"}`}
              />
            ) : (
              driver && <Portrait driver={driver} color={color} big={big} />
            )}
            {(driver || big) && (
              <span className="relative flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
                {driver?.code}
                {big && (
                  <span className="light:bg-white light:shadow-sm inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-yellow-300 uppercase">
                    <Star aria-hidden="true" className="size-3 fill-current" />
                    Favourite
                  </span>
                )}
              </span>
            )}
            <span
              className={`font-f1 relative mt-1 block leading-tight font-bold ${big ? "text-3xl sm:text-5xl" : "text-lg"}`}
            >
              {row.name}
            </span>
            {!team && (
              <span className="relative block text-sm text-zinc-400">
                {teams.get(row.team) ?? row.team}
              </span>
            )}
            <span
              className={`tabular relative flex text-xs text-zinc-400 ${big ? "mt-8 gap-5 sm:gap-8" : "mt-4 gap-5"}`}
            >
              {(
                [
                  ["Pos", `P${place + 1}`],
                  ["Pts", row.points],
                  ["Wins", row.wins],
                ] as const
              ).map(([label, value]) => (
                <span key={label}>
                  {label}
                  <span
                    className={`font-f1 block font-bold text-zinc-50 ${big ? "text-2xl sm:text-3xl" : "text-base"}`}
                  >
                    {value}
                  </span>
                </span>
              ))}
            </span>
          </Card>
        );
      })}
    </div>
  );
};

interface StandingsProps {
  season: Season;
}

export const Standings = ({ season }: StandingsProps) => {
  const [year, setYear] = useState(() => {
    const path = pathSegment("stats", 3);
    return pathPart("stats") === "standings" && YEARS.includes(path ?? "")
      ? path!
      : String(season.year);
  });
  const pick = (next: string) => {
    setYear(next);
    history.replaceState(
      null,
      "",
      `/stats/standings${next === String(season.year) ? "" : `/${next}`}`,
    );
  };
  const [champ, setChamp] = useState<Championship>("drivers");
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const favourite = useFavourite()?.id;
  const { data, error } = useJson<SeasonStandings>(`/api/standings/${year}`);
  const ready = data?.year === Number(year);
  const crowned = (champ: Championship) =>
    Number(year) < new Date().getUTCFullYear() ||
    (season.year === Number(year) && clinched(season, champ));
  useConfetti(ready && data.drivers.length > 0 && CHAMPS.some(crowned), year);
  const teams = ready && data.constructors.length > 0;
  const picker = (
    <div className="flex items-center gap-3">
      {teams && (
        <div className="grow">
          <Tabs
            items={CHAMPS}
            value={champ}
            onChange={setChamp}
            small
            stretch
            drive={blob}
          />
        </div>
      )}
      <YearSelect value={year} onChange={pick} />
    </div>
  );
  if (data?.year !== Number(year))
    return (
      <div className="space-y-4">
        {picker}
        <Loading label="Loading standings…" error={error} />
      </div>
    );
  if (!data.drivers.length)
    return (
      <div className="space-y-4">
        {picker}
        <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
          No standings are available for {year}.
        </p>
      </div>
    );
  const names = new Map(data.constructors.map((t) => [t.id, t.name]));
  return (
    <div className="space-y-4">
      {picker}
      <Swipe
        items={teams ? CHAMPS : CHAMPS.slice(0, 1)}
        value={teams ? champ : "drivers"}
        onChange={setChamp}
        drive={blob}
        render={(c) =>
          c === "drivers" ? (
            <Cards
              rows={data.drivers}
              season={season}
              teams={names}
              favourite={favourite}
              onSelect={openDriver}
            />
          ) : (
            <Cards
              rows={data.constructors}
              season={season}
              teams={names}
              favourite={data.drivers.find((row) => row.id === favourite)?.team}
            />
          )
        }
      />
    </div>
  );
};
