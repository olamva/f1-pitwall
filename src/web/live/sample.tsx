import type { ReactNode } from "react";
import { TEAM_COLORS } from "../../shared/teams.ts";
import {
  lapSeconds,
  type LapRow,
  type LapTrace,
  type Outline,
} from "../../shared/timing.ts";
import { lapTime } from "../charts/summary.ts";
import { course, pointAt, type Course } from "../compare.ts";
import { DriverFocus } from "./Extras.tsx";
import { LongRuns } from "./LongRuns.tsx";
import { prediction } from "./prediction.ts";
import { widgetTiles } from "./tiles.tsx";
import type { Clip } from "./Transcript.tsx";
import { rows as towerRows, sessionBests } from "./view.ts";
import type { WidgetId } from "./widgets.ts";

type Obj = Record<string, any>;

const DRIVERS = [
  ["1", "NOR", "Lando", "Norris", "McLaren", "mclaren"],
  ["3", "VER", "Max", "Verstappen", "Red Bull Racing", "red_bull"],
  ["81", "PIA", "Oscar", "Piastri", "McLaren", "mclaren"],
  ["63", "RUS", "George", "Russell", "Mercedes", "mercedes"],
  ["16", "LEC", "Charles", "Leclerc", "Ferrari", "ferrari"],
  ["44", "HAM", "Lewis", "Hamilton", "Ferrari", "ferrari"],
  ["12", "ANT", "Kimi", "Antonelli", "Mercedes", "mercedes"],
  ["23", "ALB", "Alexander", "Albon", "Williams", "williams"],
  ["55", "SAI", "Carlos", "Sainz", "Williams", "williams"],
  ["14", "ALO", "Fernando", "Alonso", "Aston Martin", "aston_martin"],
  ["6", "HAD", "Isack", "Hadjar", "Red Bull Racing", "red_bull"],
  ["10", "GAS", "Pierre", "Gasly", "Alpine", "alpine"],
  ["87", "BEA", "Oliver", "Bearman", "Haas F1 Team", "haas"],
  ["30", "LAW", "Liam", "Lawson", "Racing Bulls", "rb"],
  ["31", "OCO", "Esteban", "Ocon", "Haas F1 Team", "haas"],
  ["27", "HUL", "Nico", "Hulkenberg", "Audi", "audi"],
  ["18", "STR", "Lance", "Stroll", "Aston Martin", "aston_martin"],
  ["5", "BOR", "Gabriel", "Bortoleto", "Audi", "audi"],
  ["41", "LIN", "Arvid", "Lindblad", "Racing Bulls", "rb"],
  ["43", "COL", "Franco", "Colapinto", "Alpine", "alpine"],
  ["11", "PER", "Sergio", "Perez", "Cadillac", "cadillac"],
  ["77", "BOT", "Valtteri", "Bottas", "Cadillac", "cadillac"],
] as const;

const POINTS = [340, 345, 331, 268, 214, 166, 142, 70, 52, 44, 41, 38];
const AWARD = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const LAPS = 28;
const TOTAL = 57;
const START = Date.UTC(2026, 10, 8, 15);
const DEG: Record<string, number> = { MEDIUM: 0.06, HARD: 0.035 };

const noise = (a: number, b: number) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
};

const ms = (s: number) => Math.round(s * 1000) / 1000;

const utc = (minutes: number) =>
  new Date(START + minutes * 60_000).toISOString().slice(0, 19);

const RING = Array.from({ length: 240 }, (_, k) => {
  const a = (2 * Math.PI * k) / 240;
  const r =
    1 +
    0.22 * Math.sin(2 * a) +
    0.1 * Math.cos(3 * a + 0.6) +
    0.05 * Math.sin(5 * a + 1.1);
  return {
    x: Math.round(9000 * r * Math.cos(a)),
    y: Math.round(5200 * r * Math.sin(a)),
  };
});

const OUTLINE: Outline = {
  x: RING.map((p) => p.x),
  y: RING.map((p) => p.y),
  time: [],
  rotation: 0,
  corners: Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    ...RING[Math.round((i + 0.5) * 20)]!,
  })),
  sectors: [0, 82, 166].map((k) => RING[k]!),
  detection: null,
  pit: null,
  marshalSectors: [],
};

