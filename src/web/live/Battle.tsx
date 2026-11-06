import { useMemo, useRef, useState } from "react";
import type { LapRow, Period } from "../../shared/timing.ts";
import { useFavourite } from "../favourite.ts";
import { Tabs } from "../Tabs.tsx";
import { Versus } from "../Versus.tsx";
import {
  battles,
  choose,
  closest,
  forecast,
  label,
  NEXT,
  ongoing,
  type Forecast,
  type Pair,
} from "./battles.ts";
import type { Row } from "./view.ts";

interface BattleProps {
  rows: Row[];
  laps: Record<string, LapRow[]>;
  periods: Period[] | null;
  until: number;
  left: number;
  selected?: string;
}

const lapsText = (n: number) => `~${n} lap${n > 1 ? "s" : ""}`;

const Card = ({
  pair,
  center,
  caption,
  dim,
  detail,
}: {
  pair: Pair;
  center: string;
  caption: string;
  dim?: boolean;
  detail?: string;
}) => (
  <Versus
    key={pair.ahead.tla + pair.chaser.tla}
    seam={50}
    center={center}
    caption={caption}
    dim={dim}
    detail={detail}
    cars
    sides={[
      {
        id: pair.ahead.tla,
        color: pair.ahead.color,
        note: `P${pair.ahead.position}`,
      },
      {
        id: pair.chaser.tla,
        color: pair.chaser.color,
        note: `P${pair.chaser.position}`,
      },
    ]}
  />
);

export const Battle = ({
  rows,
  laps,
  periods,
  until,
  left,
  selected,
}: BattleProps) => {
  const favourite = useFavourite();
  const [tapped, setTapped] = useState<string | null>(null);
  const last = useRef<Pair | null>(null);
  const groups = battles(rows);
  const next = forecast(rows, laps, periods, until, left);
  if (tapped && !ongoing(groups, next, tapped)) setTapped(null);
  const fan = rows.find((r) => r.tla === favourite?.code)?.number;
  const view = choose(groups, next, selected, tapped, fan);
  if (view?.group) last.current = view.pair;
  const nextChip = next && `Next · ${lapsText(next.laps)}`;
  const key = [...groups.map(label), nextChip].filter(Boolean).join("\n");
  const chips = useMemo(() => (key ? key.split("\n") : []), [key]);
  const shown = view?.pair ?? last.current;
  const trend = (f: Forecast) =>
    `+${f.interval.toFixed(1)} s · −${f.rate.toFixed(1)} s/lap`;
  return (
    <section className="bg-surface space-y-2 rounded-xl p-3">
      <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
        {!shown
          ? "Battle"
          : `${view && !view.group ? "Next battle" : "Battle"} for P${shown.ahead.position}`}
      </h2>
      <div className="-mx-3 h-10 [scrollbar-width:none] overflow-x-auto overflow-y-hidden px-3">
        <div className="w-max">
          {chips.length > 0 && (
            <Tabs
              small
              items={chips}
              value={view?.group ? label(view.group) : view ? nextChip : null}
              onChange={(chip) =>
                setTapped(
                  chip === nextChip
                    ? NEXT
                    : closest(groups[chips.indexOf(chip)]!).chaser.number,
                )
              }
            />
          )}
        </div>
      </div>
      {view?.group ? (
        <Card
          pair={view.pair}
          center={view.pair.chaser.interval.replace(/^\+/, "")}
          caption="Interval"
        />
      ) : view ? (
        <Card
          pair={view.pair}
          center={lapsText(view.pair.laps).toUpperCase()}
          caption="Battle in"
          detail={trend(view.pair)}
          dim
        />
      ) : shown ? (
        <Card
          pair={shown}
          center={shown.chaser.interval.replace(/^\+/, "")}
          caption="Last battle"
          dim
        />
      ) : (
        <div className="flex h-64 max-w-lg items-center justify-center rounded-xl bg-zinc-800/50 text-sm text-zinc-400 sm:h-80">
          No battle within 1 s
        </div>
      )}
    </section>
  );
};
