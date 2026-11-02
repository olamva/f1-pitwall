import { Play } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { SESSION_MS, type Season } from "../../shared/season.ts";
import type { SessionRef, Track } from "../../shared/timing.ts";
import { Circuit } from "../Circuit.tsx";
import { Finish, type Race } from "../Podium.tsx";
import { LABEL } from "./Countdown.tsx";
import {
  CardHead,
  Days,
  ScheduleWeekend,
  sessions as schedule,
  short,
  Slot,
  time,
  upcoming,
} from "./Schedule.tsx";

type Entry = SessionRef & { time?: string };

interface CalendarListProps {
  sessions: SessionRef[];
  season: Season;
  races: Race[];
  tracks: Record<number, Track>;
  hidden: Set<string>;
  onStart: (session: SessionRef) => void;
  onOpen: (round: number) => void;
}

interface SessionButtonProps {
  session: Entry;
  onStart: (session: SessionRef) => void;
  next?: boolean;
}

interface WeekendProps {
  sessions: Entry[];
  round: number | undefined;
  track: Track | undefined;
  onStart: (session: SessionRef) => void;
  onOpen?: () => void;
  podium?: ReactNode;
  featured?: boolean;
}

const day = (s: SessionRef) => new Date(s.start.slice(0, 10));

const weekends = (sessions: SessionRef[]) =>
  sessions
    .reduce<SessionRef[][]>((all, s) => {
      const last = all.at(-1)?.at(-1);
      if (last?.meeting === s.meeting && +day(s) - +day(last) < 4 * 864e5)
        all.at(-1)!.push(s);
      else all.push([s]);
      return all;
    }, [])
    .reverse();

const ongoing = (sessions: SessionRef[]) =>
  !sessions.some((s) => s.name === "Race") &&
  Date.now() - +day(sessions[0]) < 4 * 864e5;

const roundOf = (season: Season, sessions: SessionRef[]) =>
  season.rounds.find((r) =>
    Object.values(r.sessions).some(
      (at) =>
        at && Math.abs(Date.parse(at) - Date.parse(sessions[0].start)) < 864e5,
    ),
  );

const remaining = (season: Season, sessions: SessionRef[]): Entry[] => {
  const round = roundOf(season, sessions);
  return round
    ? schedule(round)
        .filter((s) => +s.at > Date.parse(sessions.at(-1)!.start))
        .map((s) => ({
          ...sessions[0],
          path: "",
          name: (LABEL[s.key] ?? s.key).replace(/^Practice /, "FP"),
          start: `${s.at.toLocaleDateString("sv")}T${time(s.at)}`,
          time: time(s.at),
        }))
    : [];
};

const started = (season: Season, sessions: SessionRef[]) => {
  const round = roundOf(season, sessions);
  return round &&
    Date.parse(round.sessions.fp1 ?? round.sessions.race!) + SESSION_MS <=
      Date.now()
    ? round.round
    : undefined;
};

