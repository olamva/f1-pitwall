import { useMemo, useRef, useState } from "react";
import type { LapRow, Period } from "../../shared/timing.ts";
import { useFavourite } from "../favourite.ts";
import { Tabs } from "../Tabs.tsx";
import { Slices, Versus } from "../Versus.tsx";
import {
  battles,
  choose,
  closest,
  contenders,
  forecast,
  label,
  NEXT,
  ongoing,
  passes,
  within,
  type Pair,
  type View,
} from "./battles.ts";
import type { Row } from "./view.ts";

const HOLD = 3000;

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
  alert,
  detail,
}: {
  pair: Pair;
  center: string;
  caption: string;
  dim?: boolean;
  alert?: boolean;
  detail?: string[];
}) => (
  <Versus
    key={[pair.ahead.tla, pair.chaser.tla].sort().join()}
    seam={50}
    center={center}
    caption={caption}
    dim={dim}
    alert={alert}
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

const usePass = (rows: Row[], until: number) => {
  const [seen, setSeen] = useState({ rows, until });
  const [held, setPass] = useState<{ pair: Pair; at: number } | null>(null);
  let pass = held;
  if (seen.rows !== rows) {
    setSeen({ rows, until });
    const pair =
      until > seen.until && until - seen.until < HOLD
        ? passes(seen.rows, rows)[0]
        : undefined;
    if (pair) setPass((pass = { pair, at: until }));
  }
  return pass && until >= pass.at && until - pass.at < HOLD ? pass.pair : null;
};

const heading = (view: View | null, pass: Pair | null, lead?: Row) =>
  pass
    ? `Overtake for P${pass.ahead.position}`
    : !lead
      ? "Battle"
      : `${view && !view.group ? "Next battle" : "Battle"} for P${lead.position}`;

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
  const fresh = usePass(rows, until);
  const groups = battles(rows, fresh);
  const next = forecast(rows, laps, periods, until, left);
  if (tapped && !ongoing(groups, next, tapped)) setTapped(null);
  const fan = rows.find((r) => r.tla === favourite?.code)?.number;
  const view = choose(groups, next, selected, tapped, fan, fresh);
  const pass = (view?.group && within(view.group, fresh)) ?? null;
  if (view?.group) last.current = view.pair;
  const nextChip = next && `Next ${lapsText(next.laps)}`;
  const key = [...groups.map(label), nextChip].filter(Boolean).join("\n");
  const chips = useMemo(() => (key ? key.split("\n") : []), [key]);
  const lead =
    view?.group?.[0]!.ahead ?? view?.pair.ahead ?? last.current?.ahead;
  return (
    <section className="bg-surface space-y-2 rounded-xl p-3">
      <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
        {heading(view, pass, lead)}
      </h2>
      <div className="-mx-3 h-[50px] [scrollbar-width:none] overflow-x-auto overflow-y-hidden px-3 py-1">
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
      <Stage view={view} last={last.current} pass={pass} />
    </section>
  );
};

const interval = (p: Pair) => p.chaser.interval.replace(/^\+/, "");

const Stage = ({
  view,
  last,
  pass,
}: {
  view: View | null;
  last: Pair | null;
  pass: Pair | null;
}) => {
  if (view?.group) {
    const focus = pass ?? view.pair;
    const { pairs, more } = contenders(view.group, focus);
    return pairs.length > 1 ? (
      <Slices
        sides={[pairs[0]!.ahead, ...pairs.map((p) => p.chaser)].map((r) => ({
          id: r.tla,
          color: r.color,
          note: `P${r.position}`,
        }))}
        gaps={pairs.map(interval)}
        pass={pass ? pairs.indexOf(pass) : -1}
        more={more}
      />
    ) : (
      <Card
        pair={focus}
        center={pass ? "OVERTAKE" : interval(focus)}
        caption="Interval"
        alert={!!pass}
      />
    );
  }
  if (view)
    return (
      <Card
        pair={view.pair}
        center={lapsText(view.pair.laps).toUpperCase()}
        caption="Battle in"
        detail={[
          `+${view.pair.interval.toFixed(1)} s`,
          `−${view.pair.rate.toFixed(1)} s/lap`,
        ]}
        dim
      />
    );
  if (last)
    return (
      <Card pair={last} center={interval(last)} caption="Last battle" dim />
    );
  return (
    <div className="flex h-64 max-w-lg items-center justify-center rounded-xl bg-zinc-800/50 text-sm text-zinc-400 sm:h-80">
      No battle within 1 s
    </div>
  );
};
