import { useState, type ReactNode } from "react";
import { Hint } from "./Hint.tsx";
import type {
  LapPositions,
  Practice,
  Qualifying,
  RaceArchive,
  Stints,
} from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import type { FastestLaps } from "../shared/timing.ts";
import { useJson } from "./api.ts";
import { DriverHover } from "./DriverCard.tsx";
import { useTeamRow } from "./favourite.ts";
import { LapCompare } from "./LapCompare.tsx";
import { Loading } from "./Loading.tsx";
import { openDriver } from "./path.ts";
import { gained, Podium, PodiumList, type PodiumEntry } from "./Podium.tsx";
import { Positions } from "./Positions.tsx";
import { Strategy } from "./Strategy.tsx";
import { Tabs } from "./Tabs.tsx";
import { TeamHover } from "./TeamCard.tsx";
import { TeamLogo } from "./TeamLogo.tsx";

export const SESSIONS = [
  "fp1",
  "fp2",
  "fp3",
  "sprintQualifying",
  "sprint",
  "qualifying",
  "race",
] as const;
export type Kind = (typeof SESSIONS)[number];
const VIEWS = ["results", "tyres", "positions", "compare"] as const;
type View = (typeof VIEWS)[number];

type Race = RaceArchive["races"][number];
type Result = Race["results"][number];
type Entry = Pick<Result, "driver" | "name" | "team" | "positionText">;

const CODES: Record<string, string> = {
  R: "DNF",
  D: "DSQ",
  E: "EXC",
  W: "DNS",
  F: "DNQ",
  N: "NC",
};

const entrants = (races: Race[], round: number) =>
  new Map(
    races
      .filter((race) => race.round <= round)
      .toReversed()
      .flatMap((race) => [...race.sprint, ...race.results])
      .map((result) => [result.number, result]),
  );

type Known = ReturnType<typeof entrants>;

const podium = <T extends Entry>(
  rows: T[],
  value: (row: T) => ReactNode,
): PodiumEntry[] =>
  rows.map((row) => ({
    id: row.driver,
    name: row.name,
    color: teamColor(row.team),
    value: value(row),
    team: row.team,
  }));

const points = (result: Result) => `${result.points} pts`;

const qualifyingUrl = (year: string, round: number, kind: Kind) =>
  `/api/qualifying/${year}/${round}/${kind === "qualifying" ? "race" : "sprint"}`;

const qualifyingRows = (data: Qualifying, known: Known) =>
  data.map(({ number, position, times }) => ({
    driver: "",
    name: `#${number}`,
    team: "",
    teamName: "",
    ...known.get(number),
    positionText: String(position),
    times,
  }));

const best = (row: { times: (string | null)[] }) =>
  row.times.findLast(Boolean) ?? "";

const practiceRows = (data: Practice, known: Known) => {
  const teams = new Map(
    data.flatMap((row) => {
      const entrant = known.get(row.number);
      return entrant ? [[row.team, entrant] as const] : [];
    }),
  );
  return data.map(({ number, position, name, team, ...row }) => ({
    driver: "",
    name,
    team: teams.get(team)?.team ?? "",
    ...known.get(number),
    positionText: String(position),
    ...row,
  }));
};

const lap = (row: { time: string | null }) => row.time ?? "";
const BADGE = "relative z-10 mr-1.5 inline-block align-[-3px] sm:mr-2";

interface ResultsTableProps<T extends Entry> {
  rows: T[];
  favourite?: string;
  columns: string[];
  cells: (row: T) => ReactNode;
}

