import { Fragment, useMemo, useRef, useState } from "react";
import {
  clinchMatrix,
  constructorNeeds,
  earliestClinch,
  finishesAtLeast,
  finishesAtMost,
  isEliminated,
  maxGain,
  OUTSIDE,
  othersAfterWin,
  outscoreBy,
  settled,
  type Cell,
  type Championship,
  type Earliest,
  type Finish,
  type Standing,
  type Upcoming,
} from "../../shared/clinch.ts";
import { pointsFor } from "../../shared/points.ts";
import type { Season } from "../../shared/season.ts";
import { DriverHover } from "../DriverCard.tsx";
import { ink } from "../ink.ts";
import { Pick } from "../Pick.tsx";
import { TeamHover } from "../TeamCard.tsx";
import { Champion } from "./Champion.tsx";
import { Faceoff } from "./Faceoff.tsx";
import { Lineup } from "./Lineup.tsx";
import { Simulator } from "./Simulator.tsx";
import type { Who } from "./derive.ts";

interface TitleFightProps {
  champ: Championship;
  season: Season;
  table: Standing[];
  events: Upcoming[];
  who: Map<string, Who>;
}

const HOVER = { drivers: DriverHover, constructors: TeamHover };

const earliestText = (e: Earliest, events: Upcoming[], won: string): string =>
  e.state === "clinched"
    ? won
    : e.state === "eliminated"
      ? "Out of contention"
      : e.state === "last-race-only"
        ? "Only on a tie-break"
        : `${events[e.index]!.name} (round ${events[e.index]!.round})`;

interface MatrixProps {
  table: Standing[];
  events: Upcoming[];
  focus: string;
  rival: string;
  who: Map<string, Who>;
  prize: string;
}

const pos = (p: number | null) =>
  p === null ? "P11+ / DNF" : p === OUTSIDE ? "P11+" : `P${p}`;

const STYLE: Record<NonNullable<Cell>, string> = {
  clinched: "bg-emerald-600 font-semibold text-white",
  "rival-out": "bg-emerald-950 text-emerald-300",
  open: "bg-zinc-800/50 text-zinc-400",
};

const list = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
    : (items[0] ?? "");

