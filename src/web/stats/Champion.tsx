import type { CSSProperties, RefObject } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { Championship, Standing } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { useConfetti } from "../confetti.ts";
import { Flag } from "../Flag.tsx";
import { BUST, Figure, useArt } from "../Headshot.tsx";
import { useActive } from "../Swipe.tsx";
import { logoSrc } from "../TeamLogo.tsx";
import { honours, type Who } from "./derive.ts";
import { Backdrop } from "./Backdrop.tsx";
import { TeamNumber } from "./TeamNumber.tsx";

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

interface PosterProps {
  champ: Championship;
  id: string;
}

export const GOLD = "linear-gradient(180deg, #fef9c3, #facc15 45%, #a16207)";

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
    if (!el) return;
    const root = document.documentElement;
    let end = 0;
    const top = () => root.toggleAttribute("data-top", scrollY < end);
    const measure = () => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--champion-top", `${r.top + scrollY}px`);
      if (!active) return;
      end = r.bottom + scrollY;
      root.style.setProperty("--champion-end", `${end}px`);
      top();
    };
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    measure();
    observer.observe(el);
    observer.observe(document.body);
    const stop = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    if (!active) return stop;
    addEventListener("scroll", top, { passive: true });
    root.style.setProperty("--champion", color);
    root.dataset.champion = "";
    return () => {
      stop();
      removeEventListener("scroll", top);
      delete root.dataset.top;
      delete root.dataset.champion;
      for (const p of ["--champion", "--champion-end"])
        root.style.removeProperty(p);
    };
  }, [ref, active, color]);
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
  useConfetti(
    true,
    season.year,
    `champion-${season.year}-${champ}-${first.id}`,
  );
  const color = me?.color ?? "#888";
  useBackdrop(ref, color);
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
      className="champion relative flex flex-col pt-6 pb-26 sm:pb-6"
      style={{ "--champion": color } as CSSProperties}
    >
      <Backdrop
        name={surname}
        line={`${season.year} ${title} · ${surname} · ${h.wins} wins · ${first.points} points`}
      />
      <Poster champ={champ} id={first.id} />
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
      <dl className="mt-5 grid max-w-2xl grid-cols-4 gap-2 border-t border-white/20 pt-3 xl:mt-8 xl:max-w-3xl xl:pt-4">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] tracking-wider text-zinc-400 uppercase xl:text-xs">
              {label}
            </dt>
            <dd className="tabular font-f1 text-2xl font-bold sm:text-4xl xl:text-6xl">
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

const Poster = ({ champ, id }: PosterProps) => {
  const d = useArt(id);
  return (
    champ === "drivers" &&
    d?.art && (
      <div className="pointer-events-none relative -z-10 -mb-24 h-[28rem] w-full sm:absolute sm:-top-12 sm:right-0 sm:m-0 sm:h-[39rem] sm:w-1/2 sm:max-w-xl sm:mask-l-from-85% sm:pt-12">
        <div className="relative h-full">
          <TeamNumber
            id={d.id}
            number={d.number}
            color={GOLD}
            className="absolute inset-x-0 top-[3%] flex h-[62%] justify-center text-[16rem] opacity-90"
          />
          <Figure
            id={id}
            pose="front"
            transform={BUST(0.42)}
            className="champion-figure absolute -top-12 left-1/2 h-[calc(100%+3rem)] max-w-none -translate-x-1/2 mask-b-from-[calc(70%+0.9rem)] pt-12"
          />
        </div>
      </div>
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
  <div className="mt-5 max-w-2xl xl:mt-8 xl:max-w-3xl">
    <h3 className="font-f1 text-xs tracking-wider text-zinc-300 uppercase xl:text-sm">
      Road to the title
    </h3>
    <p className="mb-3 text-sm text-zinc-400 xl:text-base">
      {champ === "drivers"
        ? "The finish in each Grand Prix."
        : "The best finish in each Grand Prix."}{" "}
      {h.poles > 0 && `${h.poles} ${h.poles === 1 ? "pole" : "poles"}.`}
    </p>
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5 xl:grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] xl:gap-2">
      {h.best.map((b, i) => {
        const r = season.rounds.find((x) => x.round === b.round);
        const won = b.round === h.decider;
        return (
          <li
            key={b.round}
            title={`${r?.name ?? `Round ${b.round}`}: ${b.position === Infinity ? (b.dsq ? "disqualified" : "no finish") : `P${b.position}`}`}
            className={`champion-chip flex flex-col items-center rounded-md py-1 text-xs xl:py-1.5 xl:text-sm ${CHIP[b.position - 1] ?? "bg-black/30 text-white"} ${won ? "ring-2 ring-[#facc15] ring-offset-2 ring-offset-transparent" : ""}`}
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
