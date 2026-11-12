import { Trophy } from "lucide-react";
import { useContext, useRef, useState } from "react";
import type { Championship } from "../shared/clinch.ts";
import type {
  DriverInfo,
  RaceArchive,
  Season,
  SeasonStandings,
  StandingRow,
} from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { useConfetti } from "./confetti.ts";
import { DriverHover, SeasonData } from "./DriverCard.tsx";
import { Faces, FALLBACK, Headshot } from "./Headshot.tsx";
import { Loading } from "./Loading.tsx";
import { openConstructor, openDriver, pathPart, pathSegment } from "./path.ts";
import { GOLD } from "./stats/Champion.tsx";
import { archiveSeason, clinched } from "./stats/derive.ts";
import { TeamNumber } from "./stats/TeamNumber.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";
import { TeamHover, TeamSeason } from "./TeamCard.tsx";
import { logoSrc, TeamLogo } from "./TeamLogo.tsx";
import { YEARS, YearSelect } from "./YearSelect.tsx";

const CHAMPS = ["drivers", "constructors"] as const;

const SPANS: [number, Record<number, string>][] = [
  [2, { 6: "sm:col-span-6", 12: "sm:col-span-12" }],
  [3, { 4: "lg:col-span-4", 6: "lg:col-span-6", 12: "lg:col-span-12" }],
  [
    4,
    {
      3: "2xl:col-span-3",
      4: "2xl:col-span-4",
      6: "2xl:col-span-6",
      12: "2xl:col-span-12",
    },
  ],
];

const span = (index: number, count: number) =>
  SPANS.map(([cols, classes]) => {
    const rest = count % cols;
    return classes[12 / (index < rest ? rest : cols)];
  }).join(" ");

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
    <div className="grid gap-3 sm:grid-cols-12">
      {rows.map((row, place) => {
        const big = place === 0 && !!champion;
        const offset = champion ? 1 : 0;
        const color = teamColor(row.team);
        const driver = info.get(row.id);
        const team = row.id === row.team;
        const crew = drivers
          .filter((d) => d.team === row.team && !d.reserve)
          .flatMap((d) => info.get(d.id) ?? []);
        const Hover = team ? TeamHover : DriverHover;
        return (
          <Hover
            key={row.id}
            id={row.id}
            className={
              big ? "col-span-full" : span(place - offset, rows.length - offset)
            }
          >
            <Card
              onClick={() => onSelect?.(row.id)}
              className={`group relative block size-full overflow-hidden rounded-xl text-left transition hover:-translate-y-0.5 ${onSelect ? "cursor-pointer" : ""} ${big ? "champion-card p-6 sm:p-8" : "bg-surface p-4 ring-1 ring-zinc-800 hover:ring-zinc-600"}`}
              style={{
                backgroundImage: big
                  ? `linear-gradient(135deg, ${color}, ${color}66 45%, #09090b 90%)`
                  : `linear-gradient(135deg, light-dark(var(--color-zinc-950), ${color}40), transparent 65%)`,
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
                <span className="font-f1 relative flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#ebd08a] uppercase sm:text-sm">
                  <Trophy aria-hidden className="size-4" />
                  {champion}
                </span>
              )}
              {driver && !big && (
                <span className="font-f1 relative block text-xs font-bold text-zinc-400">
                  {driver.code}
                </span>
              )}
              <span
                className={`font-f1 relative block leading-tight font-bold ${big ? "champion-name mt-2 text-3xl font-black sm:text-5xl" : `text-lg ${driver ? "mt-1" : ""}`}`}
              >
                {row.name}
              </span>
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
          </Hover>
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
  const now = Number(year) === season.year;
  const archive = useJson<RaceArchive>(now ? null : `/api/results/${year}`);
  const faces = useContext(Faces);
  const ready = data?.year === Number(year);
  const shown = now
    ? season
    : ready && archive.data?.year === Number(year)
      ? archiveSeason(archive.data, data, faces)
      : null;
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
  if (!ready || !shown)
    return (
      <div className="space-y-4">
        {picker}
        <Loading error={error ?? archive.error} />
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
      <TeamSeason value={now ? season : null}>
        <SeasonData value={shown}>
          <Swipe
            items={teams ? CHAMPS : CHAMPS.slice(0, 1)}
            value={teams ? champ : "drivers"}
            onChange={setChamp}
            drive={blob}
            render={(c) =>
              c === "drivers" ? (
                <Cards
                  rows={data.drivers}
                  season={shown}
                  teams={names}
                  champion={decided(c) ? `${year} World Champion` : undefined}
                  onSelect={openDriver}
                />
              ) : (
                <Cards
                  rows={data.constructors}
                  drivers={data.drivers}
                  season={shown}
                  teams={names}
                  champion={
                    decided(c) ? `${year} Constructors' Champions` : undefined
                  }
                  onSelect={openConstructor}
                />
              )
            }
          />
        </SeasonData>
      </TeamSeason>
    </div>
  );
};
