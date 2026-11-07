import { ink } from "../ink.ts";
import type { Fit } from "./towerFit.ts";
import { Cover } from "./TowerTyres.tsx";
import type { SessionBests } from "./view.ts";

interface SessionBestProps {
  bests: SessionBests;
  wide: boolean;
}

export const SessionBest = ({ bests, wide }: SessionBestProps) => (
  <>
    <span className="font-f1 tracking-wider text-zinc-500 uppercase">
      Session best
    </span>
    <div
      className={
        wide ? "contents" : "flex w-full flex-wrap justify-between text-[10px]"
      }
    >
      {[...bests.sectors, bests.lap].map((best, i) => (
        <span
          key={i}
          className={`flex items-center font-mono ${wide ? "gap-1.5" : "gap-0.5"}`}
        >
          <span className="text-zinc-500">{i === 3 ? "Lap" : `S${i + 1}`}</span>
          {best ? (
            <span
              className={`flex font-semibold ${wide ? "gap-[1ch]" : "gap-1"}`}
            >
              <span style={{ color: ink(best.color) }}>{best.tla}</span>
              <span className="text-purple">{best.value}</span>
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </span>
      ))}
    </div>
  </>
);

interface TowerHeadProps {
  race: boolean;
  cut: number | null;
  fit: Fit;
  tyres: boolean;
  children?: React.ReactNode;
}

export const TowerHead = ({
  race,
  cut,
  fit,
  tyres,
  children,
}: TowerHeadProps) => {
  const pad = fit.wide ? "px-2" : "px-1";
  const hide = tyres ? "invisible" : "";
  const cover = race ? hide : "";
  const stints = <Cover wide={fit.wide}>Stints</Cover>;
  const tyresCell = race || undefined;
  return (
    <thead className="text-left text-xs text-zinc-500">
      {children}
      <tr className="relative">
        <th className={`${pad} py-2 text-right`}>P</th>
        <th className={`${pad} py-2`}>Driver</th>
        {race && fit.wide && (
          <th
            className="px-2 py-2 text-right"
            title="Places gained or lost since the start"
          >
            +/−
          </th>
        )}
        <th
          className={`${pad} py-2 text-right`}
          title={cut ? `Gap to the time of P${cut}` : undefined}
        >
          {race ? "Gap" : cut ? "Cut" : "Diff"}
        </th>
        {fit.int && (
          <th data-tyres className={`${pad} py-2 text-right ${hide}`}>
            Int
          </th>
        )}
        {fit.last && (
          <th data-tyres className={`${pad} py-2 text-right ${hide}`}>
            Last
          </th>
        )}
        {fit.best && (
          <th data-tyres className={`${pad} py-2 text-right ${hide}`}>
            Best
          </th>
        )}
        {fit.sectors && (
          <th data-tyres className={`${pad} py-2 ${hide}`}>
            {tyres && stints}
            Sectors
          </th>
        )}
        {fit.tyre && (
          <th data-tyres={tyresCell} className={`${pad} py-2 ${cover}`}>
            {cover && stints}
            Tyre
          </th>
        )}
        {fit.pits && (
          <>
            <th
              data-tyres={tyresCell}
              className={`px-2 py-2 text-right ${cover}`}
            >
              Pits
            </th>
            <th
              data-tyres={tyresCell}
              className={`px-2 py-2 text-right ${cover}`}
              title="Stationary time of the last pit stop"
            >
              Stop
            </th>
          </>
        )}
        {fit.status && <th className="px-2 py-2" />}
      </tr>
    </thead>
  );
};
