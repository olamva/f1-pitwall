import { ArrowLeft, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SESSION_MS, type RaceArchive, type Season } from "../shared/season.ts";
import { useJson, type Loaded } from "./api.ts";
import { useFavourite } from "./favourite.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { pathPart, pathSegment } from "./path.ts";
import { METALS } from "./Podium.tsx";
import { SESSIONS, SessionResults, type Kind } from "./SessionResults.tsx";
import { Spoiler } from "./Spoiler.tsx";
import { SprintLogo } from "./SprintLogo.tsx";
import { fresh, useSeen } from "./spoilers.ts";
import { Standings } from "./Standings.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";
import { TeamLogo } from "./TeamLogo.tsx";

const LABELS = {
  fp1: "FP1",
  fp2: "FP2",
  fp3: "FP3",
  sprintQualifying: "SQ",
  qualifying: "Quali",
};
const PARTS = ["Races", "Standings"] as const;
type Part = (typeof PARTS)[number];
type Race = RaceArchive["races"][number];

const currentYear = new Date().getUTCFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, index) =>
  String(currentYear - index),
);

const resultsPath = (year: string, part: Part, round: number) =>
  `/results/${year}${part === "Standings" ? "/standings" : round ? `/${round}` : ""}`;

interface RaceListProps {
  year: string;
  season: Season | null;
  races: Race[];
  onOpen: (round: number) => void;
}

