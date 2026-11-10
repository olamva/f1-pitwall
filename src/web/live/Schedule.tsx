import { ChevronRight, History } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { RaceArchive, Round } from "../../shared/season.ts";
import type { Track } from "../../shared/timing.ts";
import { useJson } from "../api.ts";
import { Circuit } from "../Circuit.tsx";
import { Flag } from "../Flag.tsx";
import { HoverCard } from "../HoverCard.tsx";
import { Slow } from "../Loading.tsx";
import { SessionPodium, type Kind } from "../SessionResults.tsx";
import { SprintLogo } from "../SprintLogo.tsx";
import { LABEL } from "./Countdown.tsx";

interface WeekendProps {
  round: Round;
  year: number;
  track: Track | undefined;
  featured?: boolean;
}

interface LastYearProps {
  round: Round;
  year: number;
  kind: Kind;
}

interface CardHeadProps {
  label: ReactNode;
  name: string;
  country: string;
  track?: string;
  featured?: boolean;
  sprint?: boolean;
}

interface DaysProps {
  days: [string, ReactNode][];
}

interface SlotProps {
  name: string;
  time: string;
  next?: boolean;
  race?: number;
  card?: ReactNode;
}

interface LeftProps {
  at: number;
}

const SHORT: Record<string, string> = {
  Qualifying: "Quali",
  "Sprint Qualifying": "SQ",
  "Sprint Shootout": "SQ",
};

export const short = (name: string) =>
  SHORT[name] ?? name.replace(/^Practice /, "FP");

export const sessions = (round: Round) =>
  Object.entries(round.sessions)
    .filter((e): e is [string, string] => e[1] !== null)
    .map(([key, at]) => ({ key, at: new Date(at) }))
    .sort((a, b) => +a.at - +b.at);

const dates = (round: Round) => {
  const all = sessions(round);
  return new Intl.DateTimeFormat([], {
    day: "numeric",
    month: "short",
  }).formatRange(all[0].at, all.at(-1)!.at);
};

export const time = (at: Date) =>
  at.toLocaleTimeString([], {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });

const until = (ms: number) => {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const parts: [number, string][] = [
    [Math.floor(minutes / 1440), "d"],
    [Math.floor(minutes / 60) % 24, "h"],
    [minutes % 60, "m"],
  ];
  const first = minutes >= 1440 ? 0 : minutes >= 60 ? 1 : 2;
  return parts.slice(first, first + 2);
};

const useNow = () => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const Left = ({ at }: LeftProps) => {
  const now = useNow();
  return (
    <span className="font-f1 tabular flex items-baseline gap-1.5 text-lg leading-none font-bold">
      {until(at - now).map(([n, unit]) => (
        <span key={unit}>
          {n}
          <span className="ml-0.5 font-sans text-xs font-normal text-zinc-400">
            {unit}
          </span>
        </span>
      ))}
    </span>
  );
};

export const CardHead = ({
  label,
  name,
  country,
  track,
  featured,
  sprint,
}: CardHeadProps) => (
  <header className="min-w-0 pr-14">
    <p
      className={`flex items-center gap-2 text-xs ${featured ? "font-f1 tracking-wider text-red-400 uppercase" : "text-zinc-400"}`}
    >
      {label}
      {sprint && <SprintLogo className="h-2.5 shrink-0 text-zinc-100" />}
    </p>
    <h2
      className={`font-f1 line-clamp-2 font-bold ${featured ? "text-lg sm:text-2xl" : ""}`}
    >
      <Flag country={country} />
      {name}
    </h2>
    {track && <p className="truncate text-xs text-zinc-400">{track}</p>}
  </header>
);

export const OpenHint = () => (
  <p
    aria-hidden
    className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2 font-medium text-zinc-50 transition *:text-red-500 peer-hover:bg-red-600 peer-hover:text-white peer-hover:*:text-white"
  >
    Full results & stats
    <ChevronRight className="size-4" />
  </p>
);

export const Days = ({ days }: DaysProps) => (
  <div className="mt-auto grid max-w-2xl auto-cols-fr grid-flow-col gap-1.5">
    {days.map(([day, cells]) => (
      <div
        key={day}
        className="flex min-w-0 flex-col gap-1 [&>:last-child]:grow"
      >
        <h3 className="text-xs text-zinc-500">{day}</h3>
        {cells}
      </div>
    ))}
  </div>
);

