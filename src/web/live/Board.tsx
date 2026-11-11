import { Maximize, Minimize } from "lucide-react";
import { Hint } from "../Hint.tsx";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import type { Round } from "../../shared/season.ts";
import {
  isRace,
  type LapRow,
  type Outline,
  type Period,
} from "../../shared/timing.ts";
import { fastestLap } from "../compare.ts";
import { Flag } from "../Flag.tsx";
import { setSearchParam } from "../path.ts";
import { useTokenHidden } from "../tokenHidden.ts";
import { cutGaps } from "./knockout.ts";
import { useProjected } from "./liveLap.ts";
import { Dashboard } from "./Dashboard.tsx";
import { contested, standings } from "./prediction.ts";
import { StealthInput } from "./StealthInput.tsx";
import { widgetTiles } from "./tiles.tsx";
import { feedUtc, type Feed } from "./useFeed.ts";
import { rejoin } from "./rejoin.ts";
import {
  deletedLaps,
  isQualifying,
  qualifyingPart,
  radios,
  remaining,
  rows as towerRows,
  sessionBests,
  trackStatus,
} from "./view.ts";

interface BoardProps {
  feed: Feed;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  periods: Period[] | null;
  rounds: Round[];
  positionsNote: string | null;
  speed?: number;
  paused?: boolean;
  utc?: number;
  traceUrl: (driver: string, lap: number) => string;
  onLap: (lap: number) => void;
}

interface StatusProps {
  ref: React.Ref<HTMLDivElement>;
  heading: React.ReactNode;
  lap?: { CurrentLap: number; TotalLaps: number };
  part: string | null;
  banner: React.ReactNode;
  clock: string;
  onLap: (lap: number) => void;
  children: React.ReactNode;
}

const Status = ({
  ref,
  heading,
  lap,
  part,
  banner,
  clock,
  onLap,
  children,
}: StatusProps) => (
  <div ref={ref} className="status-row flex flex-wrap items-center gap-3">
    {heading}
    {lap && (
      <span className="tabular font-f1 text-2xl font-black">
        <span className="font-f1-wide mr-2 text-sm text-zinc-400">LAP</span>
        <StealthInput
          label="Lap"
          value={String(lap.CurrentLap)}
          inputMode="numeric"
          onCommit={(text) => onLap(Number(text))}
        />
        <span className="text-zinc-500">/{lap.TotalLaps}</span>
      </span>
    )}
    {part && <span className="font-f1 text-2xl font-black">{part}</span>}
    {banner && (
      <div className="order-last grow basis-full sm:order-none sm:basis-60">
        {banner}
      </div>
    )}
    <div className="ml-auto flex items-center gap-3">
      <span className="tabular font-mono text-xl">{clock}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  </div>
);

interface HeadingProps {
  info: Record<string, any> | undefined;
  focus: boolean;
}

const Heading = ({ info, focus }: HeadingProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const name = ref.current!;
    const h1 = name.parentElement!;
    const row = h1.parentElement!;
    const fit = () => {
      name.hidden = false;
      name.hidden = h1.scrollWidth > h1.clientWidth;
    };
    const sizes = new ResizeObserver(() => requestAnimationFrame(fit));
    const watch = () => {
      sizes.disconnect();
      [...row.children].forEach((child) => sizes.observe(child));
    };
    const nodes = new MutationObserver(watch);
    nodes.observe(row, { childList: true });
    watch();
    return () => {
      sizes.disconnect();
      nodes.disconnect();
    };
  }, []);
  return (
    <h1
      className={`font-f1 max-w-max min-w-0 grow-[1000] basis-0 overflow-hidden text-xl font-bold whitespace-pre ${focus ? "max-md:hidden" : "max-md:max-w-none max-md:basis-full max-md:whitespace-normal"}`}
    >
      <Flag country={info?.Meeting?.Country?.Name} />
      <span ref={ref}>
        {info?.Meeting?.Name}
        <span className="max-md:hidden"> · </span>
      </span>
      <span className="max-md:block max-md:text-base max-md:text-zinc-400">
        {info?.Name}
      </span>
    </h1>
  );
};

const SETTLE_MS = 5_000;