const speedAt = (s: number, wobble = 0) =>
  205 +
  95 * Math.cos(12 * Math.PI * s + 0.4) +
  15 * Math.sin(26 * Math.PI * s) +
  wobble * Math.sin(6 * Math.PI * s);

const lapTrace = (
  c: Course,
  lap: number,
  seconds: number,
  wobble: number,
): LapTrace => {
  const steps = Array.from({ length: 661 }, (_, k) => k / 600 - 0.05);
  const raw = steps.map((s) => 1 / speedAt(s, wobble));
  const unit = (seconds * 1000) / raw.slice(31, 631).reduce((a, b) => a + b);
  let t = 0;
  const times = raw.map((r) => (t += r * unit));
  return {
    lap,
    time: lapTime(seconds),
    car: steps.map((s, k) => [times[k]!, Math.round(speedAt(s, wobble))]),
    pos: steps.map((s, k) => [times[k]!, ...pointAt(c, s * c.length)]),
  };
};

const RADIOS: Clip[] = [
  {
    utc: utc(41),
    number: "3",
    url: "sample:3",
    turns: [
      {
        speaker: "engineer",
        text: "Gap to Norris is 0.8. He is struggling on the rears.",
      },
      { speaker: "driver", text: "Copy. Tell me when I can push." },
    ],
  },
  {
    utc: utc(36),
    number: "1",
    url: "sample:1",
    turns: [{ speaker: "driver", text: "The rears are starting to go." }],
  },
  {
    utc: utc(29),
    number: "16",
    url: "sample:16",
    turns: [
      { speaker: "driver", text: "He just turned in on me!" },
      {
        speaker: "engineer",
        text: "Understood. The stewards are looking at it.",
      },
    ],
  },
];

const MESSAGES = [
  [0, "GREEN LIGHT - PIT EXIT OPEN", { Flag: "GREEN", Scope: "Track" }],
  [
    9,
    "CAR 44 (HAM) TIME 1:33.912 DELETED - TRACK LIMITS AT TURN 4 LAP 6 15:09:12",
  ],
  [
    14,
    "TURN 1 INCIDENT INVOLVING CARS 16 (LEC) AND 63 (RUS) NOTED - CAUSING A COLLISION",
  ],
  [
    18,
    "FIA STEWARDS: TURN 1 INCIDENT INVOLVING CARS 16 (LEC) AND 63 (RUS) UNDER INVESTIGATION - CAUSING A COLLISION",
  ],
  [
    24,
    "YELLOW IN TRACK SECTOR 7",
    { Flag: "YELLOW", Scope: "Sector", Sector: 7 },
  ],
  [
    25,
    "CLEAR IN TRACK SECTOR 7",
    { Flag: "CLEAR", Scope: "Sector", Sector: 7 },
  ],
  [
    31,
    "FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 16 (LEC) - CAUSING A COLLISION",
  ],
] as const;