const dates = (sessions: SessionRef[]) =>
  new Intl.DateTimeFormat([], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatRange(day(sessions[0]), day(sessions.at(-1)!));

const SessionButton = ({ session, onStart, next }: SessionButtonProps) =>
  session.time ? (
    <Slot
      name={short(session.name)}
      time={session.time}
      next={next ? Date.parse(session.start) : undefined}
    />
  ) : session.path ? (
    <button
      onClick={() => onStart(session)}
      aria-label={`Start replay: ${session.meeting} · ${session.name}`}
      className="pointer-events-auto flex w-full cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1 hover:bg-red-600 hover:text-white"
    >
      <Play aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{short(session.name)}</span>
    </button>
  ) : (
    <span className="group/pending pointer-events-auto relative flex">
      <button
        aria-disabled="true"
        aria-describedby={`pending-${session.start}`}
        className="striped-border flex grow cursor-not-allowed items-center gap-1.5 rounded-md px-2 py-1 text-zinc-500"
      >
        <Play aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{short(session.name)}</span>
      </button>
      <span
        id={`pending-${session.start}`}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 opacity-0 shadow-lg group-focus-within/pending:opacity-100 group-hover/pending:opacity-100"
      >
        Session replay is not available yet.
      </span>
    </span>
  );

const weekday = (s: SessionRef) =>
  day(s).toLocaleDateString([], { weekday: "short", timeZone: "UTC" });

const Weekend = ({
  sessions,
  round,
  track,
  onStart,
  onOpen,
  podium,
  featured,
}: WeekendProps) => {
  const next = featured ? sessions.find((s) => s.time) : undefined;
  return (
    <article
      className={`relative h-full space-y-3 rounded-xl ${featured ? "to-surface featured bg-gradient-to-r from-red-700/40 p-5" : "bg-surface p-4"}`}
    >
      {onOpen && (
        <button
          onClick={onOpen}
          aria-label={`Results: ${sessions[0].meeting}`}
          className="absolute inset-0 m-0 cursor-pointer rounded-xl hover:bg-zinc-50/5"
        />
      )}
      <Circuit track={track} round={round} />
      <CardHead
        label={
          featured
            ? `Current race weekend · ${dates(sessions)}`
            : dates(sessions)
        }
        name={sessions[0].meeting}
        country={sessions[0].country}
        featured={featured}
      />
      {podium}
      <div className="pointer-events-none relative">
        <Days
          days={Object.values(
            Object.groupBy(sessions, (s) => s.start.slice(0, 10)),
          ).map((group) => [
            weekday(group![0]),
            group!.map((s) => (
              <SessionButton
                key={s.start}
                session={s}
                onStart={onStart}
                next={s === next}
              />
            )),
          ])}
        />
      </div>
    </article>
  );
};

const SM_SPAN = ["", "sm:col-span-2"];
const LG_SPAN = ["lg:col-span-2", "lg:col-span-6", "lg:col-span-3"];

const leftover = (i: number, at: number, total: number, cols: number) => {
  const tail = i > at;
  const size = tail ? total - at - 1 : at;
  const pos = tail ? i - at - 1 : i;
  const rest = size % cols;
  return (tail ? pos >= size - rest : pos < rest) ? rest : 0;
};

export const CalendarList = ({
  sessions,
  season,
  races,
  tracks,
  hidden,
  onStart,
  onOpen,
}: CalendarListProps) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!ref.current?.closest("[inert]"))
      ref.current?.scrollIntoView({ block: "center" });
  }, []);
  const past = weekends(sessions);
  const future = upcoming(
    season.rounds,
    +new Date(sessions.at(-1)?.start ?? 0),
  ).reverse();
  const anchor =
    past[0] && ongoing(past[0]) ? past[0][0].start : future.at(-1)?.name;
  const keys = [...future.map((r) => r.name), ...past.map((w) => w[0].start)];
  const at = keys.indexOf(anchor ?? "");
  const item = (key: string) => {
    const i = keys.indexOf(key);
    return {
      ref: key === anchor ? ref : undefined,
      "data-swipe-anchor": key === anchor || undefined,
      className:
        key === anchor
          ? "sm:col-span-full"
          : `${SM_SPAN[leftover(i, at, keys.length, 2)]} ${LG_SPAN[leftover(i, at, keys.length, 3)]}`,
    };
  };
  return (
    <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
      {future.map((r) => (
        <li key={r.name} {...item(r.name)}>
          <ScheduleWeekend
            round={r}
            track={tracks[r.round]}
            featured={r.name === anchor}
          />
        </li>
      ))}
      {past.map((w) => {
        const round = started(season, w);
        const race = races.find((r) => r.round === round);
        const number = roundOf(season, w)?.round;
        return (
          <li key={w[0].start} {...item(w[0].start)}>
            <Weekend
              sessions={[...w, ...remaining(season, w)]}
              round={number}
              track={number ? tracks[number] : undefined}
              onStart={onStart}
              onOpen={round ? () => onOpen(round) : undefined}
              podium={race && <Finish race={race} hidden={hidden} />}
              featured={w[0].start === anchor}
            />
          </li>
        );
      })}
    </ul>
  );
};
