import { GAP, ROW, type Column, type Size } from "./layout.ts";

const MIN_ROWS = 6;

export type Widget = {
  title: string;
  about?: string;
  only?: string;
  height: "content" | "shrink" | "fill";
};

const LIST = {
  tower: {
    title: "Timing tower",
    height: "fill",
  },
  battle: {
    title: "Battles",
    only: "Shows in races.",
    height: "content",
  },
  map: { title: "Track map", height: "fill" },
  compare: {
    title: "Lap compare",
    only: "Shows with car positions.",
    height: "shrink",
  },
  control: {
    title: "Race control",
    height: "fill",
  },
  radio: {
    title: "Team radio",
    only: "Shows after the first clip.",
    height: "fill",
  },
  weather: {
    title: "Weather",
    height: "content",
  },
  championship: {
    title: "Championship",
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
    height: "fill",
  },
  stops: {
    title: "Pit stops",
    only: "Shows in races.",
    height: "fill",
  },
  positions: {
    title: "Position chart",
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
  display: [column(7, ["tower"]), column(5, PANELS)],
};
