import type { Margin as Gap } from "../../shared/clinch.ts";
import { logoSrc } from "../TeamLogo.tsx";
import type { Who } from "./derive.ts";

interface MarginProps {
  margins: Gap[];
  focus: string;
  who: Map<string, Who>;
  prize: string;
  event: string;
}

const Logo = ({ id, className }: { id: string; className: string }) => (
  <img
    src={logoSrc(id)}
    alt=""
    className={`object-contain drop-shadow-[0_1px_3px_rgb(0_0_0_/_0.6)] ${className}`}
  />
);

const tint = (color = "#888") => `color-mix(in srgb, ${color} 85%, white)`;

export const Margin = ({ margins, focus, who, prize, event }: MarginProps) => {
  const color = who.get(focus)?.color ?? "#888";
  const name = (id: string) => who.get(id)?.name ?? id;
  return (
    <div
      className="font-f1 max-w-lg rounded-xl px-4 pt-3 pb-1 text-white uppercase scheme-dark"
      style={{
        background: `repeating-linear-gradient(-62deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 9px), radial-gradient(circle at 90% 50%, color-mix(in srgb, ${color} 40%, transparent), transparent 70%), #15151e`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <Logo id={focus} className="size-7 shrink-0 sm:size-8" />
        <p className="text-[10px] leading-snug font-bold tracking-[0.15em] text-balance text-white/70 sm:text-xs">
          {name(focus)} secure {prize} at the {event} if they
        </p>
      </div>
      <ul className="mt-2 divide-y divide-white/10">
        {margins.map(({ id, by }) => (
          <li key={id} className="flex items-center gap-3 py-2.5">
            <Logo id={id} className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xl leading-none font-black sm:text-2xl"
                style={{ color: tint(who.get(id)?.color) }}
              >
                {name(id)}
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.15em] text-white/60 sm:text-xs">
                {by > 0 ? "Outscore by at least" : "Trail by at most"}
              </p>
            </div>
            <p className="flex items-baseline gap-1">
              <span
                className="tabular min-w-[2ch] text-right text-5xl leading-none font-black sm:text-6xl"
                style={{ color: tint(color) }}
              >
                {Math.abs(by)}
              </span>
              <span className="text-xs font-black">pts</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
