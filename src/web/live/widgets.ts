import type { Column, Size } from "./layout.ts";

export type Widget = { title: string; about: string; only?: string };

const LIST = {
  tower: { title: "Timing tower", about: "Positions, gaps and tyres." },
  battle: {
    title: "Battle",
    about: "The closest fight on track.",
    only: "Shows in races.",
  },
  map: { title: "Track map", about: "Live car positions." },
  compare: {
    title: "Lap compare",
    about: "Speed traces of the fastest laps.",
    only: "Shows with car positions.",
  },
  control: { title: "Race control", about: "Flags and decisions." },
  radio: {
    title: "Team radio",
    about: "Radio clips with transcripts.",
    only: "Shows after the first clip.",
  },
  weather: { title: "Weather", about: "Air, track, humidity and wind." },
  championship: {
    title: "Championship",
    about: "Live title standings.",
    only: "Shows in races with a title fight.",
  },
  runs: {
    title: "Long-run pace",
    about: "Mean pace of long stints.",
    only: "Shows in practice.",
  },
  times: { title: "Lap times", about: "Lap time chart and list." },
  gaps: {
    title: "Gap chart",
    about: "Gap to the leader on each lap.",
    only: "Shows in races.",
  },
  driver: { title: "Driver focus", about: "Live data of the selected driver." },
  traps: { title: "Speed traps", about: "Top speeds at each trap." },
  stops: {
    title: "Pit stops",
    about: "Each stop and its new tyres.",
    only: "Shows in races.",
  },
  positions: {
    title: "Position chart",
    about: "Race position on each lap.",
    only: "Shows in races.",
  },
  movers: {
    title: "Biggest movers",
    about: "Places gained and lost since the start.",
    only: "Shows in races.",
  },
} satisfies Record<string, Widget>;

export type WidgetId = keyof typeof LIST;

export const WIDGETS: Record<WidgetId, Widget> = LIST;

export const isWidget = (id: string): id is WidgetId =>
  Object.hasOwn(WIDGETS, id);

const column = (w: number, ids: WidgetId[]): Column => ({
  w,
  tiles: ids.map((id) => ({ id, h: null })),
});

const PANELS: WidgetId[] = [
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
];

export const DEFAULT_LAYOUT: Record<Size, Column[]> = {
  phone: [column(12, ["tower", ...PANELS])],
  tablet: [column(7, ["tower"]), column(5, PANELS)],
  desktop: [column(7, ["tower"]), column(5, PANELS)],
};