const Matrix = ({ table, events, focus, rival, who, prize }: MatrixProps) => {
  const m = useMemo(
    () => clinchMatrix(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const limits = useMemo(
    () => othersAfterWin(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const code = (id: string) => who.get(id)?.code ?? id;
  const [a, b] = [code(focus), code(rival)];
  const states = new Set(m.cells.flat());
  const blocker = limits.find((l) => l.from === null);
  const gap =
    table.find((s) => s.id === focus)!.points -
    table.find((s) => s.id === rival)!.points;
  const margin = (mine: number | null, theirs: number) =>
    gap + pointsFor(events[0]!.kind, mine) - pointsFor(events[0]!.kind, theirs);
  const legend = {
    clinched: `${a} secures ${prize}`,
    "rival-out": `${b} is out, ${a} needs other results`,
    open: "Still open",
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        {`Each cell shows ${a}'s lead over ${b} after ${events[0]!.name}.${margin(null, 1) < 0 ? ` Negative numbers mean ${b} leads.` : ""}`}
      </p>
      <div className="grid max-w-lg grid-cols-[auto_auto_repeat(11,minmax(0,1fr))] gap-0.5 text-[11px] tracking-tight">
        <span className="col-span-2" />
        <span className="col-span-11 pb-1 text-center text-[10px] tracking-wider text-zinc-500 uppercase">
          {b} finish
        </span>
        <span className="col-start-1 row-span-12 row-start-2 rotate-180 pl-1 text-center text-[10px] tracking-wider text-zinc-500 uppercase [writing-mode:vertical-rl]">
          {a} finish
        </span>
        <span />
        {m.theirs.map((t) => (
          <span
            key={t}
            className="pb-0.5 text-center text-[10px] text-zinc-500"
          >
            {t === OUTSIDE ? "P11+" : `P${t}`}
          </span>
        ))}
        {m.mine.map((mine, i) => (
          <Fragment key={String(mine)}>
            <span className="flex items-center justify-end pr-1 text-[10px] text-zinc-500">
              {mine === null ? "P11+" : `P${mine}`}
            </span>
            {m.cells[i]!.map((c, j) => {
              const n = margin(mine, m.theirs[j]!);
              return (
                <span
                  key={j}
                  title={
                    c === null
                      ? "Same finish position"
                      : `${a} ${pos(mine)}, ${b} ${pos(m.theirs[j]!)}: ${n} points. ${legend[c]}.`
                  }
                  className={`tabular flex h-7 items-center justify-center rounded ${c === null ? "" : STYLE[c]}`}
                >
                  {c === null ? "" : n < 0 ? `−${-n}` : n}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {(["clinched", "rival-out", "open"] as const)
          .filter((k) => states.has(k))
          .map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm ${STYLE[k]}`} />
              {legend[k]}
            </span>
          ))}
      </div>
      <p className="text-sm text-zinc-400">
        {blocker
          ? `${a} cannot secure ${prize} at this event. Even if ${a} wins and ${code(blocker.id)} scores no points, ${code(blocker.id)} can still pass ${a} at later events.`
          : states.has("rival-out") && limits.length > 0
            ? `If ${a} wins, ${a} also needs ${list(limits.map((l) => `${code(l.id)} to finish P${l.from} or lower`))}.`
            : !states.has("clinched") &&
              `${a} cannot secure ${prize} at this event.`}
      </p>
    </div>
  );
};

const pts = (n: number) => `${n} ${n === 1 ? "pt" : "pts"}`;

const Places = ({ list, empty }: { list: Finish[]; empty: string }) => (
  <span className="flex flex-wrap gap-x-3 text-xs text-zinc-400">
    {list.length
      ? list.map((f) => (
          <span key={f.best} className="whitespace-nowrap">
            {f.other ? `P${f.best} + P${f.other}` : `P${f.best}`}
          </span>
        ))
      : empty}
  </span>
);

interface MarginProps {
  by: number;
  a: string;
  b: string;
  color: string;
  rivalColor: string;
  prize: string;
  event: string;
}

const Margin = ({ by, a, b, color, rivalColor, prize, event }: MarginProps) => (
  <div
    className="font-f1 relative flex max-w-lg items-center gap-4 overflow-hidden rounded-xl px-4 py-3 text-white uppercase scheme-dark"
    style={{
      background: `repeating-linear-gradient(-62deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 9px), radial-gradient(circle at 85% 50%, color-mix(in srgb, ${color} 45%, transparent), transparent 65%), #15151e`,
    }}
  >
    <div className="min-w-0 flex-1">
      <p className="text-[10px] leading-snug font-bold tracking-[0.15em] text-balance text-white/70 sm:text-xs">
        {a} secure {prize} at the {event} if they
      </p>
      <p className="mt-2 text-2xl leading-none font-black sm:text-3xl">
        {by > 0 ? "Outscore" : "Trail"}
      </p>
      <p className="text-2xl leading-none font-black sm:text-3xl">
        <span style={{ color: `color-mix(in srgb, ${rivalColor} 85%, white)` }}>
          {b}
        </span>{" "}
        by {by > 0 ? "" : "no more than"}
      </p>
    </div>
    <div className="flex flex-col items-center">
      <span
        className="tabular text-8xl leading-[0.8] font-black sm:text-9xl"
        style={{ color: `color-mix(in srgb, ${color} 85%, white)` }}
      >
        {Math.abs(by)}
      </span>
      <span className="mt-1 text-lg font-black tracking-wide">
        {Math.abs(by) === 1 ? "Point" : "Points"}
      </span>
    </div>
  </div>
);

const Needs = ({ table, events, focus, rival, who, prize }: MatrixProps) => {
  const all = useMemo(
    () => constructorNeeds(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const needs = all.filter(
    (n, i) => n.need !== null && n.need !== all[i - 1]?.need,
  );
  const by = outscoreBy(all);
  const [a, b] = [who.get(focus)?.name ?? focus, who.get(rival)?.name ?? rival];
  if (!needs.length)
    return (
      <p className="text-sm text-zinc-400">
        {a} cannot secure {prize} at {events[0]!.name}.
      </p>
    );
  return (
    <div>
      {by !== null && (
        <Margin
          by={by}
          a={a}
          b={b}
          color={who.get(focus)?.color ?? "#888"}
          rivalColor={who.get(rival)?.color ?? "#888"}
          prize={prize}
          event={events[0]!.name}
        />
      )}
      <p className="my-2 text-sm text-zinc-400">
        The points {a} need at {events[0]!.name} to secure {prize} there, for
        each score of {b}. This assumes that every other team can still score
        the maximum. The finishes show the best results for {b} and the worst
        results for {a} that give those points. A single position means that the
        other car scores no points.
      </p>
      <table className="tabular w-full text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="w-1/2 py-1 pr-4">{b} at most</th>
            <th className="w-1/2 py-1">{a} at least</th>
          </tr>
        </thead>
        <tbody>
          {needs.map((n) => (
            <tr key={n.rival} className="border-t border-zinc-800 align-top">
              <td className="py-1.5 pr-4">
                {pts(n.rival)}
                <Places
                  list={finishesAtMost(events[0]!.kind, n.rival)}
                  empty="No points"
                />
              </td>
              <td className="py-1.5">
                <span className="font-semibold text-emerald-400">
                  {pts(n.need!)}
                </span>
                <Places
                  list={n.need ? finishesAtLeast(events[0]!.kind, n.need) : []}
                  empty="Any finish"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface PickersProps {
  label: string;
  alive: string[];
  focus: string;
  rival: string;
  who: Map<string, Who>;
  onFocus: (id: string) => void;
  onRival: (id: string) => void;
}

const Pickers = ({
  label,
  alive,
  focus,
  rival,
  who,
  onFocus,
  onRival,
}: PickersProps) =>
  alive.length > 2 && (
    <div className="grid max-w-lg grid-cols-2 gap-3">
      <Pick
        label={label}
        value={focus}
        ids={alive}
        who={who}
        onChange={onFocus}
      />
      <Pick
        label="Against"
        value={rival}
        ids={alive.filter((id) => id !== focus)}
        who={who}
        onChange={onRival}
      />
    </div>
  );

export const TitleFight = ({
  champ,
  season,
  table: full,
  events,
  who,
}: TitleFightProps) => {
  const done = useMemo(
    () => settled(full, events, champ),
    [full, events, champ],
  );
  const table = full.slice(done);
  const place = done ? `P${done + 1}` : "";
  const prize = place || "the title";
  const alive = table
    .filter((s) => !isEliminated(table, events, s.id, champ))
    .map((s) => s.id);
  const [focus, setFocus] = useState(alive[0] ?? "");
  const [picked, setRival] = useState(alive[1] ?? "");
  const rival =
    picked !== focus ? picked : (alive.find((id) => id !== focus) ?? "");
  const gain = maxGain(events, champ);
  const fight = events.length > 0 && table.length > 1;
  const nextRef = useRef<HTMLHeadingElement>(null);
  const Hover = HOVER[champ];
  return (
    <div className="space-y-4">
      {done > 0 && (
        <Champion
          champ={champ}
          season={season}
          table={full}
          who={who}
          next={fight ? place : undefined}
          onNext={() =>
            nextRef.current?.scrollIntoView({
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            })
          }
        />
      )}
      {!done && !events.length && (
        <p className="text-zinc-400">The season is over.</p>
      )}
      {done > 0 && fight && (
        <h2
          ref={nextRef}
          className="font-f1 scroll-mt-3 px-1 pt-2 text-lg font-bold"
        >
          The fight for {place}
        </h2>
      )}
      {fight && (
        <>
          <section className="bg-surface rounded-xl p-3">
            <h2 className="font-f1 mb-1 text-xs tracking-wider text-zinc-400 uppercase">
              {place ? `Who can still finish ${place}` : "Who can still win"}
            </h2>
            <p className="mb-2 text-sm text-zinc-500">
              {gain} points remain across {events.length} events. The earliest
              decider assumes that the driver wins every event and that no rival
              scores.
            </p>
            <Lineup
              champ={champ}
              table={table}
              field={alive}
              who={who}
              gain={gain}
            />
            <div className="tabular -mx-2 grid grid-cols-[auto_auto_auto_1fr] text-sm *:col-span-full *:grid *:grid-cols-subgrid *:items-center *:px-2 *:py-1">
              <div className="text-xs font-bold text-zinc-500">
                <span />
                <span className="pl-3 text-right">Points</span>
                <span className="pl-3 text-right">Max</span>
                <span className="pl-4">Earliest {place || "title"}</span>
              </div>
              {table.slice(0, 10).map((s) => (
                <Hover
                  key={s.id}
                  id={s.id}
                  className={`cursor-default border-t border-zinc-800 hover:bg-zinc-800/60 ${alive.includes(s.id) ? "" : "text-zinc-600"}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-1 rounded-sm"
                      style={{ background: ink(who.get(s.id)?.color) }}
                    />
                    {who.get(s.id)?.name ?? s.id}
                  </span>
                  <span className="pl-3 text-right">{s.points}</span>
                  <span className="pl-3 text-right">{s.points + gain}</span>
                  <span className="pl-4">
                    {earliestText(
                      earliestClinch(table, events, s.id, champ),
                      events,
                      place || "Champion",
                    )}
                  </span>
                </Hover>
              ))}
            </div>
          </section>
          {alive.length > 1 && (
            <section className="bg-surface space-y-3 rounded-xl p-3">
              <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
                What it takes at {events[0]!.name}
              </h2>
              <Faceoff
                focus={focus}
                rival={rival}
                table={table}
                who={who}
                gain={gain}
                cars={champ === "constructors"}
              />
              <Pickers
                label={place ? `${place} for` : "Title for"}
                alive={alive}
                focus={focus}
                rival={rival}
                who={who}
                onFocus={setFocus}
                onRival={setRival}
              />
              {champ === "drivers" ? (
                <Matrix
                  table={table}
                  events={events}
                  focus={focus}
                  rival={rival}
                  who={who}
                  prize={prize}
                />
              ) : (
                <Needs
                  table={table}
                  events={events}
                  focus={focus}
                  rival={rival}
                  who={who}
                  prize={prize}
                />
              )}
            </section>
          )}
          <Simulator
            champ={champ}
            table={table}
            events={events}
            contenders={alive}
            who={who}
            prize={prize}
            settled={done}
          />
        </>
      )}
    </div>
  );
};
