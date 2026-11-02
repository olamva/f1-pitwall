import {
  SESSION_MS,
  type SeasonStandings,
  type StandingRow,
} from "../shared/season.ts";
import { startingGrid } from "./archive.ts";
import { when } from "./season.ts";

const BASE = "https://api.openf1.org/v1/";
const FRESH_MS = 10 * 60_000;
const SPACING_MS = 400;

const cache = new Map<string, { at: number; body: Promise<any> }>();
let queue: Promise<unknown> = Promise.resolve();

function get(path: string): Promise<any> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;
  const body = queue
    .then(() =>
      fetch(BASE + path, { headers: { "User-Agent": "f1.ola-vassbotn.no" } }),
    )
    .then((res) => {
      if (!res.ok) throw new Error(`openf1 ${res.status} ${path}`);
      return res.json();
    });
  queue = body
    .catch(() => cache.delete(path))
    .then(() => new Promise((r) => setTimeout(r, SPACING_MS)));
  cache.set(path, { at: Date.now(), body });
  return body;
}

const update = (
  rows: StandingRow[],
  next: Map<unknown, any>,
  winner: unknown,
) =>
  rows
    .map((row) => {
      const total = next.get(row.id);
      return total
        ? {
            ...row,
            points: total.points_current,
            wins: row.wins + Number(row.id === winner),
          }
        : row;
    })
    .sort(
      (a, b) =>
        (next.get(a.id)?.position_current ?? Infinity) -
        (next.get(b.id)?.position_current ?? Infinity),
    );

export async function provisional(
  table: SeasonStandings,
  codes: Map<string, string>,
  after: number,
): Promise<SeasonStandings> {
  const sessions: any[] = await get(
    `sessions?year=${table.year}&session_type=Race`,
  );
  const session = sessions
    .filter((s) => !s.is_cancelled && Date.parse(s.date_end) < Date.now())
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))
    .at(-1);
  if (!session || Date.parse(session.date_start) <= after) return table;
  const key = `session_key=${session.session_key}`;
  const entrants: any[] = await get(`drivers?${key}`);
  const drivers: any[] = await get(`championship_drivers?${key}`);
  const teams: any[] = await get(`championship_teams?${key}`);
  const [first] =
    session.session_name === "Race"
      ? await get(`session_result?${key}&position=1`)
      : [];
  const id = new Map(
    entrants.map((e) => [e.driver_number, codes.get(e.name_acronym)]),
  );
  const team = (driver: unknown) =>
    table.drivers.find((d) => d.id === driver)?.team;
  const teamId = new Map(
    entrants.map((e) => [e.team_name, team(id.get(e.driver_number))]),
  );
  const winner = id.get(first?.driver_number);
  return {
    ...table,
    drivers: update(
      table.drivers,
      new Map(drivers.map((d) => [id.get(d.driver_number), d])),
      winner,
    ),
    constructors: update(
      table.constructors,
      new Map(teams.map((t) => [teamId.get(t.team_name), t])),
      winner && team(winner),
    ),
  };
}

const outcome = (row: any, laps: number): [string, string] =>
  row.dsq
    ? ["D", "Disqualified"]
    : row.dns
      ? ["W", "Did not start"]
      : row.dnf
        ? ["R", "Retired"]
        : row.number_of_laps < laps
          ? ["R", "Lapped"]
          : ["R", "Finished"];

export async function pendingRace(
  year: number,
  calendar: any[],
  rows: any[],
): Promise<any[]> {
  const race = calendar.findLast(
    (r) => Date.parse(when(r)!) + SESSION_MS <= Date.now(),
  );
  if (!race || rows.some((r) => r.round === race.round)) return [];
  const sessions: any[] = await get(`sessions?year=${year}&session_type=Race`);
  const session = sessions.find(
    (s) =>
      s.session_name === "Race" &&
      Math.abs(Date.parse(s.date_start) - Date.parse(when(race)!)) <
        60 * 60_000,
  );
  if (!session) return [];
  const key = `session_key=${session.session_key}`;
  const entrants: any[] = await get(`drivers?${key}`);
  const results: any[] = await get(`session_result?${key}`);
  const grid = await startingGrid(year, Number(race.round)).catch(
    () => new Map<string, number>(),
  );
  const known = new Map(
    rows.flatMap((r) => r.Results).map((r: any) => [r.Driver.code, r]),
  );
  const entrant = new Map(entrants.map((e) => [e.driver_number, e]));
  return [
    {
      ...race,
      Results: results.map((row, i) => {
        const e = entrant.get(row.driver_number);
        const before = known.get(e?.name_acronym);
        return {
          Driver: before?.Driver ?? {
            driverId: e?.name_acronym?.toLowerCase() ?? "",
            code: e?.name_acronym ?? "",
            givenName: e?.first_name ?? "",
            familyName: e?.last_name ?? "",
          },
          Constructor: before?.Constructor ?? {
            constructorId: "",
            name: e?.team_name ?? "",
          },
          number: String(row.driver_number),
          grid: String(grid.get(String(row.driver_number)) ?? 0),
          position: String(row.position ?? i + 1),
          positionText: row.position
            ? String(row.position)
            : outcome(row, 0)[0],
          points: String(row.points),
          status: outcome(row, results[0].number_of_laps)[1],
        };
      }),
    },
  ];
}
