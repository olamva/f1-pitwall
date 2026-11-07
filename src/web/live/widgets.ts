import { GAP, ROW, type Column, type Size } from "./layout.ts";

const MIN_ROWS = 6;

export type Widget = {
  title: string;
  about: string;
  only?: string;
  height: "content" | "shrink" | "fill";
};

const LIST = {
  tower: {
    title: "Timing tower",
    about: "Positions, gaps and tyres.",
    height: "fill",
  },
  battle: {
    title: "Battles",
    about: "The closest fight on track.",
    only: "Shows in races.",
    height: "content",
  },
  map: { title: "Track map", about: "Live car positions.", height: "fill" },
  compare: {
    title: "Lap compare",
    about: "Speed traces of the fastest laps.",
    only: "Shows with car positions.",
    height: "shrink",
  },
  control: {
    title: "Race control",
    about: "Flags and decisions.",
    height: "fill",
  },
  radio: {
    title: "Team radio",
    about: "Radio clips with transcripts.",
    only: "Shows after the first clip.",
    height: "fill",
  },
  weather: {
    title: "Weather",
    about: "Air, track, humidity and wind.",
    height: "content",
  },
  championship: {
    title: "Championship",
    about: "Live title standings.",
    only: "Shows in races with a title fight.",
    height: "shrink",
  },
  runs: {
    title: "Long-run pace",
    about: "Mean pace of long stints.",
    only: "Shows in practice.",
    height: "fill",
  },
  times: {
    title: "Lap times",
    about: "Lap time chart and list.",
    height: "fill",
  },
  gaps: {
    title: "Gap chart",
    about: "Gap to the leader on each lap.",
    only: "Shows in races.",
    height: "fill",
  },
  driver: {
    title: "Driver focus",
    about: "Live data of the selected driver.",
    height: "content",
  },
  traps: {
    title: "Speed traps",
    about: "Top speeds at each trap.",
    height: "fill",
  },
  stops: {
    title: "Pit stops",
    about: "Each stop and its new tyres.",
    only: "Shows in races.",
    height: "fill",
  },
  positions: {
    title: "Position chart",
    about: "Race position on each lap.",
    only: "Shows in races.",
    height: "fill",
  },
  movers: {
    title: "Biggest movers",
    about: "Places gained and lost since the start.",
    only: "Shows in races.",
    height: "content",
  },
} satisfies Record<string, Widget>;

export type WidgetId = keyof typeof LIST;

export const WIDGETS: Record<WidgetId, Widget> = LIST;

export const isWidget = (id: string): id is WidgetId =>
  Object.hasOwn(WIDGETS, id);

export const height = (id: string) => WIDGETS[id as WidgetId].height;

export const rowsFor = (id: string, content: number, natural: number) =>
  height(id) === "content" ||
  Math.abs(content - natural) < GAP ||
  (height(id) === "shrink" && content > natural)
    ? null
    : Math.max(MIN_ROWS, Math.round(content / ROW));

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
