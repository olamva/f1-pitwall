import { ArrowDownToLine } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Round } from "../../shared/season.ts";
import {
  isRace,
  type LapRow,
  type Outline,
  type Period,
} from "../../shared/timing.ts";
import { fastestLap } from "../compare.ts";
import { Flag } from "../Flag.tsx";
import { useTokenHidden } from "../tokenHidden.ts";
import { cutGaps } from "./knockout.ts";
import { Dashboard } from "./Dashboard.tsx";
import { contested, standings } from "./prediction.ts";
import { StealthInput } from "./StealthInput.tsx";
import { widgetTiles } from "./tiles.tsx";
import { feedUtc, type Feed } from "./useFeed.ts";
import { rejoin } from "./rejoin.ts";
import {
  deletedLaps,
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
  lap?: { CurrentLap: number; TotalLaps: number };
  part: string | null;
  banner: React.ReactNode;
  clock: string;
  onLap: (lap: number) => void;
  children: React.ReactNode;
}

const Status = ({
  ref,
  lap,
  part,
  banner,
  clock,
  onLap,
  children,
}: StatusProps) => (
  <div
    ref={ref}
    className="flex scroll-mt-[calc(env(safe-area-inset-top)+1rem)] flex-wrap items-center gap-3"
  >
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
    {part && (
      <span className="font-f1 rounded bg-zinc-700 px-2 py-0.5 text-lg font-bold">
        {part}
      </span>
    )}
    {banner && (
      <div className="order-last grow basis-full sm:order-none sm:basis-60">
        {banner}
      </div>
    )}
    <span className="tabular ml-auto font-mono text-xl">{clock}</span>
    <div className="flex items-center justify-end gap-3 max-sm:basis-full">
      {children}
    </div>
  </div>
);

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
  const hideMap = useTokenHidden() && !!positionsNote;
  const top = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const state = feed.state as Record<string, any>;
  const rows = useMemo(() => cutGaps(towerRows(state), state), [state]);
  const bests = useMemo(() => sessionBests(state, rows), [state, rows]);
  const race = isRace(state.SessionInfo);
  const status = trackStatus(state);
  const part = qualifyingPart(state);
  const toggle = (n: string) =>
    setSelected((s) => new Set(s.has(n) ? [] : [n]));
  const [driver] = selected;
  const table = standings(state, rounds);
  const pit = race ? rejoin(state, rows, driver, outline?.pitLoss) : null;
  const compare = rows.flatMap((r) => {
    const lap = fastestLap(
      laps[r.number] ?? [],
      deletedLaps(state, r.number),
      feed.t - SETTLE_MS,
    );
    return lap && r.bestLap
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
    <div className="board space-y-4">
      <h1 className="font-f1 text-xl font-bold">
        <Flag country={state.SessionInfo?.Meeting?.Country?.Name} />
        {state.SessionInfo?.Meeting?.Name} · {state.SessionInfo?.Name}
      </h1>
      <Status
        ref={top}
        lap={state.LapCount}
        part={part}
        banner={banner}
        clock={remaining(state, utc)}
        onLap={onLap}
      >
        <button
          type="button"
          onClick={() =>
            (matchMedia("(width >= 80rem)").matches
              ? grid
              : top
            ).current!.scrollIntoView({ behavior: "smooth" })
          }
          title="Scroll the timing to the top of the screen"
          className="glass-gear flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm"
        >
          <ArrowDownToLine aria-hidden="true" size={16} />
          Focus
        </button>
        <span ref={setSlot} className="contents" />
      </Status>
      <Dashboard
        ref={grid}
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
