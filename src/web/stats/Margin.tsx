import { logoSrc } from "../TeamLogo.tsx";
import type { Who } from "./derive.ts";

interface MarginProps {
  by: number;
  least: number;
  focus: string;
  rival: string;
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

export const Margin = ({
  by,
  least,
  focus,
  rival,
  who,
  prize,
  event,
}: MarginProps) => {
  const color = who.get(focus)?.color ?? "#888";
  return (
    <div
      className="font-f1 relative flex max-w-lg items-center gap-4 overflow-hidden rounded-xl px-4 py-3 text-white uppercase scheme-dark"
      style={{
        background: `repeating-linear-gradient(-62deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 9px), radial-gradient(circle at 85% 50%, color-mix(in srgb, ${color} 45%, transparent), transparent 65%), #15151e`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <Logo id={focus} className="size-7 shrink-0 sm:size-8" />
          <p className="text-[10px] leading-snug font-bold tracking-[0.15em] text-balance text-white/70 sm:text-xs">
            {who.get(focus)?.name ?? focus} secure {prize} at the {event} if
            they
          </p>
        </div>
        <p className="mt-2 text-2xl leading-none font-black sm:text-3xl">
          {by > 0 ? "Outscore" : "Trail"}
        </p>
        <p className="flex items-center gap-2 text-2xl leading-none font-black sm:text-3xl">
          <span
            style={{
              color: `color-mix(in srgb, ${who.get(rival)?.color ?? "#888"} 85%, white)`,
            }}
          >
            {who.get(rival)?.name ?? rival}
          </span>
          <Logo id={rival} className="size-6 sm:size-7" />
          by {by > 0 ? "" : "no more than"}
        </p>
        {least > 0 && (
          <p className="mt-2 text-[10px] font-bold tracking-[0.15em] text-white/70 sm:text-xs">
            and score at least {least} points
          </p>
        )}
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
};
