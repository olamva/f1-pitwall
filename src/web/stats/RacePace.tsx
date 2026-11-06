import { useEffect, useState } from "react";
import type { Pace, Season } from "../../shared/season.ts";
import { teamColor } from "../../shared/teams.ts";
import { useJson } from "../api.ts";
import { BoxPlot, type Box } from "../charts/Bars.tsx";
import { lapTime, summary } from "../charts/summary.ts";
import { Panel } from "../live/Panels.tsx";
import { Loading } from "../Loading.tsx";
import { Tabs } from "../Tabs.tsx";
import { CarPace } from "./CarPace.tsx";
import type { Who } from "./derive.ts";

interface RacePaceProps {
  season: Season;
  who: Map<string, Who>;
}

const SLOW = 1.07;
const VIEWS = ["Drivers", "Constructors"] as const;

const byMedian = (a: Box, b: Box) =>
  summary(a.values).median - summary(b.values).median;

export const RacePace = ({ season, who }: RacePaceProps) => {
  const events = [
    ...season.races.map((r) => ({ ...r, kind: "race" as const })),
    ...season.sprints.map((r) => ({ ...r, kind: "sprint" as const })),
  ].sort((a, b) => a.round - b.round || (a.kind === "sprint" ? -1 : 1));
  const [view, setView] = useState<(typeof VIEWS)[number]>("Drivers");
  const [at, setAt] = useState(events.length - 1);
  const [settled, setSettled] = useState(at);
  useEffect(() => {
    const id = setTimeout(() => setSettled(at), 250);
    return () => clearTimeout(id);
  }, [at]);
  const event = events[settled];
  const pace = useJson<Pace>(
    event ? `/api/pace/${season.year}/${event.round}/${event.kind}` : null,
  );
  const [shown, setShown] = useState<Pace | null>(null);
  if (pace.data && pace.data !== shown) setShown(pace.data);
  const label = (i: number) =>
    events[i] &&
    `${season.rounds.find((x) => x.round === events[i]!.round)?.name ?? `Round ${events[i]!.round}`} ${events[i]!.kind === "sprint" ? "Sprint" : "Race"}`;
  const laps = Object.entries(pace.error ? {} : (shown ?? {}));
  const cut =
    Math.min(
      ...laps.filter(([, v]) => v.length > 5).map(([, v]) => summary(v).median),
    ) * SLOW;
  const boxes = laps
    .map(([id, v]) => ({
      id,
      label: who.get(id)?.code ?? id,
      color: who.get(id)?.color ?? "#888",
      values: v.filter((l) => l <= cut),
    }))
    .filter((b) => b.values.length > 5);
  const teams = Object.entries(
    Object.groupBy(boxes, (b) => who.get(b.id)?.team ?? b.id),
  ).map(([id, group = []]) => ({
    id,
    label: group.map((b) => b.label).join(" · "),
    color: teamColor(id),
    values: group.flatMap((b) => b.values),
  }));
  return (
    <Panel title="Race and sprint pace: lap times">
      <div className="mb-3 space-y-3">
        <Tabs items={VIEWS} value={view} onChange={setView} small stretch />
        <label className="block">
          <span className="flex justify-between gap-2 text-sm">
            <span className="font-semibold">{label(at)}</span>
            <span className="tabular text-zinc-500">
              {at + 1}/{events.length}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, events.length - 1)}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
            aria-valuetext={label(at)}
            className="mt-1 w-full accent-[#e10600]"
          />
        </label>
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Lap 1, in-laps, out-laps and laps slower than 107% of the best median
        are left out.{" "}
        {view === "Drivers"
          ? "The box shows the middle half of the laps, and the line is the median."
          : "Each car sits at the median lap of both drivers. The fastest team is on the right."}
      </p>
      {laps.length ? (
        <div className={`transition-opacity ${pace.data ? "" : "opacity-50"}`}>
          {view === "Drivers" ? (
            <BoxPlot boxes={boxes.sort(byMedian)} format={lapTime} />
          ) : (
            <CarPace teams={teams.sort(byMedian)} format={lapTime} />
          )}
        </div>
      ) : (
        <Loading label="Loading lap times…" error={pace.error} />
      )}
    </Panel>
  );
};