const ResultsTable = <T extends Entry>({
  rows,
  favourite,
  columns,
  cells,
}: ResultsTableProps<T>) => {
  const teamRow = useTeamRow("before:bg-sky-500/15");
  return (
    <table className="tabular w-full text-xs sm:text-sm">
      <thead className="text-left text-xs text-zinc-500">
        <tr>
          <th className="w-8 pb-2">Pos</th>
          <th className="pb-2">Driver</th>
          {columns.map((column) => (
            <th key={column} className="pb-2 pl-2 text-right">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(rows.length >= 3 ? rows.slice(3) : rows).map((row, index) => (
          <tr
            key={`${row.driver}:${index}`}
            className={`relative isolate border-t border-zinc-800 ${row.driver === favourite ? "featured-row" : ""}`}
          >
            <td className="py-2 font-semibold">
              {CODES[row.positionText] ?? row.positionText}
            </td>
            <td className="py-2">
              <DriverHover id={row.driver} className="w-fit">
                <button
                  type="button"
                  onClick={() => openDriver(row.driver)}
                  disabled={!row.driver}
                  className={`cursor-pointer text-left before:absolute before:-inset-x-3 before:inset-y-0 before:-z-10 after:absolute after:inset-0 hover:before:bg-zinc-800/50 disabled:cursor-default sm:before:-inset-x-4 ${row.driver === favourite ? "light:before:from-[#e10600] light:before:via-[#b91c1c] light:before:to-[#7f1d1d] before:bg-gradient-to-r before:from-red-700/40 before:to-transparent" : teamRow(row.team)}`}
                >
                  <TeamHover id={row.team} className={BADGE}>
                    <TeamLogo team={row.team} className="block h-4 w-6" />
                  </TeamHover>
                  {row.name}
                </button>
              </DriverHover>
            </td>
            {cells(row)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface ClassificationProps<T extends Entry> extends ResultsTableProps<T> {
  value: (row: T) => string;
}

const Classification = <T extends Entry>({
  value,
  ...table
}: ClassificationProps<T>) => (
  <>
    {table.rows.length >= 3 && (
      <Podium entries={podium(table.rows, value)} onSelect={openDriver} />
    )}
    <ResultsTable {...table} />
  </>
);

const describe = ({ status, positionText }: Result) => {
  const laps = /^\+(\d+) Laps?$/.exec(status)?.[1];
  if (status === "Finished") return "";
  if (laps) return `${laps} ${laps === "1" ? "lap" : "laps"} down`;
  if (positionText !== "R" || status === "Retired") return status;
  return status === "Lapped" ? "Not classified" : `Retired: ${status}`;
};

const raceCells = (result: Result) => {
  const status = describe(result);
  return (
    <>
      <td className="py-2 pl-2 text-right text-zinc-400 sm:max-w-48 sm:truncate">
        <Hint label={status} className="sm:truncate">
          {status}
        </Hint>
      </td>
      <td className="py-2 pl-2 text-right font-semibold">
        {result.points || "–"}
      </td>
    </>
  );
};

interface RaceBodyProps {
  year: string;
  round: number;
  kind: "race" | "sprint";
  rows: Result[];
  favourite?: string;
  shown: View;
}

const RaceBody = ({
  year,
  round,
  kind,
  rows,
  favourite,
  shown,
}: RaceBodyProps) => {
  const strategy = useJson<Stints>(
    shown === "tyres" ? `/api/stints/${year}/${round}/${kind}` : null,
  );
  const positions = useJson<LapPositions>(
    shown === "positions" ? `/api/positions/${year}/${round}/${kind}` : null,
  );
  return shown === "tyres" ? (
    strategy.data ? (
      <Strategy rows={rows} stints={strategy.data} favourite={favourite} />
    ) : (
      <Loading
        label="Loading tyre strategy…"
        error={strategy.error && "Tyre data is not available for this session."}
      />
    )
  ) : shown === "positions" ? (
    positions.data ? (
      <Positions rows={rows} laps={positions.data} favourite={favourite} />
    ) : (
      <Loading
        label="Loading positions…"
        error={
          positions.error && "Position data is not available for this session."
        }
      />
    )
  ) : (
    <Classification
      key={`${round}:${kind}`}
      rows={rows}
      favourite={favourite}
      columns={["", "Pts"]}
      cells={raceCells}
      value={points}
    />
  );
};

interface QualifyingBodyProps {
  year: string;
  race: Race;
  races: Race[];
  kind: "qualifying" | "sprintQualifying";
  favourite?: string;
}

const QualifyingBody = ({
  year,
  race,
  races,
  kind,
  favourite,
}: QualifyingBodyProps) => {
  const quali = useJson<Qualifying>(qualifyingUrl(year, race.round, kind));
  if (!quali.data)
    return (
      <Loading
        label="Loading qualifying results…"
        error={
          quali.error &&
          "Qualifying results are not available for this session."
        }
      />
    );
  const prefix = kind === "qualifying" ? "Q" : "SQ";
  return (
    <Classification
      rows={qualifyingRows(quali.data, entrants(races, race.round))}
      favourite={favourite}
      columns={[1, 2, 3].map((part) => `${prefix}${part}`)}
      cells={(row) =>
        row.times.map((time, part) => (
          <td key={part} className="py-2 pl-2 text-right text-zinc-400">
            {time ?? "–"}
          </td>
        ))
      }
      value={best}
    />
  );
};

interface PracticeBodyProps {
  year: string;
  race: Race;
  races: Race[];
  kind: "fp1" | "fp2" | "fp3";
  favourite?: string;
}

const PracticeBody = ({
  year,
  race,
  races,
  kind,
  favourite,
}: PracticeBodyProps) => {
  const practice = useJson<Practice>(
    `/api/practice/${year}/${race.round}/${kind}`,
  );
  if (!practice.data)
    return (
      <Loading
        label="Loading practice results…"
        error={
          practice.error &&
          "Practice results are not available for this session."
        }
      />
    );
  return (
    <Classification
      rows={practiceRows(practice.data, entrants(races, race.round))}
      favourite={favourite}
      columns={["Time", "Gap", "Laps"]}
      cells={(row) => (
        <>
          <td className="py-2 pl-2 text-right font-semibold">
            {row.time ?? "–"}
          </td>
          <td className="py-2 pl-2 text-right text-zinc-400">{row.gap}</td>
          <td className="py-2 pl-2 text-right text-zinc-400">{row.laps}</td>
        </>
      )}
      value={lap}
    />
  );
};

const LAP = /^(\d+):(\d\d\.\d+)$/;
const clock = (v: ReactNode): v is string =>
  typeof v === "string" && LAP.test(v);

const seconds = (time: string) => {
  const [, minutes, rest] = LAP.exec(time) ?? [];
  return Number(minutes) * 60 + Number(rest);
};

const gap = (entry: PodiumEntry, leader: PodiumEntry, index: number) =>
  index && clock(entry.value) && clock(leader.value)
    ? {
        ...entry,
        value: `+${(seconds(entry.value) - seconds(leader.value)).toFixed(3)}`,
      }
    : entry;

interface SessionPodiumProps {
  year: string;
  round: number;
  races: Race[];
  kind: Kind;
  past?: boolean;
}

export const SessionPodium = ({
  year,
  round,
  races,
  kind,
  past,
}: SessionPodiumProps) => {
  const timed = kind === "qualifying" || kind === "sprintQualifying";
  const practiced = kind.startsWith("fp");
  const quali = useJson<Qualifying>(
    timed ? qualifyingUrl(year, round, kind) : null,
  );
  const practice = useJson<Practice>(
    practiced ? `/api/practice/${year}/${round}/${kind}` : null,
  );
  const known = entrants(races, round);
  const race = races.find((entry) => entry.round === round);
  const top = timed
    ? quali.data && podium(qualifyingRows(quali.data, known), best)
    : practiced
      ? practice.data && podium(practiceRows(practice.data, known), lap)
      : race &&
        podium(kind === "sprint" ? race.sprint : race.results, (r) =>
          past && kind === "race" ? gained(r, "–") : r.time || r.status,
        );
  const rows = top?.map((e, i, all) => gap(e, all[0]!, i));
  return (rows ? rows.length < 3 : quali.error || practice.error) ? (
    <p className="py-8 text-center text-xs text-zinc-400">
      Results are not available.
    </p>
  ) : (
    <PodiumList entries={rows} faded={past} />
  );
};

interface CompareProps {
  year: string;
  round: number;
  kind: Kind;
}

const Compare = ({ year, round, kind }: CompareProps) => {
  const laps = useJson<FastestLaps>(`/api/fastest/${year}/${round}/${kind}`);
  return laps.data ? (
    <LapCompare
      outline={laps.data.outline}
      drivers={laps.data.drivers.map((d) => ({ ...d, time: d.lap.time }))}
    />
  ) : (
    <Loading
      error={laps.error && "Lap telemetry is not available for this session."}
    />
  );
};

interface SessionResultsProps {
  year: string;
  race: Race;
  races: Race[];
  kind: Kind;
  favourite?: string;
}

export const SessionResults = ({
  year,
  race,
  races,
  kind,
  favourite,
}: SessionResultsProps) => {
  const [view, setView] = useState<View>("results");
  const racing = kind === "race" || kind === "sprint";
  const views =
    Number(year) >= 2018
      ? VIEWS.filter((v) => racing || v === "results" || v === "compare")
      : [];
  const shown = views.includes(view) ? view : "results";
  return (
    <>
      {views.length > 0 && (
        <div className="mb-4">
          <Tabs items={views} value={shown} onChange={setView} small />
        </div>
      )}
      {shown === "compare" ? (
        <Compare year={year} round={race.round} kind={kind} />
      ) : racing ? (
        <RaceBody
          year={year}
          round={race.round}
          kind={kind}
          rows={kind === "sprint" ? race.sprint : race.results}
          favourite={favourite}
          shown={shown}
        />
      ) : kind === "qualifying" || kind === "sprintQualifying" ? (
        <QualifyingBody
          key={`${race.round}:${kind}`}
          year={year}
          race={race}
          races={races}
          kind={kind}
          favourite={favourite}
        />
      ) : (
        <PracticeBody
          key={`${race.round}:${kind}`}
          year={year}
          race={race}
          races={races}
          kind={kind}
          favourite={favourite}
        />
      )}
    </>
  );
};
