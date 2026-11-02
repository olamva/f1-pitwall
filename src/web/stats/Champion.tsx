import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { Championship, Standing } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { useConfetti } from "../confetti.ts";
import { Flag } from "../Flag.tsx";
import { TeamLogo } from "../TeamLogo.tsx";
import { honours, type Who } from "./derive.ts";
import { TeamNumber } from "./TeamNumber.tsx";

interface ChampionProps {
  champ: Championship;
  season: Season;
  table: Standing[];
  who: Map<string, Who>;
}

interface RoadProps {
  champ: Championship;
  season: Season;
  h: ReturnType<typeof honours>;
}

const CHIP = [
  "bg-[#facc15] text-black",
  "bg-[#d4d4d8] text-black",
  "bg-[#d97706] text-white",
];

export const Champion = ({ champ, season, table, who }: ChampionProps) => {
  const [first, second] = table as [Standing, Standing | undefined];
  const me = who.get(first.id);
  const h = useMemo(
    () => honours(season, champ, first.id),
    [season, champ, first.id],
  );
  useConfetti(true, `${champ}-${first.id}`);
  const round = (n?: number) => season.rounds.find((r) => r.round === n);
  const decider = round(h.decider);
  const driver = season.drivers.find((d) => d.id === first.id);
  const team =
    season.teams.find((t) => t.id === me?.team)?.name ?? me?.team ?? "";
  const stats = [
    ["Points", first.points],
    ["Wins", h.wins],
    ["Podiums", h.podiums],
    ["Lead", second ? `+${first.points - second.points}` : "—"],
  ] as const;
  return (
    <div className="space-y-4">
      <section
        className="champion relative isolate overflow-hidden rounded-2xl px-5 pt-6 pb-5 sm:px-8 sm:pt-8"
        style={{ "--team": me?.color ?? "#888" } as CSSProperties}
      >
        <div aria-hidden className="champion-rays absolute -inset-1/2 -z-10" />
        {champ === "drivers" && driver?.number ? (
          <TeamNumber
            id={driver.id}
            number={driver.number}
            color="rgb(255 255 255 / 0.14)"
            className="absolute top-4 right-4 -z-10 flex h-28 items-start text-[7rem] sm:h-36 sm:text-[9rem]"
          />
        ) : (
          <TeamLogo
            team={first.id}
            className="absolute top-5 right-5 -z-10 size-28 opacity-25 brightness-0 invert sm:size-36"
          />
        )}
        <Trophy
          aria-hidden
          className="champion-trophy size-12 text-[#fde047] sm:size-14"
        />
        <p className="font-f1 mt-4 text-xs font-bold tracking-[0.3em] text-[#fef08a] uppercase">
          {season.year}{" "}
          {champ === "drivers" ? "World Champion" : "Constructors' Champion"}
        </p>
        <h2 className="champion-name font-f1 mt-1 text-4xl leading-none font-black italic sm:text-6xl">
          {me?.name ?? first.id}
        </h2>
        {champ === "drivers" && (
          <p className="mt-2 text-sm text-zinc-300">{team}</p>
        )}
        {decider && (
          <p className="mt-4 inline-block rounded-2xl bg-black/30 px-3 py-1.5 text-sm text-white">
            Clinched at <Flag country={decider.country} />
            <span className="font-semibold">{decider.name}</span>
            {h.left > 0 &&
              ` with ${h.left} ${h.left === 1 ? "race" : "races"} to spare`}
          </p>
        )}
        <dl className="mt-6 grid grid-cols-4 gap-2 border-t border-white/20 pt-4">
          {stats.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] tracking-wider text-zinc-400 uppercase">
                {label}
              </dt>
              <dd className="tabular font-f1 text-2xl font-bold sm:text-3xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <Road champ={champ} season={season} h={h} />
    </div>
  );
};

const Road = ({ champ, season, h }: RoadProps) => (
  <section className="bg-surface rounded-xl p-3">
    <h2 className="font-f1 mb-1 text-xs tracking-wider text-zinc-400 uppercase">
      Road to the title
    </h2>
    <p className="mb-3 text-sm text-zinc-500">
      {champ === "drivers"
        ? "The finish in each Grand Prix."
        : "The best finish in each Grand Prix."}{" "}
      {h.poles > 0 && `${h.poles} ${h.poles === 1 ? "pole" : "poles"}.`}
    </p>
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
      {h.best.map((b, i) => {
        const r = season.rounds.find((x) => x.round === b.round);
        const won = b.round === h.decider;
        return (
          <li
            key={b.round}
            title={`${r?.name ?? `Round ${b.round}`}: ${b.position === Infinity ? "no finish" : `P${b.position}`}`}
            className={`champion-chip flex flex-col items-center rounded-md py-1 text-xs ${CHIP[b.position - 1] ?? "bg-zinc-800 text-zinc-300"} ${won ? "ring-2 ring-[#facc15] ring-offset-2 ring-offset-(--color-surface)" : ""}`}
            style={{ "--delay": `${i * 40}ms` } as CSSProperties}
          >
            <span className="text-sm leading-tight [&>span]:mr-0">
              <Flag country={r?.country} />
            </span>
            <span className="tabular font-f1 font-bold">
              {b.position === Infinity ? "DNF" : `P${b.position}`}
            </span>
            {won && <Trophy aria-label="Title clinched" className="size-3" />}
          </li>
        );
      })}
    </ol>
  </section>
);