export const Slot = ({ name, time, next, race, card }: SlotProps) => (
  <HoverCard card={card} className="pointer-events-auto grid">
    <span
      className={`flex flex-col justify-between rounded-md bg-zinc-800/50 px-2 py-1 ${card ? "hover:bg-zinc-700" : ""} ${next ? "ring-1 ring-red-400 ring-inset" : ""}`}
    >
      <span className="flex items-baseline justify-between gap-1.5">
        <span className="truncate">{name}</span>
        <span
          className={`tabular font-mono text-xs ${next ? "text-red-400" : "text-zinc-400"}`}
        >
          {time}
        </span>
      </span>
      {race && <Left at={race} />}
    </span>
  </HoverCard>
);

export const LastYear = ({ round, year, kind }: LastYearProps) => {
  const now = useNow();
  const archive = useJson<RaceArchive>(`/api/results/${year - 1}`);
  const at = new Date(round.sessions[kind]!);
  const past = archive.data?.races.find((r) => r.circuit === round.circuitId);
  return (
    <>
      <p className="truncate text-xs text-zinc-400">
        <Flag country={round.country} />
        {round.name} ·{" "}
        {at.toLocaleDateString([], {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
        , {time(at)}
      </p>
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-f1 font-bold">{LABEL[kind]}</span>
        <span className="text-[13px] font-extrabold text-red-400">
          in{" "}
          {until(+at - now)
            .map(([n, unit]) => `${n}${unit}`)
            .join(" ")}
        </span>
      </p>
      <div className="mt-2.5 rounded-[10px] border border-dashed border-zinc-700 bg-zinc-950 px-2.5 py-2">
        <p className="mb-0.5 flex items-center gap-1.5">
          <History aria-hidden className="size-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-300">
            Last year's result
          </span>
          <span className="ml-auto rounded bg-zinc-700 px-1.5 text-[10px] font-extrabold text-zinc-200">
            {year - 1}
          </span>
        </p>
        {past ? (
          <SessionPodium
            year={String(year - 1)}
            round={past.round}
            races={archive.data!.races}
            kind={kind}
            past
          />
        ) : (
          <p className="py-8 text-center text-xs text-zinc-400">
            {archive.data ? (
              "No race here last year"
            ) : archive.error ? (
              "Results are not available."
            ) : (
              <Slow />
            )}
          </p>
        )}
      </div>
    </>
  );
};

export const ScheduleWeekend = ({
  round,
  year,
  track,
  featured,
}: WeekendProps) => {
  const all = sessions(round);
  const next = featured ? all.find((s) => +s.at > Date.now()) : undefined;
  return (
    <article
      className={`relative flex h-full flex-col gap-3 rounded-xl ${featured ? "to-surface featured bg-gradient-to-r from-red-700/40 p-5" : "bg-surface p-4"}`}
    >
      <Circuit track={track} round={round.round} />
      <CardHead
        label={
          featured
            ? `${+all[0].at < Date.now() ? "Current" : "Next"} race weekend · ${dates(round)}`
            : dates(round)
        }
        name={round.name}
        country={round.country}
        track={round.circuit}
        featured={featured}
        sprint={!!round.sessions.sprint}
      />
      <Days
        days={Object.values(
          Object.groupBy(all, (s) => s.at.toLocaleDateString("sv")),
        ).map((group) => [
          group![0].at.toLocaleDateString([], { weekday: "short" }),
          group!.map((s) => (
            <Slot
              key={s.key}
              name={short(LABEL[s.key] ?? s.key)}
              time={time(s.at)}
              next={s === next}
              race={s.key === "race" ? +s.at : undefined}
              card={
                +s.at > Date.now() && (
                  <LastYear round={round} year={year} kind={s.key as Kind} />
                )
              }
            />
          )),
        ])}
      />
    </article>
  );
};

export const upcoming = (rounds: Round[], after: number) =>
  rounds.filter((r) => sessions(r).length && +sessions(r)[0].at > after);
