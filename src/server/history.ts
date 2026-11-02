import {
  SESSION_MS,
  type DriverProfile,
  type Fact,
  type RaceArchive,
  type SeasonStandings,
} from "../shared/season.ts";
import champions from "./champions.json" with { type: "json" };
import { all, get, total } from "./jolpica.ts";
import { pendingRace, portraits, provisional } from "./openf1.ts";
import { seconds, when } from "./season.ts";

const DAY = 24 * 60 * 60_000;
const NON_START = new Set([
  "Did not start",
  "Did not qualify",
  "Did not prequalify",
  "Withdrew",
]);

type Result = RaceArchive["races"][number]["results"][number];

const result = (row: any): Result => ({
  driver: row.Driver.driverId,
  name: `${row.Driver.givenName} ${row.Driver.familyName}`,
  code: row.Driver.code ?? "",
  number: row.number ?? row.Driver.permanentNumber ?? "",
  team: row.Constructor?.constructorId ?? "",
  teamName: row.Constructor?.name ?? "",
  grid: Number(row.grid ?? 0),
  position: Number(row.position),
  positionText: row.positionText,
  points: Number(row.points),
  status: row.status ?? "",
});

export async function raceArchive(year: number): Promise<RaceArchive> {
  const freshMs = year === new Date().getUTCFullYear() ? undefined : DAY;
  const [schedule, rows, sprintRows] = await Promise.all([
    get(`${year}.json?limit=100`, freshMs),
    all<any>(`${year}/results.json`, (data) => data.RaceTable.Races, freshMs),
    all<any>(`${year}/sprint.json`, (data) => data.RaceTable.Races, freshMs),
  ]);
  const races = new Map<number, RaceArchive["races"][number]>();
  const entry = (race: any) => {
    const round = Number(race.round);
    if (!races.has(round))
      races.set(round, {
        round,
        name: race.raceName,
        date: race.date,
        country: race.Circuit.Location.country,
        results: [],
        sprint: [],
      });
    return races.get(round)!;
  };
  for (const race of schedule.RaceTable.Races)
    if (
      Date.parse(when(race.FirstPractice ?? race)!) + SESSION_MS <=
      Date.now()
    )
      entry(race);
  if (!freshMs)
    rows.push(
      ...(await pendingRace(year, schedule.RaceTable.Races, rows).catch(
        () => [],
      )),
    );
  for (const race of rows)
    entry(race).results.push(...race.Results.map(result));
  for (const race of sprintRows)
    entry(race).sprint.push(...race.SprintResults.map(result));
  const byPosition = (a: Result, b: Result) => a.position - b.position;
  return {
    year,
    races: [...races.values()]
      .map((race) => ({
        ...race,
        results: race.results.sort(byPosition),
        sprint: race.sprint.sort(byPosition),
      }))
      .sort((a, b) => b.round - a.round),
  };
}

export async function standings(year: number): Promise<SeasonStandings> {
  const current = year === new Date().getUTCFullYear();
  const freshMs = current ? undefined : DAY;
  const [drivers, constructors, last] = await Promise.all([
    get(`${year}/driverstandings.json?limit=100`, freshMs),
    get(`${year}/constructorstandings.json?limit=100`, freshMs),
    current ? get(`${year}/last/results.json?limit=1`) : null,
  ]);
  const rows = (data: any, key: string): any[] =>
    data.StandingsTable.StandingsLists[0]?.[key] ?? [];
  const driverRows = rows(drivers, "DriverStandings");
  const table: SeasonStandings = {
    year,
    drivers: driverRows.map((row) => ({
      id: row.Driver.driverId,
      name: `${row.Driver.givenName} ${row.Driver.familyName}`,
      team: row.Constructors.at(-1)?.constructorId ?? "",
      points: Number(row.points),
      wins: Number(row.wins),
    })),
    constructors: rows(constructors, "ConstructorStandings").map((row) => ({
      id: row.Constructor.constructorId,
      name: row.Constructor.name,
      team: row.Constructor.constructorId,
      points: Number(row.points),
      wins: Number(row.wins),
    })),
  };
  if (!current) return table;
  const race = last.RaceTable.Races[0];
  return provisional(
    table,
    new Map(driverRows.map((row) => [row.Driver.code, row.Driver.driverId])),
    race ? Date.parse(when(race)!) : 0,
  ).catch(() => table);
}

const wiki = new Map<string, Promise<string | null>>();

