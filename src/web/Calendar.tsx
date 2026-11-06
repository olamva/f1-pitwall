import { ArrowLeft, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SESSION_MS, type RaceArchive, type Season } from "../shared/season.ts";
import type { SessionRef, Track } from "../shared/timing.ts";
import { useJson, type Loaded } from "./api.ts";
import { Circuit, useTracks } from "./Circuit.tsx";
import { useFavourite } from "./favourite.ts";
import { Flag } from "./Flag.tsx";
import { CalendarList } from "./live/CalendarList.tsx";
import { LABEL as NAMES } from "./live/Countdown.tsx";
import { Replay } from "./live/CurrentSession.tsx";
import { CardHead, OpenHint } from "./live/Schedule.tsx";
import { Loading } from "./Loading.tsx";
import { navigate, pathSegment, standalone } from "./path.ts";
import { Finish, type Race } from "./Podium.tsx";
import { SESSIONS, SessionResults, type Kind } from "./SessionResults.tsx";
import { Spoiler } from "./Spoiler.tsx";
import { useBack } from "./Swipe.tsx";
import { fresh, useSeen } from "./spoilers.ts";
import { Tabs } from "./Tabs.tsx";
import { TeamSeason } from "./TeamCard.tsx";
import { currentYear, YEARS, YearSelect } from "./YearSelect.tsx";

const LABELS = {
  fp1: "FP1",
  fp2: "FP2",
  fp3: "FP3",
  sprintQualifying: "SQ",
  qualifying: "Quali",
};

const calendarPath = (year: string, round: number, current: boolean) =>
  `/calendar${current && !round ? "" : `/${year}`}${round ? `/${round}` : ""}`;

const useHidden = (year: string, season: Season | null) => {
  const seen = useSeen();
  return new Set(
    seen && season && Number(year) === season.year
      ? fresh(season.rounds, Date.now())
          .filter((s) => seen[s.id] !== "shown")
          .map((s) => `${s.round.round}/${s.kind}`)
      : [],
  );
};

interface RaceListProps {
  races: Race[];
  tracks: Record<number, Track>;
  hidden: Set<string>;
  onOpen: (round: number) => void;
}

const RaceList = ({ races, tracks, hidden, onOpen }: RaceListProps) => (
  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
    {races.map((race) => (
      <article
        key={race.round}
        className="bg-surface relative flex flex-col gap-3 rounded-xl p-4 ring-1 ring-zinc-800 transition hover:-translate-y-0.5 hover:ring-zinc-600"
      >
        <button
          type="button"
          onClick={() => onOpen(race.round)}
          aria-label={`Results: ${race.name}`}
          className="peer absolute inset-0 cursor-pointer rounded-xl"
        />
        <Circuit track={tracks[race.round]} round={race.round} />
        <CardHead
          label={new Date(race.date).toLocaleDateString([], {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          })}
          name={race.name}
          country={race.country}
          sprint={race.sprint.length > 0}
        />
        <div className="mt-auto">
          <Finish race={race} hidden={hidden} />
        </div>
        <OpenHint />
      </article>
    ))}
  </div>
);

interface RaceDetailProps {
  year: string;
  season: Season;
  races: Race[];
  race: Race;
  replays: SessionRef[];
  onReplay: (session: SessionRef) => void;
}

const RaceDetail = ({
  year,
  season,
  races,
  race,
  replays,
  onReplay,
}: RaceDetailProps) => {
  const [session, setSession] = useState<Kind>("race");
  const favourite = useFavourite();
  const archived = Number(year) >= 2018;
  const times =
    season.year === Number(year)
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
  const replay = replays.find(
    (s) =>
      s.path &&
      s.name === NAMES[shown].replace(/^Practice /, "FP") &&
      Math.abs(Date.parse(s.start) - Date.parse(times?.[shown] ?? "")) < 864e5,
  );
  return (
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
          {replay && (
            <button
              type="button"
              onClick={() => onReplay(replay)}
              aria-label={`Start replay: ${race.name} · ${NAMES[shown]}`}
              className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 text-sm hover:bg-red-600 hover:text-white"
            >
              <Play aria-hidden="true" className="size-3.5 shrink-0" />
              Replay
            </button>
          )}
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
        <TeamSeason value={Number(year) === season.year ? season : null}>
          <SessionResults
            year={year}
            race={race}
            races={races}
            kind={shown}
            favourite={favourite?.id}
          />
        </TeamSeason>
      </Spoiler>
    </section>
  );
};