const build = (): Record<WidgetId, () => ReactNode> => {
  const c = course(OUTLINE);
  const cars = DRIVERS.map(([number], i) => {
    const pit = 13 + Math.floor((noise(i, 7) + 0.5) * 10);
    const first = i % 5 === 4 ? "HARD" : "MEDIUM";
    const second = first === "HARD" ? "MEDIUM" : "HARD";
    const grid = i + Math.round(noise(i, 1) * 6);
    let total = 0;
    const laps = Array.from({ length: LAPS }, (_, k) => {
      const lap = k + 1;
      const compound = lap <= pit ? first : second;
      const age = lap <= pit ? lap : lap - pit;
      const seconds = ms(
        91.4 +
          i * 0.11 +
          (compound === "HARD" ? 0.35 : 0) +
          DEG[compound]! * age -
          0.03 * lap +
          0.5 * noise(i, lap) +
          (lap === 1 ? 3 + grid * 0.22 : 0) +
          (lap === pit ? 3 : lap === pit + 1 ? 19.5 : 0),
      );
      const s1 = ms(seconds * 0.31 + 0.15 * noise(i, lap + 100));
      const s2 = ms(seconds * 0.38 + 0.15 * noise(i, lap + 200));
      total += seconds;
      return {
        lap,
        seconds,
        total,
        sectors: [s1, s2, ms(seconds - s1 - s2)],
        compound,
        pit:
          lap === pit
            ? ("in" as const)
            : lap === pit + 1
              ? ("out" as const)
              : undefined,
      };
    });
    return { number, i, pit, first, second, grid, laps };
  });
  const order = (k: number) =>
    cars.toSorted((a, b) => a.laps[k]!.total - b.laps[k]!.total);
  const laps: Record<string, LapRow[]> = Object.fromEntries(
    cars.map((car) => [
      car.number,
      car.laps.map((l, k): LapRow => {
        const ranked = order(k);
        const gap = l.total - ranked[0]!.laps[k]!.total;
        return {
          lap: l.lap,
          t: START + l.total * 1000,
          time: lapTime(l.seconds),
          position: String(ranked.indexOf(car) + 1),
          gap: gap ? `+${gap.toFixed(3)}` : `LAP ${l.lap}`,
          sectors: l.sectors.map((s) => s.toFixed(3)),
          compound: l.compound,
          ...(l.pit && { pit: l.pit }),
        };
      }),
    ]),
  );
  const final = order(LAPS - 1);
  const best = (
    car: (typeof cars)[number],
    pick: (l: (typeof car.laps)[number]) => number,
  ) => Math.min(...car.laps.map(pick));
  const fastest = Math.min(...cars.map((car) => best(car, (l) => l.seconds)));
  const fastestSector = [0, 1, 2].map((k) =>
    Math.min(...cars.map((car) => best(car, (l) => l.sectors[k]!))),
  );
  const lines: Obj = {};
  const stats: Obj = {};
  const apps: Obj = {};
  const info: Obj = {};
  const position: Obj = {};
  const telemetry: Obj = {};
  final.forEach((car, p) => {
    const last = car.laps.at(-1)!;
    const ahead = final[p - 1]?.laps.at(-1);
    const gap = last.total - final[0]!.laps.at(-1)!.total;
    const interval = ahead ? last.total - ahead.total : 0;
    const pb = best(car, (l) => l.seconds);
    lines[car.number] = {
      Position: String(p + 1),
      GapToLeader: p ? `+${gap.toFixed(3)}` : `LAP ${LAPS + 1}`,
      IntervalToPositionAhead: { Value: p ? `+${interval.toFixed(3)}` : "" },
      LastLapTime: {
        Value: lapTime(last.seconds),
        PersonalFastest: last.seconds === pb,
        OverallFastest: last.seconds === fastest,
      },
      BestLapTime: { Value: lapTime(pb) },
      Sectors: last.sectors.map((s, k) => ({
        Value: s.toFixed(3),
        PersonalFastest: s === best(car, (l) => l.sectors[k]!),
        OverallFastest: s === fastestSector[k],
        Segments: Array.from({ length: 8 }, (_, j) => {
          const n = noise(car.i * 3 + k, j);
          return { Status: n > 0.4 ? 2051 : n > 0 ? 2049 : 2048 };
        }),
      })),
      NumberOfPitStops: 1,
      NumberOfLaps: LAPS,
    };
    stats[car.number] = {
      PersonalBestLapTime: { Value: lapTime(pb) },
      BestSectors: [0, 1, 2].map((k) => ({
        Value: best(car, (l) => l.sectors[k]!).toFixed(3),
      })),
      BestSpeeds: Object.fromEntries(
        (["ST", "I1", "I2", "FL"] as const).map((trap, k) => [
          trap,
          {
            Value: String(
              Math.round(
                [322, 284, 301, 289][k]! -
                  car.i * 0.7 +
                  6 * noise(car.i, k + 30),
              ),
            ),
          },
        ]),
      ),
    };
    apps[car.number] = {
      GridPos: String(car.grid + 1),
      Stints: [
        { Compound: car.first, New: "true", StartLaps: 0, TotalLaps: car.pit },
        {
          Compound: car.second,
          New: "true",
          StartLaps: 0,
          TotalLaps: LAPS - car.pit,
        },
      ],
    };
    info[car.number] = {
      Catching: ahead && interval < 1.5 && last.seconds < ahead.seconds ? 2 : 0,
    };
    const s = 0.42 - gap / 92;
    const v = Math.round(speedAt(s));
    position[car.number] = pointAt(c, s * c.length);
    telemetry[car.number] = [
      v,
      Math.min(8, Math.ceil(v / 40)),
      v > 250 ? 100 : Math.round(v / 3.2),
      v < 130 ? 100 : 0,
    ];
  });
  const points = (n: number) => POINTS[n] ?? Math.max(0, 30 - n * 2);
  const drivers: Obj = Object.fromEntries(
    DRIVERS.map(([number], i) => {
      const award = AWARD[final.findIndex((car) => car.number === number)] ?? 0;
      return [
        number,
        { CurrentPoints: points(i), PredictedPoints: points(i) + award },
      ];
    }),
  );
  const teams: Obj = {};
  DRIVERS.forEach(([number, , , , name, key]) => {
    const t = (teams[key] ??= {
      TeamName: name,
      CurrentPoints: 0,
      PredictedPoints: 0,
    });
    t.CurrentPoints += drivers[number].CurrentPoints;
    t.PredictedPoints += drivers[number].PredictedPoints;
  });
  for (const table of [drivers, teams])
    for (const field of ["Current", "Predicted"])
      Object.values(table)
        .toSorted((a, b) => b[`${field}Points`] - a[`${field}Points`])
        .forEach((t, p) => (t[`${field}Position`] = p + 1));
  const state: Obj = {
    SessionInfo: {
      Type: "Race",
      Name: "Race",
      Meeting: { Name: "Pitwall Grand Prix" },
      StartDate: utc(0),
      GmtOffset: "00:00:00",
    },
    LapCount: { CurrentLap: LAPS + 1, TotalLaps: TOTAL },
    TrackStatus: { Status: "1" },
    DriverList: Object.fromEntries(
      DRIVERS.map(([number, tla, first, last, team, key], i) => [
        number,
        {
          Tla: tla,
          FirstName: first,
          LastName: last,
          FullName: `${first} ${last}`,
          TeamName: team,
          TeamColour: TEAM_COLORS[key]!.slice(1),
          Line: i + 1,
        },
      ]),
    ),
    TimingData: { Lines: lines },
    TimingStats: { Lines: stats },
    TimingAppData: { Lines: apps },
    DriverRaceInfo: info,
    PitStopSeries: {
      PitTimes: Object.fromEntries(
        cars.map((car) => [
          car.number,
          [{ PitStop: { PitStopTime: (2.4 + noise(car.i, 9)).toFixed(1) } }],
        ]),
      ),
    },
    Position: position,
    CarData: telemetry,
    RaceControlMessages: {
      Messages: MESSAGES.map(([minute, text, extra]) => ({
        Utc: utc(minute),
        Category: extra ? "Flag" : "Other",
        Message: text,
        ...extra,
      })),
    },
    WeatherData: {
      AirTemp: "27.4",
      TrackTemp: "41.6",
      Humidity: "48.0",
      WindSpeed: "2.3",
      WindDirection: "214",
      Rainfall: "0",
    },
    WeatherDataSeries: {
      Series: Array.from({ length: 16 }, (_, k) => ({
        Weather: { TrackTemp: (44 - k * 0.16 + 0.3 * Math.sin(k)).toFixed(1) },
      })),
    },
    ChampionshipPrediction: { Drivers: drivers, Teams: teams },
  };
  const rows = towerRows(state);
  const until =
    START + Math.max(...cars.map((car) => car.laps.at(-1)!.total)) * 1000;
  const tiles = widgetTiles({
    state,
    laps,
    outline: OUTLINE,
    periods: [],
    until,
    rows,
    bests: sessionBests(state, rows),
    table: {
      drivers: { rows: prediction(state), title: "open" },
      constructors: { rows: prediction(state, "constructors"), title: "open" },
    },
    compare: rows.slice(0, 2).map((r, k) => ({
      ...r,
      time: r.bestLap,
      lap: lapTrace(c, 20 + k, lapSeconds(r.bestLap)!, k ? 18 : 0),
    })),
    radios: RADIOS,
    selected: new Set(),
    pit: null,
    onToggle: () => {},
    note: null,
  });
  return {
    ...tiles,
    runs: () => (
      <LongRuns
        laps={laps}
        rows={rows}
        until={until}
        selected={new Set()}
        info={{ Type: "Practice" }}
      />
    ),
    driver: () => (
      <DriverFocus row={rows[0]} telemetry={telemetry[rows[0]!.number]} race />
    ),
  };
};

let cache: Record<WidgetId, () => ReactNode> | undefined;

export const sampleTiles = () => (cache ??= build());
