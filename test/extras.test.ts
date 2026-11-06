import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { movers, pitStops, trapSpeeds } from "../src/web/live/extras.ts";
import type { Row } from "../src/web/live/view.ts";

const lap = (
  n: number,
  position: number,
  compound: string,
  pit?: "in" | "out",
): LapRow => ({
  lap: n,
  t: n * 100,
  time: "1:40.000",
  position: String(position),
  gap: "",
  sectors: [],
  compound,
  pit,
});

test("a pit stop shows the new tyres and the places lost", () => {
  const laps = {
    "4": [lap(1, 3, "SOFT"), lap(2, 3, "SOFT", "in"), lap(3, 6, "HARD", "out")],
    "1": [lap(1, 1, "MEDIUM", "in"), lap(2, 1, "HARD", "out")],
  };
  assert.deepEqual(pitStops(laps, 1000), [
    { number: "4", lap: 2, t: 200, from: "SOFT", to: "HARD", lost: 3 },
    { number: "1", lap: 1, t: 100, from: "MEDIUM", to: "HARD", lost: 0 },
  ]);
});

test("a stop shows no new tyres before the out lap ends", () => {
  const laps = { "4": [lap(2, 3, "SOFT", "in"), lap(3, 6, "HARD", "out")] };
  assert.deepEqual(pitStops(laps, 250)[0]!.to, "");
  assert.deepEqual(pitStops(laps, 150), []);
});

const row = (number: string, gained: number | null, status = ""): Row =>
  ({ number, gained, status }) as Row;

test("the biggest movers exclude retired cars and drivers without a change", () => {
  const { up, down } = movers([
    row("1", 2),
    row("2", 7),
    row("3", 0),
    row("4", -9, "OUT"),
    row("5", -1),
    row("6", null),
    row("7", 1),
    row("8", 4),
  ]);
  assert.deepEqual(
    up.map((r) => r.number),
    ["2", "8", "1"],
  );
  assert.deepEqual(
    down.map((r) => r.number),
    ["5"],
  );
});

test("the speed traps rank the drivers with a speed, fastest first", () => {
  const state = {
    TimingStats: {
      Lines: {
        "1": { BestSpeeds: { ST: { Value: "320" } } },
        "4": { BestSpeeds: { ST: { Value: "331" } } },
        "16": { BestSpeeds: { ST: { Value: "" } } },
      },
    },
  };
  const ranked = trapSpeeds(
    state,
    [row("1", 0), row("4", 0), row("16", 0)],
    "ST",
  );
  assert.deepEqual(
    ranked.map((s) => [s.row.number, s.speed]),
    [
      ["4", 331],
      ["1", 320],
    ],
  );
});
