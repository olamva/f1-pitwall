import { ArrowDown, ArrowUp, ChevronsUp, Timer, Zap } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { FAVOURITE_ROW, useFavourite, useTeamRow } from "../favourite.ts";
import { Tabs } from "../Tabs.tsx";
import { TeamLogo } from "../TeamLogo.tsx";
import type { Rejoin } from "./rejoin.ts";
import { SessionBest, TowerHead } from "./TowerHead.tsx";
import { useFit, type Fit } from "./towerFit.ts";
import { Stints, TyreCells, useCover } from "./TowerTyres.tsx";
import { BestRow } from "./BestRow.tsx";
import { Hint } from "../Hint.tsx";
import { relativeTo, type Mark, type Row, type SessionBests } from "./view.ts";

const MARK: Record<Mark, string> = {
  overall: "text-purple",
  personal: "text-emerald-400",
  normal: "text-yellow-300",
  none: "text-zinc-600",
};

const BAR: Record<Mark, string> = {
  overall: "bg-purple",
  personal: "bg-emerald-500",
  normal: "bg-yellow-400",
  none: "bg-zinc-700",
};

interface TimingTowerProps {
  rows: Row[];
  race: boolean;
  qualifying: boolean;
  bests: SessionBests;
  cut: number | null;
  selected: Set<string>;
  pit: Rejoin | null;
  onToggle: (number: string) => void;
}

const VIEWS = ["Timing", "Tyres"] as const;

interface Swap {
  up: boolean;
  id: number;
}

const LIFT = {
  zIndex: 2,
  backgroundColor: "var(--color-zinc-800)",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.5)",
};

const swapFrames = (dy: number, up: boolean): Keyframe[] => {
  const scale = up ? 1.04 : 1;
  const layer = up ? LIFT : { zIndex: 1 };
  return [
    { ...layer, transform: `translateY(${dy}px) scale(1)` },
    {
      ...layer,
      transform: `translateY(${dy}px) scaleY(${scale})`,
      offset: 0.25,
    },
    { ...layer, transform: `translateY(0) scaleY(${scale})`, offset: 0.75 },
    { ...layer, transform: "translateY(0) scale(1)" },
  ];
};

const useSwaps = (rows: Row[]) => {
  const nodes = useRef(new Map<string, HTMLTableRowElement>());
  const last = useRef(new Map<string, { position: number; top: number }>());
  const count = useRef(0);
  const [swaps, setSwaps] = useState<Record<string, Swap>>({});

  useLayoutEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const moved: Record<string, Swap> = {};
    for (const row of rows) {
      const node = nodes.current.get(row.number);
      const before = last.current.get(row.number);
      if (!node) continue;
      last.current.set(row.number, {
        position: row.position,
        top: node.offsetTop,
      });
      if (!before || before.position === row.position) continue;
      const up = row.position < before.position;
      moved[row.number] = { up, id: ++count.current };
      if (!still)
        node.animate(swapFrames(before.top - node.offsetTop, up), {
          duration: 650,
          easing: "ease-in-out",
        });
    }
    if (Object.keys(moved).length) setSwaps((s) => ({ ...s, ...moved }));
  }, [rows]);

  const bind = (number: string) => (node: HTMLTableRowElement | null) => {
    if (node) nodes.current.set(number, node);
    else nodes.current.delete(number);
  };

  return { swaps, bind };
};

const SwapArrow = ({ swap }: { swap?: Swap }) => (
  <span className="inline-block w-3">
    {swap && (
      <span
        key={swap.id}
        className={`swap-arrow ${swap.up ? "text-emerald-400" : "text-red-500"}`}
      >
        {swap.up ? (
          <ArrowUp size={12} strokeWidth={3} />
        ) : (
          <ArrowDown size={12} strokeWidth={3} />
        )}
      </span>
    )}
  </span>
);

interface CallProps {
  title?: string;
  tone: string;
}

const Call = ({ title, tone }: CallProps) =>
  title ? (
    <Hint label={title}>
      <span
        className={`flex size-4 items-center justify-center rounded-sm text-xs font-bold ${tone}`}
        aria-label={title}
      >
        !
      </span>
    </Hint>
  ) : null;

interface PitLineProps {
  label: string;
  color: string;
  last: boolean;
}

const PitLine = ({ label, color, last }: PitLineProps) => (
  <span
    className={`pointer-events-none absolute inset-x-0 h-px ${last ? "bottom-0" : "top-0"}`}
    style={{ backgroundColor: color }}
  >
    <span
      className="bg-surface absolute top-1/2 left-2 -translate-y-1/2 rounded-sm border px-1 text-[10px] leading-2.5 font-semibold"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  </span>
);

interface SectorsProps {
  sectors: Row["sectors"];
  qualifying: boolean;
  wide: boolean;
}

