import { useState, type PointerEvent } from "react";
import { Flag } from "../Flag.tsx";
import { GlassSeek } from "../GlassSeek.tsx";

export type PaceEvent = {
  round: number;
  kind: "race" | "sprint";
  name: string;
  country?: string;
};

interface PaceSeekProps {
  events: PaceEvent[];
  value: number;
  onChange: (i: number) => void;
  onCommit: (i: number) => void;
}

const HALF = 112;
const at = (f: number) => `calc(14px + (100% - 28px) * ${f})`;

export const kindLabel = (e: PaceEvent) =>
  e.kind === "sprint" ? "Sprint" : "Race";

export const PaceSeek = ({
  events,
  value,
  onChange,
  onCommit,
}: PaceSeekProps) => {
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, events.length - 1);
  const shown = held ? value : hover;
  const tip = shown === null ? undefined : events[shown];
  const release = (e: PointerEvent<HTMLInputElement>) => {
    if (held) onCommit(Number(e.currentTarget.value));
    setHeld(false);
  };
  return (
    <div className="relative" onPointerLeave={() => setHover(null)}>
      {tip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%-6px)] z-20 transition-[left,opacity,scale] duration-150 ease-out starting:scale-90 starting:opacity-0"
          style={{
            left: `clamp(${HALF - 12}px, ${at(shown! / max)}, calc(100% - ${HALF - 12}px))`,
            translate: "-50% 0",
          }}
        >
          <div className="bg-surface w-56 rounded-lg px-2.5 py-1.5 shadow-xl ring-1 ring-zinc-700">
            <p className="truncate text-[13px] font-semibold">
              <Flag country={tip.country} />
              {tip.name}
            </p>
            <p className="tabular flex justify-between text-[11px] text-zinc-400">
              <span>Round {tip.round}</span>
              <span
                className={tip.kind === "sprint" ? "text-amber-300" : undefined}
              >
                {kindLabel(tip)}
              </span>
            </p>
          </div>
        </div>
      )}
      <GlassSeek
        progress={value / max}
        held={held}
        onHover={(_, f) => setHover(Math.round(f * max))}
        aria-label="Race"
        aria-valuetext={
          events[value] && `${events[value].name} ${kindLabel(events[value])}`
        }
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={events.length < 2}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setHeld(true);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyUp={(e) => onCommit(Number(e.currentTarget.value))}
      >
        {events.map((e, i) => (
          <span
            key={`${e.round}${e.kind}`}
            aria-hidden="true"
            className={`absolute top-[29px] w-px -translate-x-1/2 ${e.kind === "sprint" ? "h-1 bg-amber-300/70" : "h-1.5 bg-zinc-600"}`}
            style={{ left: at(i / max) }}
          />
        ))}
      </GlassSeek>
    </div>
  );
};
