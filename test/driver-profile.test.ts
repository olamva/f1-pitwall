import assert from "node:assert/strict";
import { test } from "node:test";
import { driverProfile } from "../src/server/history.ts";

const BASE = "https://api.jolpi.ca/ergast/f1/drivers/senna";
const race = (season: string, positionText: string, status: string) => ({
  season,
  Results: [
    {
      positionText,
      status,
      points: "0",
      Constructor: { constructorId: "mclaren", name: "McLaren" },
    },
  ],
});

const files: Record<string, unknown> = {
  [`${BASE}.json`]: {
    MRData: {
      DriverTable: {
        Drivers: [{ givenName: "Ayrton", familyName: "Senna" }],
      },
    },
  },
  [`${BASE}/results.json?limit=100&offset=0`]: {
    MRData: {
      total: "4",
      RaceTable: {
        Races: [
          race("1990", "1", "Finished"),
          race("1990", "R", "Retired"),
          race("1991", "4", "Finished"),
          race("1991", "D", "Disqualified"),
        ],
      },
    },
  },
  [`${BASE}/sprint.json?limit=100&offset=0`]: {
    MRData: { total: "0", RaceTable: { Races: [] } },
  },
  [`${BASE}/qualifying/1.json?limit=1`]: { MRData: { total: "0" } },
};

test("average finish counts only classified race finishes", async (t) => {
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const profile = await driverProfile("senna");

  assert.deepEqual(
    [
      profile?.averageFinish,
      ...profile!.seasons.map((s) => `${s.year} ${s.averageFinish}`),
    ],
    [2.5, "1991 4", "1990 1"],
  );
});
