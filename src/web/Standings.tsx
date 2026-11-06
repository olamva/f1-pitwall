import { Trophy } from "lucide-react";
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
import { DriverHover } from "./DriverCard.tsx";
import { FALLBACK, Headshot } from "./Headshot.tsx";
import { Loading } from "./Loading.tsx";
import { openConstructor, openDriver, pathPart, pathSegment } from "./path.ts";
import { GOLD } from "./stats/Champion.tsx";
import { clinched } from "./stats/derive.ts";
import { TeamNumber } from "./stats/TeamNumber.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";
import { TeamHover, TeamSeason } from "./TeamCard.tsx";
import { logoSrc, TeamLogo } from "./TeamLogo.tsx";
import { YEARS, YearSelect } from "./YearSelect.tsx";

const CHAMPS = ["drivers", "constructors"] as const;

interface PortraitProps {
  driver?: DriverInfo;
  color: string;
  big: boolean;
}

const Portrait = ({ driver, color, big }: PortraitProps) => (
  <>
    <Headshot
      src={driver?.headshot ?? FALLBACK}
      loading="lazy"
      className={`absolute bottom-0 h-full object-contain object-bottom transition group-hover:scale-105 ${big ? "champion-figure right-4 max-h-64 origin-bottom-right max-sm:h-3/4 sm:right-24" : "right-8 max-h-36 origin-bottom"}`}
    />
    {driver && (
      <TeamNumber
        id={driver.id}
        number={driver.number}
        color={big ? GOLD : color}
        className={`absolute top-3 right-3 flex transition ${big ? "h-10 text-4xl sm:top-6 sm:right-6 sm:h-16 sm:text-6xl" : "h-7 text-3xl"}`}
      />
    )}
  </>
);

interface NumbersProps {
  crew: DriverInfo[];
  color: string;
  big: boolean;
}

const Numbers = ({ crew, color, big }: NumbersProps) =>
  crew.length > 0 && (
    <span className={`relative flex ${big ? "mt-2 gap-4" : "mt-1 gap-2"}`}>
      {crew.map((d) => (
        <TeamNumber
          key={d.id}
          id={d.id}
          number={d.number}
          color={big ? GOLD : color}
          className={`flex ${big ? "h-8 text-3xl" : "h-5 text-xl"}`}
        />
      ))}
    </span>
  );

interface BadgeProps {
  team: string;
  teams: Map<string, string>;
  big: boolean;
}

const Badge = ({ team, teams, big }: BadgeProps) =>
  logoSrc(team) ? (
    <TeamHover id={team} className={`relative w-fit ${big ? "mt-2" : "mt-1"}`}>
      <TeamLogo
        team={team}
        className={`block object-left ${big ? "h-8 w-16" : "h-5 w-10"}`}
      />
    </TeamHover>
  ) : (
    <span className="relative block text-sm text-zinc-400">
      {teams.get(team) ?? team}
    </span>
  );

interface CardsProps {
  rows: StandingRow[];
  season: Season;
  teams: Map<string, string>;
  champion?: string;
  onSelect?: (id: string) => void;
  drivers?: StandingRow[];
}

const Cards = ({
  rows,
  season,
  teams,
  champion,
  onSelect,
  drivers = [],
}: CardsProps) => {
  const info = new Map(season.drivers.map((d) => [d.id, d]));
  const Card = onSelect ? "button" : "div";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {rows.map((row, place) => {
        const big = place === 0 && !!champion;
        const color = teamColor(row.team);
        const driver = info.get(row.id);
        const team = row.id === row.team;
        const crew = drivers
          .filter((d) => d.team === row.team && !d.reserve)
          .flatMap((d) => info.get(d.id) ?? []);
        return (
          <Card
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            className={`group relative overflow-hidden rounded-xl text-left transition hover:-translate-y-0.5 ${onSelect ? "cursor-pointer" : ""} ${big ? "champion-card col-span-full p-6 sm:p-8" : "bg-surface p-4 ring-1 ring-zinc-800 hover:ring-zinc-600"}`}
            style={{
              backgroundImage: big
                ? `linear-gradient(135deg, ${color}, ${color}66 45%, #09090b 90%)`
                : `linear-gradient(135deg, ${color}40, transparent 65%)`,
            }}
          >
            {team ? (
              <TeamLogo
                team={row.team}
                className={`absolute top-1/2 -translate-y-1/2 transition group-hover:scale-105 ${big ? "champion-figure right-6 h-24 w-36 sm:right-12 sm:h-36 sm:w-56" : "right-5 h-14 w-24"}`}
              />
            ) : (
              <Portrait driver={driver} color={color} big={big} />
            )}
            {big && (
              <span className="font-f1 relative flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#fef08a] uppercase sm:text-sm">
                <Trophy aria-hidden className="size-4" />
                {champion}
              </span>
            )}
            {driver && !big && (
              <span className="font-f1 relative block text-xs font-bold text-zinc-400">
                {driver.code}
              </span>
            )}
            <DriverHover id={team ? "" : row.id} className="relative w-fit">
              <span
                className={`font-f1 relative block leading-tight font-bold ${big ? "champion-name mt-2 text-3xl font-black sm:text-5xl" : `text-lg ${driver ? "mt-1" : ""}`}`}
              >
                {row.name}
              </span>
            </DriverHover>
            {team ? (
              <Numbers crew={crew} color={color} big={big} />
            ) : (
              <Badge team={row.team} teams={teams} big={big} />
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
  champ?: Championship;
}

export const Standings = ({ season, champ: initial }: StandingsProps) => {
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
  const [champ, setChamp] = useState<Championship>(initial ?? "drivers");
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const { data, error } = useJson<SeasonStandings>(`/api/standings/${year}`);
  const ready = data?.year === Number(year);
  const crowned = (champ: Championship) =>
    season.year === Number(year) && clinched(season, champ);
  const decided = (champ: Championship) =>
    Number(year) < season.year || crowned(champ);
  useConfetti(
    ready && data.drivers.length > 0 && CHAMPS.some(crowned),
    Number(year),
    `standings-${year}`,
  );
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
            <TeamSeason value={Number(year) === season.year ? season : null}>
              <Cards
                rows={data.drivers}
                season={season}
                teams={names}
                champion={decided(c) ? `${year} World Champion` : undefined}
                onSelect={openDriver}
              />
            </TeamSeason>
          ) : (
            <Cards
              rows={data.constructors}
              drivers={data.drivers}
              season={season}
              teams={names}
              champion={
                decided(c) ? `${year} Constructors' Champion` : undefined
              }
              onSelect={openConstructor}
            />
          )
        }
      />
    </div>
  );
};