interface RacesProps {
  year: string;
  season: Season;
  archive: Loaded<RaceArchive>;
  race: Race | undefined;
  tracks: Record<number, Track>;
  hidden: Set<string>;
  replays: SessionRef[];
  onOpen: (round: number) => void;
  onReplay: (session: SessionRef) => void;
}

const Races = ({
  year,
  season,
  archive,
  race,
  tracks,
  hidden,
  replays,
  onOpen,
  onReplay,
}: RacesProps) => {
  if (archive.data?.year !== Number(year))
    return <Loading label="Loading race results…" error={archive.error} />;
  const races = archive.data.races;
  if (race)
    return (
      <RaceDetail
        key={race.round}
        year={year}
        season={season}
        races={races}
        race={race}
        replays={replays}
        onReplay={onReplay}
      />
    );
  return races.length ? (
    <RaceList races={races} tracks={tracks} hidden={hidden} onOpen={onOpen} />
  ) : (
    <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
      No race results are available for {year}.
    </p>
  );
};

const fromPath = () => {
  const first = pathSegment("calendar", 2);
  return YEARS.includes(first ?? "")
    ? {
        year: first,
        round: Number(pathSegment("calendar", 3)) || 0,
        path: null,
      }
    : { year: null, round: 0, path: first };
};

const find = (races: Race[], round: number, name?: string) =>
  round
    ? (races.find((entry) => entry.name === name) ??
      races.find((entry) => entry.round === round))
    : undefined;

interface CalendarProps {
  season: Loaded<Season>;
}

export const Calendar = ({ season }: CalendarProps) => {
  const sessions = useJson<SessionRef[]>("/api/replay/sessions", 10 * 60_000);
  const [start] = useState(fromPath);
  const [year, setYear] = useState(start.year);
  const [round, setRound] = useState(start.round);
  const [path, setPath] = useState(start.path);
  const [name, setName] = useState<string>();
  const pushed = useRef(false);
  const shown = year ?? String(season.data?.year ?? currentYear);
  const current = Number(shown) === season.data?.year;
  const archive = useJson<RaceArchive>(`/api/results/${shown}`);
  const tracks = useTracks(shown);
  const races = archive.data?.year === Number(shown) ? archive.data.races : [];
  const race = find(races, round, name);
  const hidden = useHidden(shown, season.data);
  const show = (nextYear: string, nextRound = 0, nextName?: string) => {
    setYear(nextYear);
    setRound(nextRound);
    setName(nextName);
    pushed.current = false;
    history.replaceState(
      null,
      "",
      calendarPath(nextYear, nextRound, Number(nextYear) === season.data?.year),
    );
    scrollTo(0, 0);
  };
  const push = (url: string) => {
    navigate(url);
    pushed.current = !standalone;
    scrollTo(0, 0);
  };
  const open = (nextRound: number) => {
    push(calendarPath(shown, nextRound, current));
    setRound(nextRound);
  };
  const back = () => (pushed.current ? history.back() : show(shown));
  const replay = (s: SessionRef) => {
    push(`/calendar/${encodeURIComponent(s.path)}`);
    setPath(s.path);
  };
  const close = () => {
    if (pushed.current) return history.back();
    history.replaceState(null, "", calendarPath(shown, round, current));
    setPath(null);
  };
  useEffect(() => {
    if (race && race.round !== round) show(shown, race.round, name);
  }, [race]);
  const chosen = sessions.data?.find((s) => s.path === path);
  useBack(race && !chosen ? back : undefined);
  if (!season.data || (path && !sessions.data))
    return (
      <Loading
        label="Loading the calendar…"
        error={season.error ?? sessions.error}
      />
    );
  if (chosen)
    return (
      <Replay
        key={chosen.path}
        session={chosen}
        rounds={season.data.rounds}
        onClose={close}
      />
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {race && (
          <button
            type="button"
            onClick={back}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-50"
          >
            <ArrowLeft aria-hidden className="size-4" />
            All races
          </button>
        )}
        <YearSelect
          value={shown}
          onChange={(nextYear) => show(nextYear, race?.round, race?.name)}
        />
      </div>
      {current && !round ? (
        sessions.data ? (
          <CalendarList
            sessions={sessions.data}
            season={season.data}
            races={races}
            tracks={tracks}
            hidden={hidden}
            onStart={replay}
            onOpen={open}
          />
        ) : (
          <Loading label="Loading the calendar…" error={sessions.error} />
        )
      ) : (
        <Races
          year={shown}
          season={season.data}
          archive={archive}
          race={race}
          tracks={tracks}
          hidden={hidden}
          replays={sessions.data ?? []}
          onOpen={open}
          onReplay={replay}
        />
      )}
    </div>
  );
};
