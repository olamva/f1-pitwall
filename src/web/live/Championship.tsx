import { Trophy } from "lucide-react";
import { useRef, useState } from "react";
import type { Championship as Champ } from "../../shared/clinch.ts";
import { Swipe } from "../Swipe.tsx";
import { Tabs } from "../Tabs.tsx";
import { TeamLogo } from "../TeamLogo.tsx";
import { Panel } from "./Panels.tsx";
import type { Standing } from "./prediction.ts";

const CHAMPS = ["drivers", "constructors"] as const;

const CHAMPION: Record<Champ, string> = {
  drivers: "World Champion",
  constructors: "Constructors' Champion",
};

interface TableProps {
  champ: Champ;
  standing: Standing;
}

const Table = ({ champ, standing: { rows, title } }: TableProps) => {
  const crowned = title !== "open" && rows[0];
  return (
    <div className="min-w-0">
      <h3 className="font-f1 mb-2 text-xs tracking-wider text-zinc-400 uppercase max-md:hidden">
        {champ}
      </h3>
      {crowned && (
        <p className="mb-2 flex items-center gap-2 rounded-lg bg-amber-950 px-3 py-2 text-sm font-semibold text-amber-100">
          <Trophy aria-hidden className="size-4 shrink-0 text-yellow-300" />
          {crowned.name} {title === "decided" ? "is" : "will be"}{" "}
          {CHAMPION[champ]}
        </p>
      )}
      <table className="tabular w-full font-mono text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="px-2 py-1 text-right">P</th>
            <th className="px-2 py-1">
              {champ === "drivers" ? "Driver" : "Team"}
            </th>
            <th
              className="px-2 py-1 text-right"
              title="Places gained or lost in the championship"
            >
              +/−
            </th>
            <th className="px-2 py-1 text-right">Pts</th>
            <th
              className="px-2 py-1 text-right"
              title="Points from this session"
            >
              +Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id} className="border-t border-zinc-800">
              <td className="px-2 py-1 text-right text-zinc-400">
                {crowned && !i ? (
                  <Trophy
                    aria-label="Champion"
                    className="ml-auto size-4 text-yellow-300"
                  />
                ) : (
                  d.position
                )}
              </td>
              <td className="px-2 py-1">
                <span className="flex items-center gap-2">
                  <TeamLogo team={d.team} className="h-4 w-6 shrink-0" />
                  <span className="truncate font-semibold" title={d.name}>
                    {d.tla}
                  </span>
                </span>
              </td>
              <td
                className={`px-2 py-1 text-right ${d.gained ? (d.gained > 0 ? "text-emerald-400" : "text-red-500") : "text-zinc-500"}`}
              >
                {d.gained
                  ? `${d.gained > 0 ? "▲" : "▼"}${Math.abs(d.gained)}`
                  : "–"}
              </td>
              <td className="px-2 py-1 text-right">{d.points}</td>
              <td
                className={`px-2 py-1 text-right ${d.gain ? "text-emerald-400" : "text-zinc-500"}`}
              >
                {d.gain ? `+${d.gain}` : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ChampionshipProps {
  standings: Record<Champ, Standing>;
}

export const Championship = ({ standings }: ChampionshipProps) => {
  const [champ, setChamp] = useState<Champ>("drivers");
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const items = standings.constructors.rows.length
    ? CHAMPS
    : CHAMPS.slice(0, 1);
  const table = (c: Champ) => (
    <div className="grid">
      {items.map((x) => (
        <div
          key={x}
          className={`col-start-1 row-start-1 ${x === c ? "" : "invisible"}`}
        >
          <Table champ={x} standing={standings[x]} />
        </div>
      ))}
    </div>
  );
  return (
    <Panel title="Live championship" className="col-span-full">
      {items.length > 1 && (
        <div className="mb-3 md:hidden">
          <Tabs
            items={items}
            value={champ}
            onChange={setChamp}
            small
            stretch
            drive={blob}
          />
        </div>
      )}
      <div className="md:hidden">
        <Swipe
          items={items}
          value={items.length > 1 ? champ : "drivers"}
          onChange={setChamp}
          keep={items}
          drive={blob}
          render={table}
        />
      </div>
      <div className="grid grid-cols-2 gap-6 max-md:hidden">
        {items.map((c) => (
          <Table key={c} champ={c} standing={standings[c]} />
        ))}
      </div>
    </Panel>
  );
};