export const Board = ({
  feed,
  laps,
  outline,
  periods,
  rounds,
  positionsNote,
  speed,
  paused,
  utc = feedUtc(feed),
  traceUrl,
  onLap,
}: BoardProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [focus, setFocus] = useState(() =>
    new URLSearchParams(location.search).has("focus"),
  );
  useEffect(() => setSearchParam("focus", focus ? "1" : null), [focus]);
  const [bar, setBar] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!focus) return;
    const observer = new ResizeObserver(() =>
      setBar(row.current!.offsetHeight),
    );
    observer.observe(row.current!);
    return () => observer.disconnect();
  }, [focus]);
  const hideMap = useTokenHidden() && !!positionsNote;
  const state = feed.state as Record<string, any>;
  const timed = useMemo(() => cutGaps(towerRows(state), state), [state]);
  const bests = useMemo(() => sessionBests(state, timed), [state, timed]);
  const pbs = Object.fromEntries(
    timed.flatMap((r) => {
      const lap = fastestLap(
        laps[r.number] ?? [],
        deletedLaps(state, r.number),
        feed.t - SETTLE_MS,
      );
      return lap && r.bestLap ? [[r.number, lap] as const] : [];
    }),
  );
  const [driver] = selected;
  const rows = useProjected({
    rows: timed,
    pbs,
    bests,
    driver,
    qualifying: isQualifying(state.SessionInfo),
    laps,
    outline,
    trail: feed.positionTrail,
    traceUrl,
  });
  const race = isRace(state.SessionInfo);
  const status = trackStatus(state);
  const part = qualifyingPart(state);
  const toggle = (n: string) =>
    setSelected((s) => new Set(s.has(n) ? [] : [n]));
  const table = standings(state, rounds);
  const pit = race ? rejoin(state, rows, driver, outline?.pitLoss) : null;
  const compare = rows.flatMap((r) => {
    const lap = pbs[r.number];
    return lap
      ? [{ ...r, time: lap.time, url: traceUrl(r.number, lap.lap) }]
      : [];
  });
  const banner = status && (
    <div
      role="alert"
      className={`flag-banner font-f1 rounded-md px-4 py-0.5 text-center text-lg font-black tracking-widest uppercase ${status.tone} ${paused ? "paused" : ""}`}
    >
      {status.label}
    </div>
  );
  return (
    <div
      className="board space-y-4"
      data-focus={focus || undefined}
      style={
        focus
          ? ({
              "--tile-top": `${bar}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <Status
        ref={row}
        heading={<Heading info={state.SessionInfo} focus={focus} />}
        lap={state.LapCount}
        part={part}
        banner={banner}
        clock={remaining(state, utc)}
        onLap={onLap}
      >
        <Hint
          label={
            focus
              ? "Show the full page"
              : "Show only the timing, the lap count and the flags"
          }
        >
          <button
            type="button"
            aria-pressed={focus}
            onClick={() => {
              flushSync(() => setFocus(!focus));
              scrollTo(0, 0);
            }}
            className="glass-gear flex h-[2.625rem] cursor-pointer items-center justify-center gap-2 px-4 text-sm max-sm:w-[2.625rem] max-sm:px-0"
          >
            {focus ? (
              <Minimize aria-hidden="true" className="size-5" />
            ) : (
              <Maximize aria-hidden="true" className="size-5" />
            )}
            <span className="[text-box:trim-both_cap_alphabetic] max-sm:sr-only">
              {focus ? "Exit focus" : "Focus"}
            </span>
          </button>
        </Hint>
        <span ref={setSlot} className="contents" />
      </Status>
      <Dashboard
        editing={editing}
        slot={slot}
        onEdit={() => setEditing(true)}
        onDone={() => setEditing(false)}
        off={{
          battle: !race,
          map: hideMap,
          compare: !!positionsNote,
          radio: !radios(state).length,
          championship: !race || !contested(table),
          runs: state.SessionInfo?.Type !== "Practice",
          gaps: !race,
          stops: !race,
          positions: !race,
          movers: !race,
        }}
        tiles={widgetTiles({
          state,
          laps,
          outline,
          periods,
          until: feed.t,
          rows,
          bests,
          table,
          compare,
          radios: radios(state),
          selected,
          pit,
          onToggle: toggle,
          note: positionsNote,
          trail: feed.positionTrail,
          speed,
          stream: feed.src,
          banner,
        })}
      />
    </div>
  );
};
