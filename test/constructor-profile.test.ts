import assert from "node:assert/strict";
import { test } from "node:test";
import { constructorProfile } from "../src/server/history.ts";

const BASE = "https://api.jolpi.ca/ergast/f1/constructors/mclaren";
const car = (driverId: string, positionText: string, status = "Finished") => ({
  positionText,
  status,
  points: "0",
  Driver: { driverId, givenName: driverId, familyName: "" },
});
const race = (round: string, ...Results: ReturnType<typeof car>[]) => ({
  season: "1990",
  round,
  Results,
});
const page = (offset: number, ...Races: ReturnType<typeof race>[]) => ({
  [`${BASE}/results.json?limit=100&offset=${offset}`]: {
    MRData: { total: "101", RaceTable: { Races } },
  },
});

const files: Record<string, unknown> = {
  [`${BASE}.json`]: {
    MRData: { ConstructorTable: { Constructors: [{ name: "McLaren" }] } },
  },
  ...page(0, race("1", car("senna", "1")), race("2", car("senna", "R"))),
  ...page(
    100,
    race("2", car("berger", "2")),
    race("3", car("berger", "W", "Withdrew")),
  ),
  [`${BASE}/sprint.json?limit=100&offset=0`]: {
    MRData: { total: "0", RaceTable: { Races: [] } },
  },
};

test("a race split across result pages counts as one start", async (t) => {
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const profile = await constructorProfile("mclaren");

  assert.deepEqual(
    [profile?.starts, profile?.seasons[0]?.starts, profile?.drivers],
    [2, 2, 2],
  );
});