const wikiPortrait = (url: string) => {
  const hit =
    wiki.get(url) ??
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${url.split("/wiki/")[1]}`,
      { headers: { "User-Agent": "f1.ola-vassbotn.no" } },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((page) => page.thumbnail?.source ?? null)
      .catch(() => (wiki.delete(url), null));
  wiki.set(url, hit);
  return hit;
};

export async function driverProfile(id: string): Promise<DriverProfile | null> {
  const [driver, races, sprints, poles] = await Promise.all([
    get(`drivers/${id}.json`, DAY),
    all<any>(`drivers/${id}/results.json`, (data) => data.RaceTable.Races, DAY),
    all<any>(`drivers/${id}/sprint.json`, (data) => data.RaceTable.Races, DAY),
    total(`drivers/${id}/qualifying/1.json`, DAY),
  ]);
  const info = driver.DriverTable.Drivers[0];
  if (!info) return null;
  const started = races.filter((race) =>
    race.Results.some((result: any) => !NON_START.has(result.status)),
  );
  const podium = (result: any) => ["1", "2", "3"].includes(result.positionText);
  const years = [...new Set(races.map((race) => Number(race.season)))];
  const seasons = years
    .sort((a, b) => b - a)
    .map((year) => {
      const inYear = (race: any) => Number(race.season) === year;
      const results = races.filter(inYear).flatMap((race) => race.Results);
      const team = results.at(-1)?.Constructor;
      return {
        year,
        team: team?.constructorId ?? "",
        teamName: team?.name ?? "",
        starts: started.filter(inYear).length,
        wins: results.filter((result) => result.positionText === "1").length,
        podiums: results.filter(podium).length,
        points: [
          ...results,
          ...sprints.filter(inYear).flatMap((race) => race.SprintResults),
        ].reduce((sum, result) => sum + Number(result.points), 0),
      };
    });
  const listed = Object.entries(champions);
  const recent = await Promise.all(
    years
      .filter(
        (year) =>
          year > Number(listed.at(-1)![0]) &&
          year < new Date().getUTCFullYear(),
      )
      .map(async (year) => {
        const data = await get(`${year}/driverstandings/1.json`, DAY);
        return data.StandingsTable.StandingsLists[0]?.DriverStandings[0]?.Driver
          .driverId === id
          ? [year]
          : [];
      }),
  );
  const url = info.url?.startsWith("http")
    ? info.url.replace(/^http:/, "https:")
    : null;
  const last = seasons[0]?.year ?? 0;
  return {
    id,
    name: `${info.givenName} ${info.familyName}`,
    nationality: info.nationality ?? null,
    dateOfBirth: info.dateOfBirth ?? null,
    number: info.permanentNumber ?? null,
    url,
    portrait:
      (last >= 2023 && (await portraits(last)).get(info.code)) ||
      (url && (await wikiPortrait(url))),
    firstSeason: seasons.at(-1)?.year ?? null,
    lastSeason: seasons[0]?.year ?? null,
    starts: started.length,
    wins: seasons.reduce((sum, season) => sum + season.wins, 0),
    podiums: seasons.reduce((sum, season) => sum + season.podiums, 0),
    poles: (seasons.at(-1)?.year ?? 0) < 1994 ? null : poles,
    championships: [
      ...listed
        .filter(([, champion]) => champion === id)
        .map(([year]) => Number(year)),
      ...recent.flat(),
    ].sort((a, b) => a - b),
    seasons,
  };
}

const driver = (race: any) =>
  `${race.Results[0].Driver.givenName} ${race.Results[0].Driver.familyName}`;
const grid = (race: any) => Number(race.Results[0].grid);
const lap = (race: any) => race.Results[0].FastestLap?.Time.time;
const list = new Intl.ListFormat("en");

const most = (label: string, races: any[], key = driver) => {
  const counts = [...Map.groupBy(races, key)];
  const top = Math.max(0, ...counts.map(([, group]) => group.length));
  const leaders = counts.filter(([, group]) => group.length === top);
  return top > 1
    ? `Most ${label} here: ${list.format(leaders.map(([name]) => name))} (${top})`
    : null;
};

const fact = (
  text: string | false | null | undefined,
  ...sessions: Fact["sessions"]
): Fact[] => (text ? [{ text, sessions }] : []);

export async function circuitFacts(
  circuit: string,
  year: number,
): Promise<Fact[]> {
  const past = (data: any): any[] =>
    data.RaceTable.Races.filter((race: any) => Number(race.season) < year);
  const [wins, poles, laps] = await Promise.all(
    ["results/1", "grid/1/results", "fastest/1/results"].map((path) =>
      all(`circuits/${circuit}/${path}.json`, past, DAY),
    ),
  );
  const back = wins
    .filter((race) => grid(race) > 0)
    .toSorted((a, b) => grid(b) - grid(a))[0];
  const fastest = laps
    .filter(lap)
    .toSorted((a, b) => seconds(lap(a)) - seconds(lap(b)))[0];
  const since = Number(wins[0]?.season) < 2004 ? " since 2004" : "";
  return [
    ...fact(most("wins", wins), "race"),
    ...fact(most("poles", poles), "qualifying"),
    ...fact(
      wins.length > 0 &&
        `Pole sitter won ${wins.filter((race) => grid(race) === 1).length} of ${wins.length} races here`,
      "qualifying",
      "race",
    ),
    ...fact(
      most(
        "wins from outside pole",
        wins.filter((race) => grid(race) > 1),
        (race) => `P${grid(race)}`,
      ),
      "qualifying",
      "race",
    ),
    ...fact(
      back &&
        `Furthest back to win here: ${driver(back)} from P${grid(back)} (${back.season})`,
      "race",
    ),
    ...fact(
      fastest &&
        `Fastest race lap here${since}: ${lap(fastest)} by ${driver(fastest)} (${fastest.season})`,
      "race",
    ),
  ];
}
