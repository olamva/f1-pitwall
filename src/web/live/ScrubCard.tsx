import { EyeOff, Settings } from "lucide-react";
import type { ScrubPoint } from "../../shared/timing.ts";
import { useJson } from "../api.ts";
import { GlassSwitch } from "../GlassSwitch.tsx";
import { Face } from "../Podium.tsx";
import { setScrubAhead, useScrubAhead } from "../scrubAhead.ts";
import { clock } from "./ReplayBar.tsx";
import { gapSeconds } from "./view.ts";

const FLAGS: Record<string, [string, string]> = {
  "1": ["Green", "bg-green-500 text-black"],
  "2": ["Yellow", "bg-yellow-400 text-black"],
  "4": ["Safety car", "bg-yellow-400 text-black"],
  "5": ["Red flag", "bg-red-600 text-white"],
  "6": ["VSC", "bg-yellow-400 text-black"],
  "7": ["VSC ending", "bg-yellow-300 text-black"],
};

interface ScrubCardProps {
  url: string;
  t: number;
  at: number;
  start: number;
  starts: number[];
}

export const ScrubCard = ({ url, t, at, start, starts }: ScrubCardProps) => {
  const points = useJson<ScrubPoint[]>(url).data;
  const saved = useScrubAhead();
  const ahead = t > at;
  const show = !ahead || saved;
  const point = points?.findLast((p) => p.t <= t);
  const flag = show && point?.status ? FLAGS[point.status] : undefined;
  const time = clock(t - start);
  const lap =
    Math.max(
      0,
      starts.findLastIndex((s) => s <= t),
    ) + 1;
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-f1 text-[15px] font-extrabold italic">
          {starts.length ? `Lap ${lap} / ${starts.length}` : time}
        </p>
        {flag && (
          <span
            className={`rounded px-1.5 text-[11px] font-extrabold uppercase ${flag[1]}`}
          >
            {flag[0]}
          </span>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">
        {starts.length ? `${time} into the race` : "Into the session"}
      </p>
      {show ? (
        <ol className="mt-1">
          {point?.order.map((d, i) => (
            <li
              key={d.tla}
              className="flex items-center gap-2.5 border-t border-zinc-800 py-1.5 first:border-0"
            >
              <span className="font-f1 w-3.5 font-black">{i + 1}</span>
              <Face id={d.tla} color={d.color} size="size-7" />
              <span className="text-[13px] font-bold">{d.tla}</span>
              <span className="tabular ml-auto text-xs text-zinc-400">
                {i === 0
                  ? "Leader"
                  : gapSeconds(d.gap)
                    ? `+${gapSeconds(d.gap)!.toFixed(1)}`
                    : d.gap}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex flex-col items-center gap-1.5 pt-3.5 pb-1.5 text-xs text-zinc-400">
          <EyeOff aria-hidden="true" className="size-5.5 text-red-500" />
          This point is ahead of the replay.
        </p>
      )}
      {ahead && (
        <div className="mt-2 rounded-lg bg-zinc-800 px-2.5 py-2 [&>label]:flex-row-reverse [&>label]:justify-between">
          <GlassSwitch checked={show} onChange={setScrubAhead}>
            <span>
              <span className="block text-xs font-semibold">
                Show the order ahead
              </span>
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Settings aria-hidden="true" className="size-3" />
                Saved in Settings
              </span>
            </span>
          </GlassSwitch>
        </div>
      )}
    </>
  );
};
