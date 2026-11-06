import { Trophy } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ChampionMark, GOLD } from "./stats/Champion.tsx";
import { logoSrc, TeamLogo } from "./TeamLogo.tsx";

export const solid = (color: string, scale = 1) =>
  `oklch(from ${color} calc(min(l, 0.66) * ${scale}) c h)`;

const SHINE: CSSProperties = {
  background:
    "linear-gradient(105deg, transparent 40%, rgb(254 240 138 / 0.25) 50%, transparent 60%) 0 0 / 300% 100%",
  animation: "champion-shine 6s ease-in-out infinite",
};

interface ShellProps {
  color: string;
  team: string;
  title: string;
  subtitle?: ReactNode;
  place?: number;
  crown?: string;
  art: ReactNode;
  children: ReactNode;
}

export const Shell = ({
  color,
  team,
  title,
  subtitle,
  place,
  crown,
  art,
  children,
}: ShellProps) => (
  <div
    className={`relative -m-3 ${crown ? "after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-2 after:ring-[#d4af37] after:ring-inset" : ""}`}
  >
    <div
      className="relative h-35 overflow-hidden px-3 pt-3 text-white"
      style={{
        background: `linear-gradient(135deg, ${solid(color)}, ${solid(color, 0.65)})`,
      }}
    >
      {logoSrc(team) && (
        <img
          src={logoSrc(team)}
          alt=""
          className="absolute top-1.5 left-1/2 h-35 w-60 -translate-x-1/2 object-contain opacity-15"
        />
      )}
      {crown && <span className="absolute inset-0" style={SHINE} />}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-f1 block text-xl leading-tight font-bold italic">
            {title}
          </span>
          {crown && (
            <span className="font-f1 mt-1 flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] text-[#ebd08a] uppercase">
              <Trophy aria-hidden className="size-3" />
              {crown}
            </span>
          )}
          {subtitle}
        </div>
        {place !== undefined && (
          <span
            className={`font-f1 text-3xl leading-none font-black italic ${crown ? "bg-clip-text pr-1 text-transparent" : ""}`}
            style={crown ? { backgroundImage: GOLD } : undefined}
          >
            P{place + 1}
          </span>
        )}
      </div>
      {art}
    </div>
    {children}
  </div>
);

interface Row {
  id: string;
  team: string;
  name: string;
  points: number;
}

interface SnippetProps {
  rows: Row[];
  self: string;
  champion: boolean;
}

export const Snippet = ({ rows, self, champion }: SnippetProps) => {
  const place = rows.findIndex((r) => r.id === self);
  const start = Math.max(place - 3, 0);
  const mine = rows[place]!.points;
  return (
    <ol className="tabular mt-3 text-xs first:mt-0">
      {rows.slice(start, place + 4).map((r, i) => {
        const n = start + i;
        const far = Math.abs(n - place);
        const up = n < place;
        return (
          <li
            key={r.id}
            className={
              far > 2
                ? `flex h-3 overflow-hidden opacity-30 ${up ? "items-end" : "items-start"}`
                : far > 1
                  ? "opacity-40"
                  : ""
            }
            style={
              far > 2
                ? {
                    maskImage: `linear-gradient(to ${up ? "top" : "bottom"}, #000, transparent)`,
                  }
                : undefined
            }
          >
            <div
              className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 ${r.id === self ? "bg-zinc-800" : ""}`}
            >
              <span className="font-f1 flex w-4 justify-end font-bold">
                {champion && !n ? <ChampionMark /> : n + 1}
              </span>
              <TeamLogo team={r.team} className="h-3.5 w-5 shrink-0" />
              <span className="truncate">{r.name}</span>
              <span className={`ml-auto ${r.id === self ? "font-bold" : ""}`}>
                {r.points}
              </span>
              <span className="w-9 text-right text-zinc-400">
                {r.id !== self &&
                  `${r.points >= mine ? "+" : "−"}${Math.abs(r.points - mine)}`}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