const Sectors = ({ sectors, qualifying, wide }: SectorsProps) => (
  <span className={`flex ${wide ? "gap-1.5" : "gap-1"}`}>
    {sectors.map((s, i) => (
      <Hint key={i} label={s.value}>
        <span
          className={`flex flex-col gap-0.5 ${wide ? (qualifying ? "min-w-17" : "min-w-5") : "w-5 min-w-5"}`}
        >
          <span
            className={`${qualifying ? "h-3.5 text-center text-[10px] leading-3.5 font-semibold" : "h-2"} ${BAR[s.mark]} ${s.mark === "none" ? "text-zinc-50" : "text-black"}`}
          >
            {qualifying && wide && s.value}
          </span>
          <span className={`flex ${wide ? "gap-px" : ""}`}>
            {s.segments.map((m, j) => (
              <span
                key={j}
                className={`h-1 flex-1 ${wide ? "min-w-1.5" : "min-w-0"} ${BAR[m]}`}
              />
            ))}
          </span>
        </span>
      </Hint>
    ))}
  </span>
);

const Gained = ({ gained }: { gained: number | null }) => (
  <td
    className={`px-2 py-1 text-right ${gained ? (gained > 0 ? "text-emerald-400" : "text-red-500") : "text-zinc-500"}`}
  >
    {gained === null
      ? ""
      : gained
        ? `${gained > 0 ? "▲" : "▼"}${Math.abs(gained)}`
        : "–"}
  </td>
);

interface IntervalProps {
  row: Row;
  pad: string;
  hide: string;
}

const Interval = ({ row, pad, hide }: IntervalProps) => (
  <td
    className={`box-content w-[calc(7ch+2rem)] ${pad} py-1 text-right text-zinc-400`}
  >
    <span className={`flex items-center justify-between gap-1 ${hide}`}>
      <span className="flex gap-1">
        <span className="inline-block w-3">
          {row.catching && (
            <Hint
              label="Catching the car ahead"
              className="inline-flex text-emerald-400"
            >
              <span role="img" aria-label="Catching the car ahead">
                <ChevronsUp size={12} strokeWidth={3} />
              </span>
            </Hint>
          )}
        </span>
        <span className="inline-block w-3">
          {row.overtake && (
            <Hint
              label="Overtake Mode"
              text="Within 1 s of the car ahead. Extra energy this lap."
              className="inline-flex text-yellow-300"
            >
              <span role="img" aria-label="Overtake Mode">
                <Zap size={12} strokeWidth={3} fill="currentColor" />
              </span>
            </Hint>
          )}
        </span>
      </span>
      {row.interval}
    </span>
  </td>
);

interface LapCellProps {
  time: string;
  tone: string;
  projected?: Row["projected"];
  pad: string;
  hide: string;
}

const LapCell = ({ time, tone, projected, pad, hide }: LapCellProps) => (
  <td className={`${pad} py-1 text-right ${tone}`}>
    <span className={hide}>
      {projected ? (
        <Hint
          label="Predicted lap time, not a real time"
          className={`-mr-1 inline-block rounded-sm border border-dashed border-current px-0.5 italic ${MARK[projected.mark]}`}
        >
          ~{projected.value}
        </Hint>
      ) : (
        time
      )}
    </span>
  </td>
);

interface LapCellsProps {
  row: Row;
  fit: Fit;
  pad: string;
  hide: string;
}

const LapCells = ({ row, fit, pad, hide }: LapCellsProps) => (
  <>
    {fit.last && (
      <LapCell
        time={row.lastLap}
        tone={MARK[row.lastMark]}
        projected={row.projected}
        pad={pad}
        hide={hide}
      />
    )}
    {fit.best && (
      <LapCell
        time={row.bestLap}
        tone="text-zinc-300"
        projected={fit.last ? undefined : row.projected}
        pad={pad}
        hide={hide}
      />
    )}
  </>
);

interface TowerRowProps {
  row: Row;
  race: boolean;
  qualifying: boolean;
  fit: Fit;
  lapOwner: boolean;
  selected: boolean;
  tint: string;
  relative: boolean;
  hide: string;
  scale: number;
  swap?: Swap;
  bind: (node: HTMLTableRowElement | null) => void;
  onToggle: () => void;
  children?: React.ReactNode;
}