const RaceList = ({ year, season, races, onOpen }: RaceListProps) => {
  const seen = useSeen();
  const guarded = seen && Number(year) === (season?.year ?? currentYear);
  if (guarded && !season) return <Loading label="Loading the season…" />;
  const hidden = new Set(
    guarded && season
      ? fresh(season.rounds, Date.now())
          .filter((s) => seen[s.id] !== "shown")
          .map((s) => `${s.round.round}/${s.kind}`)
      : [],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {races.map((race) => {
        const kind = race.results.length ? "race" : "sprint";
        const podium = race[kind === "race" ? "results" : "sprint"].slice(0, 3);
        return (
          <button
            key={race.round}
            type="button"
            onClick={() => onOpen(race.round)}
            className="bg-surface cursor-pointer rounded-xl p-4 text-left ring-1 ring-zinc-800 transition hover:-translate-y-0.5 hover:ring-zinc-600"
          >
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              Round {race.round} · {race.date}
              {race.sprint.length > 0 && (
                <SprintLogo className="ml-auto h-2.5 shrink-0 text-zinc-100" />
              )}
            </span>
            <span className="font-f1 mt-1 block font-bold">
              <Flag country={race.country} />
              {race.name}
            </span>
            {hidden.has(`${race.round}/${kind}`) ? (
              <span className="mt-3 flex h-6 items-center gap-1.5 text-xs text-zinc-400">
                <EyeOff aria-hidden="true" className="size-4 text-red-500" />
                Results hidden
              </span>
            ) : (
              <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {podium.map((result, index) => (
                  <span
                    key={result.driver}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <span
                      className="font-f1 font-black"
                      style={{ color: METALS[index] }}
                    >
                      {index + 1}
                    </span>
                    <TeamLogo team={result.team} className="h-4 w-6 shrink-0" />
                    <span className="truncate font-semibold">
                      {result.code || result.name}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface RaceDetailProps {
  year: string;
  season: Season | null;
  races: Race[];
  race: Race;
  onBack: () => void;
}

const RaceDetail = ({ year, season, races, race, onBack }: RaceDetailProps) => {
  const [session, setSession] = useState<Kind>("race");
  const favourite = useFavourite();
  const archived = Number(year) >= 2018;
  const times =
    season?.year === Number(year)
      ? season.rounds.find((entry) => entry.round === race.round)?.sessions
      : undefined;
  const sprint = race.sprint.length > 0 || !!times?.sprint;
  const available: Record<Kind, boolean> = {
    fp1: archived,
    fp2: archived && !(sprint && Number(year) >= 2023),
    fp3: archived && !sprint,
    sprintQualifying: sprint && Number(year) >= 2023,
    sprint: race.sprint.length > 0,
    qualifying: archived,
    race: race.results.length > 0,
  };
  const sessions = SESSIONS.filter(
    (kind) =>
      available[kind] &&
      !(Date.parse(times?.[kind] ?? "") + SESSION_MS > Date.now()),
  );
  const shown = sessions.includes(session) ? session : sessions.at(-1)!;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All races
      </button>
      <section className="bg-surface min-w-0 overflow-x-auto rounded-xl p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div>
            <p className="text-xs text-zinc-400">
              Round {race.round} · {race.date}
            </p>
            <h2 className="font-f1 text-xl font-bold">
              <Flag country={race.country} />
              {race.name}
            </h2>
          </div>
          {sessions.length > 1 && (
            <div className="shrink-0">
              <Tabs
                items={sessions}
                value={shown}
                onChange={setSession}
                labels={LABELS}
                small
              />
            </div>
          )}
        </div>
        <Spoiler
          season={season}
          year={Number(year)}
          kinds={[shown]}
          round={race.round}
        >
          <SessionResults
            year={year}
            race={race}
            races={races}
            kind={shown}
            favourite={favourite?.id}
          />
        </Spoiler>
      </section>
    </div>
  );
};

interface RacesProps {
  year: string;
  season: Season | null;
  archive: Loaded<RaceArchive>;
  races: Race[];
  race: Race | undefined;
  onRound: (round: number) => void;
}

const Races = ({ year, season, archive, races, race, onRound }: RacesProps) => {
  if (archive.data?.year !== Number(year))
    return <Loading label="Loading race results…" error={archive.error} />;
  if (!races.length)
    return (
      <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
        No race results are available for {year}.
      </p>
    );
  return race ? (
    <RaceDetail
      key={race.round}
      year={year}
      season={season}
      races={races}
      race={race}
      onBack={() => onRound(0)}
    />
  ) : (
    <RaceList year={year} season={season} races={races} onOpen={onRound} />
  );
};

interface ResultsProps {
  season: Season | null;
}

export const Results = ({ season }: ResultsProps) => {
  const initialYear = pathPart("results");
  const [year, setYear] = useState(
    years.includes(initialYear ?? "") ? initialYear! : String(currentYear),
  );
  const [part, setPart] = useState<Part>(
    pathSegment("results", 3) === "standings" ? "Standings" : "Races",
  );
  const [round, setRound] = useState(Number(pathSegment("results", 3)));
  const [name, setName] = useState<string>();
  const archive = useJson<RaceArchive>(`/api/results/${year}`);
  const races = archive.data?.year === Number(year) ? archive.data.races : [];
  const race = round
    ? (races.find((entry) => entry.name === name) ??
      races.find((entry) => entry.round === round))
    : undefined;
  const show = (
    nextYear: string,
    nextPart: Part,
    nextRound = 0,
    nextName?: string,
  ) => {
    setYear(nextYear);
    setPart(nextPart);
    setRound(nextRound);
    setName(nextName);
    history.replaceState(null, "", resultsPath(nextYear, nextPart, nextRound));
    scrollTo(0, 0);
  };
  useEffect(() => {
    if (race && race.round !== round) show(year, part, race.round, name);
  }, [race]);
  const blob = useRef<(offset: number, held: boolean) => void>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs
          items={PARTS}
          value={part}
          onChange={(nextPart) => show(year, nextPart)}
          small
          drive={blob}
        />
        <select
          aria-label="Season"
          value={year}
          onChange={(event) =>
            show(event.target.value, part, race?.round ?? 0, race?.name)
          }
          className="bg-surface rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-50"
        >
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <Swipe
        items={PARTS}
        value={part}
        onChange={(nextPart) => show(year, nextPart)}
        drive={blob}
        render={(p) =>
          p === "Standings" ? (
            <Spoiler
              key={year}
              season={season}
              year={Number(year)}
              kinds={["sprint", "race"]}
            >
              <Standings year={year} season={season} />
            </Spoiler>
          ) : (
            <Races
              key={year}
              year={year}
              season={season}
              archive={archive}
              races={races}
              race={race}
              onRound={(nextRound) => show(year, "Races", nextRound)}
            />
          )
        }
      />
    </div>
  );
};
