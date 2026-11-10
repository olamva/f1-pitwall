import assert from "node:assert/strict";
import { test } from "node:test";
import type { DriverInfo, RaceArchive } from "../src/shared/season.ts";
import { archiveSeason } from "../src/web/stats/derive.ts";

type Result = RaceArchive["races"][number]["results"][number];

const result = (
  driver: string,
  number: string,
  grid: number,
  positionText: string,
  position: number,
): Result => ({
  driver,
  name: driver,
  code: driver.slice(0, 3).toUpperCase(),
  number,
  team: "mclaren",
  teamName: "McLaren",
  grid,
  position,
  positionText,
  points: 0,
  status: positionText === "R" ? "Retired" : "Finished",
  time: "",
});

const race = (round: number, results: Result[]) => ({
  round,
  name: `Round ${round}`,
  date: "2025-01-01",
  circuit: "circuit",
  track: "Track",
  country: "Country",
  results,
  sprint: [],
});

const current: DriverInfo = {
  id: "norris",
  code: "NOR",
  name: "Lando Norris",
  number: "1",
  team: "mclaren",
  reserve: false,
  headshot: "norris.png",
  art: "art/norris",
};

const archive: RaceArchive = {
  year: 2025,
  races: [
    race(2, [result("norris", "4", 1, "R", 20)]),
    race(1, [result("norris", "4", 2, "1", 1)]),
  ],
};

const season = archiveSeason(
  archive,
  {
    year: 2025,
    drivers: [
      {
        id: "norris",
        name: "Lando Norris",
        team: "mclaren",
        points: 423,
        wins: 7,
      },
    ],
    constructors: [],
  },
  new Map([["norris", current]]),
);

test("a past season keeps the number of that season", () => {
  assert.equal(season.drivers[0]?.number, "4");
  assert.equal(season.drivers[0]?.headshot, "norris.png");
});

test("a past season orders races by round and keeps retirements unclassified", () => {
  assert.deepEqual(
    season.races.map((r) => [r.round, r.results[0]?.position]),
    [
      [1, 1],
      [2, null],
    ],
  );
});

test("a past season counts a first grid slot as a pole", () => {
  assert.deepEqual(
    season.qualifying.map((q) => q.results.map((r) => r.driver)),
    [[], ["norris"]],
  );
});

test("a past season keeps the official standings", () => {
  assert.deepEqual(season.driverStandings, [{ id: "norris", points: 423 }]);
});
