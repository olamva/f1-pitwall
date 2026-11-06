import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow, Period } from "../src/shared/timing.ts";
import {
  battles,
  choose,
  contenders,
  forecast,
  label,
  NEXT,
  passes,
} from "../src/web/live/battles.ts";
import type { Row } from "../src/web/live/view.ts";

const car = (position: number, interval: string): Row =>
  ({
    number: String(position),
    tla: `D${position}`,
    position,
    interval,
    status: "",
  }) as Row;

const grid = (...intervals: string[]) =>
  intervals.map((interval, i) => car(i + 1, interval));

const history = (gaps: number[], pit: Record<number, "in" | "out"> = {}) =>
  gaps.map((gap, i): LapRow => ({
    lap: i + 1,
    t: (i + 1) * 100,
    time: "",
    position: "",
    gap: `+${gap}`,
    sectors: [],
    compound: "",
    pit: pit[i + 1],
  }));

test("cars within 1 s of the car ahead form one train", () => {
  const rows = grid("", "+0.5", "+0.8", "+2.0", "+0.3", "+5.0", "+0.9");
  rows[5]!.status = "PIT";
  const groups = battles(rows);
  assert.deepEqual(groups.map(label), ["P1", "P4"]);
  assert.deepEqual(
    groups.map((g) => g.map((p) => p.chaser.number)),
    [["2", "3"], ["5"]],
  );
});

test("a long train shows 4 cars around the focused pair", () => {
  const [train] = battles(grid("", ...Array(7).fill("+0.5")));
  const shown = (focus: number) => {
    const { pairs, more } = contenders(train!, train![focus]!);
    return [pairs[0]!.ahead.position, pairs.at(-1)!.chaser.position, more];
  };
  assert.deepEqual(shown(0), [1, 4, 4]);
  assert.deepEqual(shown(3), [3, 6, 4]);
  assert.deepEqual(shown(6), [5, 8, 4]);
});

test("the shown battle follows selection, tap, favourite, then position", () => {
  const groups = battles(
    grid("", "+0.5", "+3.0", "+0.4", "+0.2", "+3.0", "+0.9"),
  );
  const next = {
    ahead: car(8, "+4.0"),
    chaser: car(9, "+2.0"),
    interval: 2,
    rate: 0.5,
    laps: 2,
  };
  const shown = (s?: string, t: string | null = null, f?: string) =>
    choose(groups, next, s, t, f)?.pair.chaser.number;
  assert.equal(shown(), "2");
  assert.equal(shown(undefined, "99", "7"), "7");
  assert.equal(shown(undefined, "4", "7"), "5");
  assert.equal(shown(undefined, NEXT, "7"), "9");
  assert.equal(shown("3", NEXT, "7"), "4");
  assert.equal(choose([], next, "3", null, "7")?.pair.chaser.number, "9");
});

const closing = {
  "1": history([0, 0, 0, 0, 0]),
  "2": history([5, 4.5, 4, 3.5, 3]),
};

test("a pair closing by 0.5 s per lap is forecast to battle in 4 laps", () => {
  const next = forecast(grid("", "+3.0"), closing, null, 500, 10);
  assert.equal(next?.chaser.number, "2");
  assert.equal(next?.rate, 0.5);
  assert.equal(next?.laps, 4);
});

test("laps under a safety car or in the pits do not count", () => {
  const sc: Period[] = [{ kind: "sc", from: 150, to: 250 }];
  assert.equal(forecast(grid("", "+3.0"), closing, sc, 500, 10), null);
  const pitted = { ...closing, "2": history([5, 4.5, 4, 3.5, 3], { 3: "in" }) };
  assert.equal(forecast(grid("", "+3.0"), pitted, null, 500, 10), null);
});

test("no forecast after the race ends, after 10 laps or for a slow close", () => {
  assert.equal(forecast(grid("", "+3.0"), closing, null, 500, 3), null);
  assert.equal(forecast(grid("", "+6.5"), closing, null, 500, 20), null);
  const slow = { ...closing, "2": history([1.86, 1.77, 1.68, 1.59, 1.5]) };
  assert.equal(forecast(grid("", "+1.5"), slow, null, 500, 20), null);
});

test("the pair that reaches 1 s soonest is the forecast", () => {
  const laps = { ...closing, "3": history([8, 7, 6, 5, 4]) };
  const next = forecast(grid("", "+3.0", "+1.5"), laps, null, 500, 10);
  assert.equal(next?.chaser.number, "3");
  assert.equal(next?.laps, 1);
});

test("a pass inside a battle is found and shown over the lead train", () => {
  const before = grid("", "+0.5", "+3.0", "+0.4", "+3.0", "+1.5");
  const after = [0, 1, 3, 2, 4, 5].map((from, i) => ({
    ...before[from]!,
    position: i + 1,
    interval: ["", "+0.5", "+3.0", "", "+3.0", "+0.2"][i]!,
  }));
  const [pass, ...rest] = passes(before, after);
  assert.equal(rest.length, 0);
  assert.deepEqual([pass!.ahead.number, pass!.chaser.number], ["4", "3"]);
  const groups = battles(after, pass!);
  assert.deepEqual(groups.map(label), ["P1", "P3", "P5"]);
  assert.equal(
    choose(groups, null, undefined, null, undefined, pass!)?.pair.chaser.number,
    "3",
  );
  assert.equal(
    choose(groups, null, undefined, null, "2", pass!)?.pair.chaser.number,
    "2",
  );
});

test("a swap from a gap over 1 s is not a battle pass", () => {
  const before = grid("", "+1.5");
  const after = [before[1]!, before[0]!].map((r, i) => ({
    ...r,
    position: i + 1,
    interval: i ? "+0.2" : "",
  }));
  assert.deepEqual(passes(before, after), []);
});
