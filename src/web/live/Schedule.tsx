import { useEffect, useState, type ReactNode } from "react";
import type { Round } from "../../shared/season.ts";
import type { Track } from "../../shared/timing.ts";
import { Circuit } from "../Circuit.tsx";
import { Flag } from "../Flag.tsx";
import { LABEL } from "./Countdown.tsx";

interface WeekendProps {
  round: Round;
  track: Track | undefined;
  featured?: boolean;
}

interface UntilProps {
  label: string;
  at: number;
}

interface CardHeadProps {
  label: ReactNode;
  name: string;
  country: string;
  featured?: boolean;
}

interface DaysProps {
  days: [string, ReactNode][];
}

interface SlotProps {
  name: string;
  time: string;
  next?: boolean;
  race?: number;
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
  const [d, h, m] = [
    Math.floor(minutes / 1440),
    Math.floor(minutes / 60) % 24,
    minutes % 60,
  ];
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
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
    <span className="text-xs text-zinc-400">
      in{" "}
      <span className="tabular font-mono text-zinc-50">{until(at - now)}</span>
    </span>
  );
};

export const Until = ({ label, at }: UntilProps) => (
  <p className="text-xs text-zinc-400">
    {label} <Left at={at} />
  </p>
);

export const CardHead = ({ label, name, country, featured }: CardHeadProps) => (
  <header className="min-w-0 pr-14">
    <p
      className={`flex items-center gap-2 text-xs ${featured ? "font-f1 tracking-wider text-red-400 uppercase" : "text-zinc-400"}`}
    >
      {label}
    </p>
    <h2
      className={`font-f1 line-clamp-2 font-bold ${featured ? "text-lg sm:text-2xl" : ""}`}
    >
      <Flag country={country} />
      {name}
    </h2>
  </header>
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

export const Slot = ({ name, time, next, race }: SlotProps) => (
  <span
    className={`flex flex-col justify-between rounded-md bg-zinc-800/50 px-2 py-1 ${next ? "ring-1 ring-red-400 ring-inset" : ""}`}
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
);

export const ScheduleWeekend = ({ round, track, featured }: WeekendProps) => {
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
        featured={featured}
      />
      {next && next.key !== "race" && (
        <Until label={short(LABEL[next.key] ?? next.key)} at={+next.at} />
      )}
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
            />
          )),
        ])}
      />
    </article>
  );
};

export const upcoming = (rounds: Round[], after: number) =>
  rounds.filter((r) => sessions(r).length && +sessions(r)[0].at > after);
