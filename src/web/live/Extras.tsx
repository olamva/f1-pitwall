import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import type { LapRow, Telemetry } from "../../shared/timing.ts";
import { LineChart } from "../charts/LineChart.tsx";
import { ink } from "../ink.ts";
import { TeamNumber } from "../stats/TeamNumber.tsx";
import { Tabs } from "../Tabs.tsx";
import { Compound } from "../Tyre.tsx";
import { movers, pitStops, trapSpeeds, TRAPS, type Trap } from "./extras.ts";
import { Panel } from "./Panels.tsx";
import type { Row } from "./view.ts";

const Driver = ({ row }: { row: Row | undefined }) => (
  <span className="font-f1 font-bold" style={{ color: ink(row?.color) }}>
    {row?.tla ?? "—"}
  </span>
);

const TRAP_LABELS: Record<Trap, string> = {
  ST: "Trap",
  I1: "I1",
  I2: "I2",
  FL: "Finish",
};

export const SpeedTraps = ({
  state,
  rows,
  selected,
}: {
  state: Record<string, any>;
  rows: Row[];
  selected: Set<string>;
}) => {
  const [trap, setTrap] = useState<Trap>("ST");
  const speeds = trapSpeeds(state, rows, trap);
  const top = speeds[0]?.speed ?? 0;
  const low = speeds.at(-1)?.speed ?? 0;
  return (
    <Panel title="Speed traps (km/h)">
      <div className="mb-2">
        <Tabs
          small
          items={TRAPS}
          labels={TRAP_LABELS}
          value={trap}
          onChange={setTrap}
        />
      </div>
      {speeds.length ? (
        <ol className="filled:max-h-none filled:min-h-0 filled:flex-1 max-h-80 space-y-0.5 overflow-y-auto text-sm">
          {speeds.map(({ row, speed }, i) => (
            <li
              key={row.number}
              className={`tabular grid grid-cols-[1.5rem_2.5rem_1fr_2.5rem] items-center gap-2 rounded px-1 font-mono ${selected.has(row.number) ? "bg-zinc-800" : ""}`}
            >
              <span className="text-right text-zinc-500">{i + 1}</span>
              <Driver row={row} />
              <span className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${top === low ? 100 : 20 + (80 * (speed - low)) / (top - low)}%`,
                    background: row.color,
                  }}
                />
              </span>
              <span className="text-right">{speed}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-500">No speeds yet.</p>
      )}
    </Panel>
  );
};

export const PitStops = ({
  laps,
  rows,
  until,
  selected,
}: {
  laps: Record<string, LapRow[]>;
  rows: Row[];
  until: number;
  selected: Set<string>;
}) => {
  const by = new Map(rows.map((r) => [r.number, r]));
  const stops = pitStops(laps, until);
  return (
    <Panel title="Pit stops">
      {stops.length ? (
        <table className="tabular w-full font-mono text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="px-1 py-1 text-right">Lap</th>
              <th className="px-1 py-1">Driver</th>
              <th className="px-1 py-1">Tyres</th>
              <th className="px-1 py-1 text-right" title="Places lost">
                Places
              </th>
            </tr>
          </thead>
          <tbody>
            {stops.map((s) => (
              <tr
                key={`${s.number}-${s.lap}`}
                className={`border-t border-zinc-800 ${selected.has(s.number) ? "bg-zinc-700/40" : ""}`}
              >
                <td className="px-1 py-1 text-right text-zinc-400">{s.lap}</td>
                <td className="px-1 py-1">
                  <Driver row={by.get(s.number)} />
                </td>
                <td className="px-1 py-1">
                  <span className="flex items-center gap-1">
                    {s.from && <Compound compound={s.from} />}
                    <span className="text-zinc-500">→</span>
                    {s.to ? (
                      <Compound compound={s.to} />
                    ) : (
                      <span className="text-zinc-500">…</span>
                    )}
                  </span>
                </td>
                <td
                  className={`px-1 py-1 text-right ${s.lost ? (s.lost > 0 ? "text-red-400" : "text-emerald-400") : "text-zinc-400"}`}
                >
                  {s.lost === null
                    ? ""
                    : s.lost > 0
                      ? `−${s.lost}`
                      : s.lost < 0
                        ? `+${-s.lost}`
                        : "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-zinc-500">No pit stops yet.</p>
      )}
    </Panel>
  );
};

export const PositionChart = ({
  laps,
  rows,
  until,
  driver,
}: {
  laps: Record<string, LapRow[]>;
  rows: Row[];
  until: number;
  driver?: string;
}) => {
  const series = rows.map((r) => ({
    id: r.number,
    label: r.tla,
    color: driver && driver !== r.number ? "#52525b" : r.color,
    points: (laps[r.number] ?? [])
      .filter((l) => l.t <= until && Number(l.position))
      .map((l): [number, number] => [l.lap, Number(l.position)]),
  }));
  return (
    <Panel title="Position chart">
      {series.some((s) => s.points.length) ? (
        <LineChart
          series={
            driver
              ? [
                  ...series.filter((s) => s.id !== driver),
                  ...series.filter((s) => s.id === driver),
                ]
              : series
          }
          xLabel="Lap"
          yFormat={(v) => `P${v}`}
          yDomain={[1, rows.length]}
          invert
          height={480}
          fill
        />
      ) : (
        <p className="text-sm text-zinc-500">No laps yet.</p>
      )}
    </Panel>
  );
};

const Mover = ({ row }: { row: Row }) => (
  <li className="tabular flex items-center gap-2 font-mono text-sm">
    <span className="w-8 text-right text-zinc-500">P{row.position}</span>
    <Driver row={row} />
    <span
      className={`ml-auto flex items-center gap-0.5 font-semibold ${row.gained! > 0 ? "text-emerald-400" : "text-red-400"}`}
    >
      {row.gained! > 0 ? (
        <ArrowUp aria-hidden="true" className="size-3.5" />
      ) : (
        <ArrowDown aria-hidden="true" className="size-3.5" />
      )}
      {Math.abs(row.gained!)}
    </span>
  </li>
);

export const Movers = ({ rows }: { rows: Row[] }) => {
  const { up, down } = movers(rows);
  return (
    <Panel title="Biggest movers">
      {up.length || down.length ? (
        <div className="grid grid-cols-2 gap-4">
          <ul className="space-y-1">
            {up.map((r) => (
              <Mover key={r.number} row={r} />
            ))}
          </ul>
          <ul className="space-y-1">
            {down.map((r) => (
              <Mover key={r.number} row={r} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No places changed yet.</p>
      )}
    </Panel>
  );
};

const Meter = ({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-zinc-500">
      <span>{label}</span>
      <span className="tabular font-mono">{Math.round(value)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  </div>
);

export const DriverFocus = ({
  row,
  telemetry,
  race,
}: {
  row: Row | undefined;
  telemetry: Telemetry | undefined;
  race: boolean;
}) => {
  if (!row)
    return (
      <Panel title="Driver focus">
        <p className="text-sm text-zinc-500">
          Select a driver in the timing tower.
        </p>
      </Panel>
    );
  const stint = row.stints.at(-1);
  const [speed, gear, throttle, brake] = telemetry ?? [];
  const facts: [string, string][] = [
    [race ? "Gap" : "Diff", row.gap || "—"],
    ["Interval", row.interval || "—"],
    ["Last lap", row.lastLap || "—"],
    ["Best lap", row.bestLap || "—"],
    ...(race ? [["Stops", String(row.pits)] as [string, string]] : []),
  ];
  return (
    <Panel title="Driver focus">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-12 w-14 shrink-0 place-items-center rounded-md"
          style={{ background: row.color }}
        >
          <TeamNumber
            id={row.tla}
            number={row.number}
            color="white"
            className="flex h-8 items-center text-2xl"
          />
        </span>
        <div className="min-w-0 grow leading-tight">
          <p
            className="font-f1 truncate text-xl font-black uppercase"
            style={{ color: ink(row.color) }}
          >
            {row.last}
          </p>
          <p className="truncate text-xs text-zinc-400">{row.team}</p>
        </div>
        <span className="font-f1 text-3xl font-black">P{row.position}</span>
      </div>
      <dl className="tabular mb-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="font-sans text-xs text-zinc-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {stint && (
          <div>
            <dt className="font-sans text-xs text-zinc-500">Tyre</dt>
            <dd className="flex items-center gap-1.5">
              <Compound compound={stint.compound} />
              {stint.age} laps
            </dd>
          </div>
        )}
      </dl>
      {telemetry && (
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <div className="tabular text-center font-mono leading-none">
            <p className="text-3xl font-bold">{speed}</p>
            <p className="text-xs text-zinc-500">km/h · gear {gear || "N"}</p>
          </div>
          <div className="space-y-2">
            <Meter
              label="Throttle"
              value={throttle!}
              className="bg-emerald-500"
            />
            <Meter label="Brake" value={brake!} className="bg-red-500" />
          </div>
        </div>
      )}
      {(row.penalty || row.investigation) && (
        <p className="mt-3 text-sm font-semibold text-amber-300">
          {row.penalty ?? row.investigation}
        </p>
      )}
    </Panel>
  );
};
