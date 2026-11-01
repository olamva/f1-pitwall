import assert from "node:assert/strict";
import { test } from "node:test";
import { standings } from "../src/server/history.ts";

const JOLPICA = "https://api.jolpi.ca/ergast/f1/2026";
const OPENF1 = "https://api.openf1.org/v1";
const MEXICO = "session_key=11404";
const lists = (key: string, rows: unknown[]) => ({
  MRData: { StandingsTable: { StandingsLists: [{ [key]: rows }] } },
});
const driver = (driverId: string, code: string, team: string) => ({
  Driver: { driverId, code, givenName: code, familyName: code },
  Constructors: [{ constructorId: team }],
});
const team = (constructorId: string, name: string) => ({
  Constructor: { constructorId, name },
});

const files: Record<string, unknown> = {
  [`${JOLPICA}/driverstandings.json?limit=100`]: lists("DriverStandings", [
    { ...driver("antonelli", "ANT", "mercedes"), points: "365", wins: "9" },
    { ...driver("russell", "RUS", "mercedes"), points: "242", wins: "3" },
    {
      ...driver("max_verstappen", "VER", "red_bull"),
      points: "236",
      wins: "2",
    },
  ]),
  [`${JOLPICA}/constructorstandings.json?limit=100`]: lists(
    "ConstructorStandings",
    [
      { ...team("mercedes", "Mercedes"), points: "607", wins: "12" },
      { ...team("red_bull", "Red Bull"), points: "355", wins: "2" },
    ],
  ),
  [`${JOLPICA}/last/results.json?limit=1`]: {
    MRData: {
      RaceTable: { Races: [{ date: "2026-10-25", time: "20:00:00Z" }] },
    },
  },
  [`${OPENF1}/sessions?year=2026&session_type=Race`]: [
    {
      session_key: 11404,
      session_name: "Race",
      date_start: "2026-11-01T20:00:00+00:00",
      date_end: "2026-11-01T23:00:00+00:00",
    },
  ],
  [`${OPENF1}/drivers?${MEXICO}`]: [
    { driver_number: 12, name_acronym: "ANT", team_name: "Mercedes" },
    { driver_number: 63, name_acronym: "RUS", team_name: "Mercedes" },
    { driver_number: 3, name_acronym: "VER", team_name: "Red Bull Racing" },
  ],
  [`${OPENF1}/championship_drivers?${MEXICO}`]: [
    { driver_number: 12, position_current: 1, points_current: 380 },
    { driver_number: 3, position_current: 2, points_current: 261 },
    { driver_number: 63, position_current: 3, points_current: 250 },
  ],
  [`${OPENF1}/championship_teams?${MEXICO}`]: [
    { team_name: "Mercedes", position_current: 1, points_current: 630 },
    { team_name: "Red Bull Racing", position_current: 2, points_current: 380 },
  ],
  [`${OPENF1}/session_result?${MEXICO}&position=1`]: [{ driver_number: 3 }],
};

test("standings take OpenF1 totals once a race that Jolpica lacks has ended", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-11-01T22:00:00Z"),
  });
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const table = async () => {
    const s = await standings(2026);
    return [...s.drivers, ...s.constructors].map(
      (r) => `${r.id} ${r.points} ${r.wins}`,
    );
  };

  assert.deepEqual(await table(), [
    "antonelli 365 9",
    "russell 242 3",
    "max_verstappen 236 2",
    "mercedes 607 12",
    "red_bull 355 2",
  ]);
  t.mock.timers.setTime(Date.parse("2026-11-01T23:30:00Z"));
  assert.deepEqual(await table(), [
    "antonelli 380 9",
    "max_verstappen 261 3",
    "russell 250 3",
    "mercedes 630 12",
    "red_bull 380 3",
  ]);
});
