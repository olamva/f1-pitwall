import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Pace, Season } from "../../shared/season.ts";
import { teamColor } from "../../shared/teams.ts";
import { useJson } from "../api.ts";
import { BoxPlot, type Box } from "../charts/Bars.tsx";
import { lapTime, summary } from "../charts/summary.ts";
import { Flag } from "../Flag.tsx";
import { Panel } from "../live/Panels.tsx";
import { Loading } from "../Loading.tsx";
import { Swipe } from "../Swipe.tsx";
import { Tabs } from "../Tabs.tsx";
import { CarPace } from "./CarPace.tsx";
import type { Who } from "./derive.ts";
import { kindLabel, PaceSeek, type PaceEvent } from "./PaceSeek.tsx";

interface RacePaceProps {
  season: Season;
  who: Map<string, Who>;
}

const SLOW = 1.07;
const VIEWS = ["Drivers", "Constructors"] as const;
type View = (typeof VIEWS)[number];

const byMedian = (a: Box, b: Box) =>
  summary(a.values).median - summary(b.values).median;

const NOTES: Record<View, string> = {
  Drivers:
    "The box shows the middle half of the laps, and the line is the median.",
  Constructors:
    "Each car sits at the median lap of both drivers. The fastest team is on the right.",
};

export const RacePace = ({ season, who }: RacePaceProps) => {
  const events: PaceEvent[] = [
    ...season.races.map((r) => ({ round: r.round, kind: "race" as const })),
    ...season.sprints.map((r) => ({ round: r.round, kind: "sprint" as const })),
  ]
    .sort((a, b) => a.round - b.round || (a.kind === "sprint" ? -1 : 1))
    .map((e) => {
      const round = season.rounds.find((x) => x.round === e.round);
      return {
        ...e,
        name: round?.name ?? `Round ${e.round}`,
        country: round?.country,
      };
    });
  const [view, setView] = useState<View>("Drivers");
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const [at, setAt] = useState(events.length - 1);
  const [settled, setSettled] = useState({ at, dir: 0 });
  const settle = (i: number) =>
    setSettled((s) => (s.at === i ? s : { at: i, dir: Math.sign(i - s.at) }));
  useEffect(() => {
    const id = setTimeout(() => settle(at), 160);
    return () => clearTimeout(id);
  }, [at]);
  const event = events[settled.at];
  const pace = useJson<Pace>(
    event ? `/api/pace/${season.year}/${event.round}/${event.kind}` : null,
  );
  const [shown, setShown] = useState<Pace | null>(null);
  if (pace.data && pace.data !== shown) setShown(pace.data);
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
    <div className="space-y-4">
      <Tabs
        items={VIEWS}
        value={view}
        onChange={setView}
        small
        stretch
        drive={blob}
      />
      <Swipe
        items={VIEWS}
        value={view}
        onChange={setView}
        drive={blob}
        render={(v) => (
          <Panel
            title="Race and sprint pace: lap times"
            info={
              <>
                <p>
                  Lap 1, in-laps, out-laps and laps slower than 107% of the best
                  median are left out.
                </p>
                <p>{NOTES[v]}</p>
              </>
            }
          >
            <div className="mb-3">
              <p className="flex justify-between gap-2 overflow-hidden text-sm">
                {event && (
                  <span
                    key={settled.at}
                    className="animate-roll truncate font-semibold motion-reduce:animate-none"
                    style={
                      { "--roll": `${settled.dir * 0.9}em` } as CSSProperties
                    }
                  >
                    <Flag country={event.country} />
                    {event.name} {kindLabel(event)}
                  </span>
                )}
                <span className="tabular shrink-0 text-zinc-500">
                  {at + 1}/{events.length}
                </span>
              </p>
              <PaceSeek
                events={events}
                value={at}
                onChange={setAt}
                onCommit={settle}
              />
            </div>
            {laps.length ? (
              <div
                data-pending={!pace.data}
                className="group transition-opacity duration-300 data-[pending=true]:opacity-60"
              >
                {v === "Drivers" ? (
                  <BoxPlot boxes={boxes.sort(byMedian)} format={lapTime} />
                ) : (
                  <CarPace teams={teams.sort(byMedian)} format={lapTime} />
                )}
              </div>
            ) : (
              <Loading label="Loading lap times…" error={pace.error} />
            )}
          </Panel>
        )}
      />
    </div>
  );
};