const TowerRow = ({
  row,
  race,
  qualifying,
  fit,
  lapOwner,
  selected,
  tint,
  relative,
  hide,
  scale,
  swap,
  bind,
  onToggle,
  children,
}: TowerRowProps) => {
  const pad = fit.wide ? "px-2" : "px-1";
  const gap = row.position === 1 && race && !relative ? "Leader" : row.gap;
  return (
    <tr
      ref={bind}
      onClick={onToggle}
      className={`relative cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/60 ${selected ? "bg-zinc-800" : tint} ${row.status === "OUT" ? "opacity-40" : ""}`}
    >
      <td className={`${pad} py-1 text-right text-zinc-400`}>
        {children}
        <span className="flex items-center justify-between gap-1">
          <SwapArrow swap={swap} />
          {row.position}
        </span>
      </td>
      <td className={`${pad} py-1`}>
        <span
          className={`flex w-max items-center ${fit.wide ? "gap-2" : "gap-1"}`}
        >
          {fit.wide && <TeamLogo team={row.team} className="block h-4 w-6" />}
          <Hint label={row.name}>
            <span className="font-semibold">{row.tla}</span>
          </Hint>
          {lapOwner && (
            <Hint label="Fastest lap owner">
              <span
                className="bg-purple flex size-4 items-center justify-center rounded-sm text-white"
                aria-label="Fastest lap owner"
              >
                <Timer className="size-3" strokeWidth={2.5} />
              </span>
            </Hint>
          )}
          <Call title={row.investigation} tone="bg-yellow-400 text-black" />
          <Call title={row.penalty} tone="bg-red-600 text-white" />
        </span>
      </td>
      {race && fit.wide && <Gained gained={row.gained} />}
      <td className={`box-content w-[8ch] ${pad} py-1 text-right`}>
        {row.status && !fit.status ? (
          <span className="text-zinc-400">{row.status}</span>
        ) : (
          gap
        )}
      </td>
      {fit.int && <Interval row={row} pad={pad} hide={hide} />}
      <LapCells row={row} fit={fit} pad={pad} hide={hide} />
      {fit.sectors && (
        <td className={`${pad} py-1`}>
          {hide && <Stints stints={row.stints} scale={scale} wide={fit.wide} />}
          <div className={hide}>
            <Sectors
              sectors={row.sectors}
              qualifying={qualifying}
              wide={fit.wide}
            />
          </div>
        </td>
      )}
      <TyreCells row={row} race={race} fit={fit} hide={hide} scale={scale} />
      {fit.status && (
        <td className="px-2 py-0 text-xs leading-none text-zinc-400">
          {row.status}
        </td>
      )}
    </tr>
  );
};

export const TimingTower = ({
  rows,
  race,
  qualifying,
  bests,
  cut,
  selected,
  pit,
  onToggle,
}: TimingTowerProps) => {
  const { swaps, bind } = useSwaps(rows);
  const favourite = useFavourite();
  const teamRow = useTeamRow();
  const relative = relativeTo(rows, [...selected][0]);
  const [view, setView] = useState<(typeof VIEWS)[number]>("Timing");
  const tyres = view === "Tyres";
  const hide = tyres ? "invisible" : "";
  const table = useCover(tyres);
  const fit = useFit(table, race, qualifying);
  const scale = Math.max(
    1,
    ...rows.map((r) => r.stints.reduce((total, s) => total + s.laps, 0)),
  );
  const widths = [0, 1, 2].map((i) =>
    Math.max(0, ...rows.map((r) => r.sectors[i]?.segments.length ?? 0)),
  );
  const bestRow = !race && fit.last && fit.best;
  const tabs = <Tabs items={VIEWS} value={view} onChange={setView} small />;
  return (
    <div className="bg-surface flex flex-col overflow-x-clip rounded-xl pb-1.5">
      {!bestRow && (
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-800 py-2 text-xs ${fit.wide ? "px-3" : "px-2"}`}
        >
          {tabs}
          <SessionBest bests={bests} wide={fit.wide} />
        </div>
      )}
      <table
        ref={table}
        className={`tabular w-full grow font-mono ${fit.wide ? "text-sm" : "text-xs"}`}
      >
        <TowerHead race={race} cut={cut} fit={fit} tyres={tyres}>
          {bestRow && (
            <BestRow
              bests={bests}
              widths={widths}
              qualifying={qualifying}
              rest={+fit.tyre + 2 * +fit.pits + +fit.status}
            >
              {tabs}
            </BestRow>
          )}
        </TowerHead>
        <tbody>
          {relative.map((r, i) => (
            <TowerRow
              key={r.number}
              row={r}
              race={race}
              qualifying={qualifying}
              fit={fit}
              lapOwner={bests.lap?.number === r.number}
              selected={selected.has(r.number)}
              tint={r.tla === favourite?.code ? FAVOURITE_ROW : teamRow(r.team)}
              relative={relative !== rows}
              hide={hide}
              scale={scale}
              swap={swaps[r.number]}
              bind={bind(r.number)}
              onToggle={() => onToggle(r.number)}
            >
              {pit && i === Math.min(pit.before, rows.length - 1) && (
                <PitLine
                  label={pit.label}
                  color={pit.color}
                  last={pit.before === rows.length}
                />
              )}
              {i + 1 === cut && <PitLine label="KO" color="#ef4444" last />}
            </TowerRow>
          ))}
        </tbody>
      </table>
    </div>
  );
};
