import assert from "node:assert/strict";
import { test } from "node:test";
import { raceArchive } from "../src/server/history.ts";
import { F1_ORIGIN } from "../src/server/origin.ts";

const BASE = "https://api.jolpi.ca/ergast/f1/2026";
const OPENF1 = "https://api.openf1.org/v1";
const race = (round: string, raceName: string, fp1: string) => ({
  round,
  raceName,
  date: "2026-10-25",
  time: "20:00:00Z",
  Circuit: { Location: { country: "USA" } },
  FirstPractice: { date: "2026-10-23", time: fp1 },
});
const singapore = race("17", "Singapore Grand Prix", "09:30:00Z");
const austin = race("18", "United States Grand Prix", "17:30:00Z");
const page = (Races: unknown[]) => ({
  MRData: { total: String(Races.length), RaceTable: { Races } },
});

const files: Record<string, unknown> = {
  [`${BASE}.json?limit=100`]: page([singapore, austin]),
  [`${BASE}/results.json?limit=100&offset=0`]: page([
    {
      ...singapore,
      Results: [
        {
          number: "16",
          grid: "1",
          position: "1",
          positionText: "1",
          points: "25",
          status: "Finished",
          Driver: {
            driverId: "leclerc",
            code: "LEC",
            givenName: "Charles",
            familyName: "Leclerc",
          },
          Constructor: { constructorId: "ferrari", name: "Ferrari" },
        },
      ],
    },
  ]),
  [`${BASE}/sprint.json?limit=100&offset=0`]: page([]),
  [`${BASE}/18.json`]: page([austin]),
  [`${F1_ORIGIN}/static/2026/Index.json`]: {
    Meetings: [
      {
        Name: "United States Grand Prix",
        Sessions: [
          {
            Name: "Race",
            StartDate: "2026-10-25T15:00:00",
            EndDate: "2026-10-25T17:00:00",
            GmtOffset: "-05:00:00",
            Path: "2026/austin/race/",
          },
        ],
      },
    ],
  },
  [`${F1_ORIGIN}/static/2026/austin/race/TimingAppData.json`]: {
    Lines: { "1": { GridPos: "2" }, "16": { GridPos: "1" } },
  },
  [`${OPENF1}/sessions?year=2026&session_type=Race`]: [
    {
      session_key: 7,
      session_name: "Race",
      date_start: "2026-10-25T20:00:00+00:00",
    },
  ],
  [`${OPENF1}/drivers?session_key=7`]: [
    { driver_number: 16, name_acronym: "LEC" },
    {
      driver_number: 1,
      name_acronym: "NOR",
      full_name: "Lando NORRIS",
      team_name: "McLaren",
    },
  ],
  [`${OPENF1}/session_result?session_key=7`]: [
    { position: 1, driver_number: 1, points: 25, number_of_laps: 56 },
    {
      position: null,
      driver_number: 16,
      points: 0,
      dnf: true,
      number_of_laps: 3,
    },
  ],
};

test("race archive lists a round once its first practice ends, before the round has results", async (t) => {
  let now = Date.parse("2026-10-23T18:00:00Z");
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const rounds = async () =>
    (await raceArchive(2026)).races.map((r) => [r.round, r.results.length]);

  assert.deepEqual(await rounds(), [[17, 1]]);
  now = Date.parse("2026-10-23T18:30:00Z");
  assert.deepEqual(await rounds(), [
    [18, 0],
    [17, 1],
  ]);
});

test("race archive fills a finished race from OpenF1 and the timing archive until Jolpica has its results", async (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-25T23:00:00Z"));
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const [austin] = (await raceArchive(2026)).races;

  assert.deepEqual(
    austin!.results.map((r) => [
      r.positionText,
      r.driver,
      r.name,
      r.team,
      r.teamName,
      r.grid,
      r.points,
      r.status,
    ]),
    [
      ["1", "nor", "Lando NORRIS", "", "McLaren", 2, 25, "Finished"],
      [
        "R",
        "leclerc",
        "Charles Leclerc",
        "ferrari",
        "Ferrari",
        1,
        0,
        "Retired",
      ],
    ],
  );
});
