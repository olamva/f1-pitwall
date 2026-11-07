import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { projectLaps } from "../src/web/live/knockout.ts";
import type { Row } from "../src/web/live/view.ts";

const car = (number: string, bestLap: string, ...sectors: string[]) =>
  ({
    number,
    bestLap,
    status: "",
    sectors: [0, 1, 2].map((i) => ({ value: sectors[i] ?? "" })),
  }) as Row;

const pb = (time: string, ...sectors: string[]) =>
  ({ time, sectors }) as LapRow;

test("a push lap projects the rest of the lap from the personal best, or from the session best when that is far faster", () => {
  const projected = projectLaps(
    [
      car("1", "1:30.000", "29.800"),
      car("2", "1:40.000", "30.100", "35.200"),
      car("3", "1:31.000", "40.000"),
      car("4", "1:31.000", "30.000", "35.000", "26.000"),
    ],
    {
      "1": pb("1:30.000", "30.000", "35.000", "25.000"),
      "2": pb("1:40.000", "33.000", "39.000", "28.000"),
      "3": pb("1:31.000", "30.500", "35.000", "25.500"),
      "4": pb("1:31.000", "30.500", "35.000", "25.500"),
    },
    { sectors: [], lap: { number: "1", value: "1:30.000" } } as never,
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
