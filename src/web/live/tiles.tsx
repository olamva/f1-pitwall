import type { ReactNode } from "react";
import type { Championship as Champ } from "../../shared/clinch.ts";
import {
  isRace,
  type LapRow,
  type Outline,
  type Period,
} from "../../shared/timing.ts";
import { LapCompare, type CompareDriver } from "../LapCompare.tsx";
import { Battle } from "./Battle.tsx";
import { Championship } from "./Championship.tsx";
import {
  DriverFocus,
  Movers,
  PitStops,
  PositionChart,
  SpeedTraps,
} from "./Extras.tsx";
import { knockout } from "./knockout.ts";
import { LapCharts } from "./LapCharts.tsx";
import { LongRuns } from "./LongRuns.tsx";
import { Panel, RaceControl, TeamRadio, Weather } from "./Panels.tsx";
import type { Standing } from "./prediction.ts";
import type { Rejoin } from "./rejoin.ts";
import { TimingTower } from "./TimingTower.tsx";
import { TrackMap } from "./TrackMap.tsx";
import type { Clip } from "./Transcript.tsx";
import type { PositionTrail } from "./useFeed.ts";
import {
  deletedLaps,
  isQualifying,
  messages,
  sectorFlags,
  sessionStart,
  trackTemps,
  type Row,
  type SessionBests,
} from "./view.ts";
import type { WidgetId } from "./widgets.ts";

export interface TileData {
  state: Record<string, any>;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  periods: Period[] | null;
  until: number;
  rows: Row[];
  bests: SessionBests;
  table: Record<Champ, Standing>;
  compare: CompareDriver[];
  radios: Clip[];
  selected: Set<string>;
  pit: Rejoin | null;
  onToggle: (number: string) => void;
  note: string | null;
  trail?: PositionTrail;
  speed?: number;
  stream?: string;
  banner?: ReactNode;
}

export const widgetTiles = ({
  state,
  laps,
  outline,
  periods,
  until,
  rows,
  bests,
  table,
  compare,
  radios,
  selected,
  pit,
  onToggle,
  note,
  trail,
  speed,
  stream,
  banner,
}: TileData): Record<WidgetId, () => ReactNode> => {
  const race = isRace(state.SessionInfo);
  const [driver] = selected;
  const at = rows.findIndex((r) => r.number === driver);
  const focus = (
    at < 0 ? rows.slice(0, 5) : rows.slice(Math.max(0, at - 1), at + 2)
  ).map((r) => r.number);
  const chart = (kind: "times" | "gaps") => (
    <LapCharts
      chart={kind}
      laps={laps}
      rows={rows}
      focus={focus}
      driver={driver}
      deleted={deletedLaps(state, driver)}
      until={until}
      race={race}
      periods={periods}
    />
  );
  return {
    tower: () => (
      <TimingTower
        rows={rows}
        race={race}
        qualifying={isQualifying(state.SessionInfo)}
        bests={bests}
        cut={knockout(state)}
        selected={selected}
        pit={pit}
        onToggle={onToggle}
      />
    ),
    battle: () => (
      <Battle
        rows={rows}
        laps={laps}
        periods={periods}
        until={until}
        left={
          state.LapCount
            ? state.LapCount.TotalLaps - state.LapCount.CurrentLap
            : Infinity
        }
        selected={driver}
      />
    ),
    map: () => (
      <TrackMap
        outline={outline}
        positions={state.Position}
        telemetry={state.CarData}
        rows={rows}
        bests={bests}
        race={race}
        selected={selected}
        pit={pit}
        onToggle={onToggle}
        note={note}
        positionTrail={trail}
        time={until}
        speed={speed}
        stream={stream}
        banner={banner}
        flags={sectorFlags(state)}
      />
    ),
    compare: () => (
      <Panel title="Lap compare">
        <LapCompare outline={outline} drivers={compare} />
      </Panel>
    ),
    control: () => (
      <RaceControl
        messages={messages(state)}
        rows={rows}
        selected={selected}
        start={sessionStart(state)}
      />
    ),
    radio: () => <TeamRadio radios={radios} rows={rows} selected={selected} />,
    weather: () => (
      <Weather weather={state.WeatherData} trend={trackTemps(state)} />
    ),
    championship: () => <Championship standings={table} />,
    runs: () => (
      <LongRuns
        laps={laps}
        rows={rows}
        until={until}
        selected={selected}
        info={state.SessionInfo}
      />
    ),
    times: () => chart("times"),
    gaps: () => chart("gaps"),
    driver: () => (
      <DriverFocus
        row={rows.find((r) => r.number === driver)}
        telemetry={driver ? state.CarData?.[driver] : undefined}
        race={race}
      />
    ),
    traps: () => <SpeedTraps state={state} rows={rows} selected={selected} />,
    stops: () => (
      <PitStops laps={laps} rows={rows} until={until} selected={selected} />
    ),
    positions: () => (
      <PositionChart laps={laps} rows={rows} until={until} driver={driver} />
    ),
    movers: () => <Movers rows={rows} />,
  };
};
