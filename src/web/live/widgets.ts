import type { Item, Layout } from "./layout.ts";

export type Widget = {
  title: string;
  about: string;
  w: number;
  only?: string;
};

const LIST = {
  tower: { title: "Timing tower", about: "Positions, gaps and tyres.", w: 7 },
  battle: {
    title: "Battle",
    about: "The closest fight on track.",
    w: 5,
    only: "Shows in races.",
  },
  map: { title: "Track map", about: "Live car positions.", w: 5 },
  compare: {
    title: "Lap compare",
    about: "Speed traces of the fastest laps.",
    w: 5,
    only: "Shows with car positions.",
  },
  control: { title: "Race control", about: "Flags and decisions.", w: 5 },
  radio: {
    title: "Team radio",
    about: "Radio clips with transcripts.",
    w: 5,
    only: "Shows after the first clip.",
  },
  weather: { title: "Weather", about: "Air, track, humidity and wind.", w: 5 },
  championship: {
    title: "Championship",
    about: "Live title standings.",
    w: 5,
    only: "Shows in races with a title fight.",
  },
  runs: {
    title: "Long-run pace",
    about: "Mean pace of long stints.",
    w: 5,
    only: "Shows in practice.",
  },
  times: { title: "Lap times", about: "Lap time chart and list.", w: 7 },
  gaps: {
    title: "Gap chart",
    about: "Gap to the leader on each lap.",
    w: 7,
    only: "Shows in races.",
  },
  driver: {
    title: "Driver focus",
    about: "Live data of the selected driver.",
    w: 5,
  },
  traps: { title: "Speed traps", about: "Top speeds at each trap.", w: 5 },
  stops: {
    title: "Pit stops",
    about: "Each stop and its new tyres.",
    w: 5,
    only: "Shows in races.",
  },
  strategy: {
    title: "Tyre strategy",
    about: "Stints of each driver on a lap axis.",
    w: 7,
    only: "Shows in races.",
  },
  positions: {
    title: "Position chart",
    about: "Race position on each lap.",
    w: 7,
    only: "Shows in races.",
  },
  movers: {
    title: "Biggest movers",
    about: "Places gained and lost since the start.",
    w: 5,
    only: "Shows in races.",
  },
} satisfies Record<string, Widget>;

export type WidgetId = keyof typeof LIST;

export const WIDGETS: Record<WidgetId, Widget> = LIST;

export const isWidget = (id: string): id is WidgetId =>
  Object.hasOwn(WIDGETS, id);

const stack = (ids: WidgetId[]): Item[] =>
  ids.map((id) => ({ id, x: 0, w: 1, h: null }));

const grid = (ids: [WidgetId, number, number][]): Item[] =>
  ids.map(([id, x, w]) => ({ id, x, w, h: null }));

export const DEFAULT_LAYOUT: Layout = {
  phone: stack([
    "tower",
    "battle",
    "map",
    "compare",
    "control",
    "radio",
    "weather",
    "championship",
    "runs",
    "times",
    "gaps",
  ]),
  tablet: grid([
    ["tower", 0, 12],
    ["battle", 0, 6],
    ["map", 6, 6],
    ["control", 0, 6],
    ["radio", 6, 6],
    ["weather", 6, 6],
    ["compare", 0, 6],
    ["championship", 6, 6],
    ["runs", 6, 6],
    ["times", 0, 12],
    ["gaps", 0, 12],
  ]),
  desktop: grid([
    ["tower", 0, 7],
    ["battle", 7, 5],
    ["map", 7, 5],
    ["weather", 7, 5],
    ["control", 7, 5],
    ["radio", 7, 5],
    ["times", 0, 7],
    ["gaps", 0, 7],
    ["championship", 0, 7],
    ["compare", 7, 5],
    ["runs", 7, 5],
  ]),
};
