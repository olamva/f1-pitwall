import type { CSSProperties, RefObject } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { Championship, Standing } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { useConfetti } from "../confetti.ts";
import { Flag } from "../Flag.tsx";
import { Headshot } from "../Headshot.tsx";
import { useActive } from "../Swipe.tsx";
import { logoSrc } from "../TeamLogo.tsx";
import { honours, type Who } from "./derive.ts";
import { Backdrop } from "./Backdrop.tsx";

interface ChampionProps {
  champ: Championship;
  season: Season;
  table: Standing[];
  who: Map<string, Who>;
  next?: string;
  onNext: () => void;
}

interface RoadProps {
  champ: Championship;
  season: Season;
  h: ReturnType<typeof honours>;
}

interface PortraitProps {
  champ: Championship;
  id: string;
  season: Season;
}

interface TeamProps {
  id: string;
  name: string;
}

const CHIP = [
  "bg-[#facc15] text-black",
  "bg-[#d4d4d8] text-black",
  "bg-[#d97706] text-white",
];

const useBackdrop = (ref: RefObject<HTMLElement | null>, color: string) => {
  const active = useActive();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const root = document.documentElement;
    const measure = () => {
      const r = el.getBoundingClientRect();
      root.style.setProperty("--champion-top", `${r.top + scrollY}px`);
      root.style.setProperty("--champion-end", `${r.bottom + scrollY}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(document.body);
    root.style.setProperty("--champion", color);
    root.dataset.champion = "";
    return () => {
      observer.disconnect();
      delete root.dataset.champion;
      for (const p of ["--champion", "--champion-top", "--champion-end"])
        root.style.removeProperty(p);
    };
  }, [ref, active, color]);
  return active;
};

export const Champion = ({
  champ,
  season,
  table,
  who,
  next,
  onNext,
}: ChampionProps) => {
  const [first, second] = table as [Standing, Standing | undefined];
  const me = who.get(first.id);
  const ref = useRef<HTMLElement>(null);
  const h = useMemo(
    () => honours(season, champ, first.id),
    [season, champ, first.id],
  );
  useConfetti(true, `${champ}-${first.id}`);
  const active = useBackdrop(ref, me?.color ?? "#888");
  const full = me?.name ?? first.id;
  const surname = champ === "drivers" ? full.split(" ").at(-1)! : full;
  const title =
    champ === "drivers" ? "World Champion" : "Constructors' Champion";
  const decider = season.rounds.find((r) => r.round === h.decider);
  const team =
    season.teams.find((t) => t.id === me?.team)?.name ?? me?.team ?? "";
  const stats = [
    ["Points", first.points],
    ["Wins", h.wins],
    ["Podiums", h.podiums],
    ["Lead", second ? `+${first.points - second.points}` : "—"],
  ] as const;
  return (
    <section
      ref={ref}
      className="champion relative isolate flex flex-col pt-6 pb-26 sm:pb-6"
    >
      {active && (
        <Backdrop
          name={surname}
          line={`${season.year} ${title} · ${surname} · ${h.wins} wins · ${first.points} points`}
        />
      )}
      <Portrait champ={champ} id={first.id} season={season} />
      <p className="font-f1 text-xs font-bold tracking-[0.3em] text-[#fef08a] uppercase sm:text-sm">
        {season.year} {title}
      </p>
      <h2 className="champion-name font-f1 mt-2 text-[2.75rem] leading-none font-black sm:text-7xl">
        {full}
      </h2>
      {champ === "drivers" && <Team id={me?.team ?? ""} name={team} />}
      {decider && (
        <p className="mt-4 w-fit rounded-2xl bg-black/30 px-3 py-1.5 text-sm text-white">
          Clinched at <Flag country={decider.country} />
          <span className="font-semibold">{decider.name}</span>
          {h.left > 0 &&
            ` with ${h.left} ${h.left === 1 ? "race" : "races"} to spare`}
        </p>
      )}
      <dl className="mt-5 grid max-w-2xl grid-cols-4 gap-2 border-t border-white/20 pt-3">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] tracking-wider text-zinc-400 uppercase">
              {label}
            </dt>
            <dd className="tabular font-f1 text-2xl font-bold sm:text-4xl">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <Road champ={champ} season={season} h={h} />
      {next && (
        <button
          type="button"
          onClick={onNext}
          className="mx-auto mt-auto flex cursor-pointer flex-col items-center pt-6 text-sm font-semibold text-zinc-300 hover:text-zinc-50"
        >
          The fight for {next}
          <ChevronDown aria-hidden className="champion-next size-6" />
        </button>
      )}
    </section>
  );
};

const Portrait = ({ champ, id, season }: PortraitProps) => {
  const src =
    champ === "drivers" && season.drivers.find((d) => d.id === id)?.portrait;
  return (
    src && (
      <Headshot
        src={src}
        className="pointer-events-none relative -z-10 mx-auto -mb-12 aspect-square w-3/4 mask-b-from-60% opacity-90 sm:absolute sm:top-0 sm:right-0 sm:mb-0 sm:w-2/5 sm:max-w-lg"
      />
    )
  );
};

const Team = ({ id, name }: TeamProps) => {
  const src = logoSrc(id);
  return src ? (
    <img src={src} alt={name} className="mt-2 size-14 object-contain" />
  ) : (
    <p className="mt-1 text-base text-zinc-300">{name}</p>
  );
};

const Road = ({ champ, season, h }: RoadProps) => (
  <div className="mt-5 max-w-2xl">
    <h3 className="font-f1 text-xs tracking-wider text-zinc-300 uppercase">
      Road to the title
    </h3>
    <p className="mb-3 text-sm text-zinc-400">
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
            title={`${r?.name ?? `Round ${b.round}`}: ${b.position === Infinity ? (b.dsq ? "disqualified" : "no finish") : `P${b.position}`}`}
            className={`champion-chip flex flex-col items-center rounded-md py-1 text-xs ${CHIP[b.position - 1] ?? "bg-black/30 text-white"} ${won ? "ring-2 ring-[#facc15] ring-offset-2 ring-offset-transparent" : ""}`}
            style={{ "--delay": `${i * 40}ms` } as CSSProperties}
          >
            <span className="text-sm leading-tight [&>span]:mr-0">
              <Flag country={r?.country} />
            </span>
            <span className="tabular font-f1 font-bold">
              {b.position !== Infinity
                ? `P${b.position}`
                : b.dsq
                  ? "DSQ"
                  : "DNF"}
            </span>
          </li>
        );
      })}
    </ol>
  </div>
);
