import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { projectLaps } from "../src/web/live/knockout.ts";
import type { Row } from "../src/web/live/view.ts";

const car = (number: string, bestLap: string, ...sectors: string[]) =>
  ({
    number,
    bestLap,
    lastLap: "",
    status: "",
    sectors: [0, 1, 2].map((i) => ({ value: sectors[i] ?? "" })),
  }) as Row;

const pb = (time: string, ...sectors: string[]) =>
  ({ time, sectors }) as LapRow;

const pbs = {
  "1": pb("1:30.000", "30.000", "35.000", "25.000"),
  "2": pb("1:40.000", "33.000", "39.000", "28.000"),
  "3": pb("1:31.000", "30.500", "35.000", "25.500"),
  "4": pb("1:31.000", "30.500", "35.000", "25.500"),
};

const bests = {
  sectors: [],
  lap: { number: "1", value: "1:30.000" },
} as never;

test("a push lap projects the rest of the lap from the personal best, or from the session best when that is far faster", () => {
  const projected = projectLaps(
    [
      car("1", "1:30.000", "29.800"),
      car("2", "1:40.000", "30.100", "35.200"),
      car("3", "1:31.000", "40.000"),
      car("4", "1:31.000", "30.000", "35.000", "26.000"),
    ],
    pbs,
    bests,
  );
  assert.deepEqual(
    projected.map((r) => r.projected),
    [
      { value: "1:29.800", mark: "overall" },
      { value: "1:30.300", mark: "personal" },
      undefined,
      undefined,
    ],
  );
});

test("the live time of the selected car replaces its sector projection, except on the lap after a push lap", () => {
  const live = (lastLap: string) =>
    projectLaps([{ ...car("3", "1:31.000", "30.200"), lastLap }], pbs, bests, {
      number: "3",
      seconds: 90.5,
    })[0]!.projected;
  assert.deepEqual(live("1:58.000"), { value: "1:30.500", mark: "personal" });
  assert.deepEqual(live("1:31.000"), { value: "1:30.700", mark: "personal" });
});
